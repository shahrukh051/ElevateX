import asyncio
import logging
from datetime import datetime, timezone
from uuid import uuid4

from config import TRAFFIC_DELAY_THRESHOLD
from models.solution import ExplanationEvent, RouteAssignment, Solution
from models.messages import SolutionUpdateMessage
from models.stop import Stop
from services import maps_client, solver
from state.world_state import LegState, world_state

logger = logging.getLogger("last_mile.trigger")
_solve_lock = asyncio.Lock()


def decide_trigger(event: dict, state=world_state) -> tuple[bool, str]:
    """Pure trigger policy: mutation has already been applied to state."""
    kind = event["type"]
    if kind == "trigger_breakdown":
        vehicle_id = event["vehicleId"]
        before = event.get("remaining_stop_count", 0)
        return True, f"{vehicle_id} marked unavailable with {before} remaining stop(s); fleet reassignment triggered."
    if kind == "trigger_new_order":
        return True, "A new priority order changes the assignment problem."
    if kind == "trigger_traffic_delay":
        multiplier = float(event.get("multiplier", 1.0))
        return True, f"Delay multiplier of {multiplier:.1f}x applied on segment {event.get('segmentFrom')} → {event.get('segmentTo')}."
    if kind == "trigger_window_change":
        stop_id = event["stopId"]
        return True, f"Delivery window updated for stop {stop_id}; route schedule re-evaluated."
    return False, "Unknown event type; no re-solve performed."


def _segment_in_active_route(a: str, b: str, state) -> bool:
    if not state.solution:
        return False
    for route in state.solution.routes:
        vehicle = state.vehicles.get(route.vehicle_id)
        if not vehicle or vehicle.status != "active":
            continue
        sequence = [route.vehicle_id, *route.stop_ids]
        if any((left == a and right == b) or (left == b and right == a) for left, right in zip(sequence, sequence[1:])):
            return True
    return False


def _assigned_vehicle(stop_id: str, solution: Solution | None) -> str | None:
    if solution:
        for route in solution.routes:
            if stop_id in route.stop_ids:
                return route.vehicle_id
    return None


def _route_infeasible(vehicle_id: str, state) -> bool:
    if not state.solution:
        return False
    route = next((r for r in state.solution.routes if r.vehicle_id == vehicle_id), None)
    vehicle = state.vehicles.get(vehicle_id)
    if not route or not vehicle:
        return False
    now = datetime.now(timezone.utc)
    elapsed = 0.0
    previous = vehicle_id
    for stop_id in route.stop_ids:
        stop = state.stops.get(stop_id)
        if not stop:
            continue
        elapsed += state.travel_times.get((previous, stop_id), 0.0)
        arrival = now.timestamp() + elapsed
        if arrival > stop.time_window_end.timestamp():
            return True
        elapsed = max(elapsed, stop.time_window_start.timestamp() - now.timestamp())
        previous = stop_id
    return False


async def process_event(event: dict, broadcast) -> None:
    """Serialize event mutation and solving so shared state is never solved concurrently."""
    async with _solve_lock:
        if not world_state.initialized:
            logger.warning("event ignored: world state is not initialized")
            return
        old_solution = world_state.solution.model_copy(deep=True) if world_state.solution else Solution(routes=[], timestamp=datetime.now(timezone.utc))
        remaining_before = 0
        kind = event.get("type")
        if kind == "trigger_breakdown":
            vehicle_id = event["vehicleId"]
            old_route = next((r for r in old_solution.routes if r.vehicle_id == vehicle_id), None)
            remaining_before = len(old_route.stop_ids) if old_route else 0
            event["remaining_stop_count"] = remaining_before
            if vehicle_id in world_state.vehicles:
                world_state.vehicles[vehicle_id].status = "unavailable"
        elif kind == "trigger_new_order":
            raw_stop = event.get("stop", {})
            # Guard: lat/lng must be valid floats before we touch Pydantic
            try:
                raw_stop["lat"] = float(raw_stop["lat"])
                raw_stop["lng"] = float(raw_stop["lng"])
            except (TypeError, ValueError, KeyError):
                logger.warning("trigger_new_order ignored: lat/lng missing or invalid in payload %s", raw_stop)
                return
            incoming = {**raw_stop, "priority": raw_stop.get("priority", "high")}
            stop = Stop(id=f"P-{uuid4().hex[:4].upper()}", **incoming)
            world_state.stops[stop.id] = stop
            event["stopId"] = stop.id
            await _refresh_matrix(stop.id)
        elif kind == "trigger_traffic_delay":
            a, b, multiplier = event["segmentFrom"], event["segmentTo"], float(event["multiplier"])
            for key in ((a, b), (b, a)):
                if key in world_state.travel_times:
                    world_state.travel_times[key] *= multiplier
        elif kind == "trigger_window_change":
            stop = world_state.stops.get(event["stopId"])
            if stop:
                stop.time_window_start = datetime.fromisoformat(event["newStart"].replace("Z", "+00:00"))
                stop.time_window_end = datetime.fromisoformat(event["newEnd"].replace("Z", "+00:00"))

        should_solve, reason = decide_trigger(event)
        logger.info("event=%s decision=%s reason=%s", kind, "re-solve" if should_solve else "ignore", reason)
        if not should_solve:
            from services.simulator import initial_state_payload
            await broadcast(initial_state_payload())
            return

        matrix, node_ids = _active_matrix()
        previous_routes = {route.vehicle_id: route.stop_ids[:] for route in old_solution.routes}
        next_solution = solver.warm_start_solve(list(world_state.stops.values()), list(world_state.vehicles.values()), matrix, old_solution)
        await _attach_polylines(next_solution)
        churn = _churn(previous_routes, next_solution)
        logger.info("warm-start churn=%d stop assignment(s) changed, total stops=%d", churn, len(world_state.stops))
        explanation = ExplanationEvent(
            id=uuid4().hex,
            message=_explain(event, old_solution, next_solution),
            timestamp=datetime.now(timezone.utc),
            triggeringEventType={
                "trigger_breakdown": "breakdown", "trigger_new_order": "new_order",
                "trigger_traffic_delay": "traffic_delay", "trigger_window_change": "window_change",
            }[kind],
        )
        world_state.solution = next_solution
        _reset_changed_legs(old_solution, next_solution, node_ids)
        update = SolutionUpdateMessage(
            solution=next_solution,
            explanation=explanation,
            vehicles=list(world_state.vehicles.values()),
            stops=list(world_state.stops.values()),
        )
        await broadcast(update.model_dump(mode="json", by_alias=True))


async def _refresh_matrix(new_stop_id: str) -> None:
    vehicles = list(world_state.vehicles.values())
    stops = list(world_state.stops.values())
    ids = [v.id for v in vehicles] + [s.id for s in stops]
    new_index = ids.index(new_stop_id)
    points = [(v.current_lat, v.current_lng) for v in vehicles] + [(s.lat, s.lng) for s in stops]
    if len(points) <= 20:
        values = await maps_client.get_route_matrix(points)
        for index, node_id in enumerate(ids):
            world_state.travel_times[(new_stop_id, node_id)] = values[new_index][index]
            world_state.travel_times[(node_id, new_stop_id)] = values[index][new_index]
        return
    target = points[new_index]
    for index, node_id in enumerate(ids):
        estimate = maps_client.estimate_travel_seconds(target, points[index])
        world_state.travel_times[(new_stop_id, node_id)] = estimate
        world_state.travel_times[(node_id, new_stop_id)] = estimate


def _active_matrix() -> tuple[list[list[float]], list[str]]:
    vehicle_ids = [v.id for v in world_state.vehicles.values() if v.status == "active"]
    stop_ids = list(world_state.stops)
    ids = [*vehicle_ids, *stop_ids]
    return [[world_state.travel_times.get((a, b), 0.0) for b in ids] for a in ids], ids


async def _attach_polylines(solution: Solution) -> None:
    for route in solution.routes:
        vehicle = world_state.vehicles[route.vehicle_id]
        points = [(vehicle.current_lat, vehicle.current_lng)]
        points.extend((world_state.stops[sid].lat, world_state.stops[sid].lng) for sid in route.stop_ids if sid in world_state.stops)
        if len(points) == 1:
            route.polyline = maps_client.encode_polyline(points)
        else:
            route.polyline = await maps_client.get_route_polyline(points[0], points[-1], points[1:-1])


def _reset_changed_legs(old: Solution, new: Solution, node_ids: list[str]) -> None:
    old_map = {route.vehicle_id: route for route in old.routes}
    for route in new.routes:
        before = old_map.get(route.vehicle_id)
        if before and before.stop_ids == route.stop_ids:
            continue
        if not route.stop_ids:
            world_state.legs.pop(route.vehicle_id, None)
            continue
        vehicle = world_state.vehicles[route.vehicle_id]
        target = world_state.stops[route.stop_ids[0]]
        duration = max(4.0, min(world_state.travel_times.get((route.vehicle_id, target.id), 25.0) * 0.15, 12.0))
        world_state.legs[route.vehicle_id] = LegState(
            points=[(vehicle.current_lat, vehicle.current_lng), (target.lat, target.lng)], start_time=datetime.now(timezone.utc),
            duration_seconds=duration, target_stop_id=target.id,
        )


def _churn(old: dict[str, list[str]], new: Solution) -> int:
    old_owner = {stop_id: vehicle_id for vehicle_id, stops in old.items() for stop_id in stops}
    new_owner = {stop_id: route.vehicle_id for route in new.routes for stop_id in route.stop_ids}
    return sum(old_owner.get(stop_id) != new_owner.get(stop_id) for stop_id in old_owner.keys() | new_owner.keys())


def _explain(event: dict, old: Solution, new: Solution) -> str:
    old_owner = {sid: route.vehicle_id for route in old.routes for sid in route.stop_ids}
    new_owner = {sid: route.vehicle_id for route in new.routes for sid in route.stop_ids}
    unassigned = [sid for sid in new.unassigned_stop_ids if sid not in old.unassigned_stop_ids]
    if event["type"] == "trigger_breakdown":
        vehicle_id = event["vehicleId"]
        moved = [sid for sid, owner in old_owner.items() if owner == vehicle_id and new_owner.get(sid) != vehicle_id]
        details = ", ".join(f"{sid} to {new_owner[sid]}" for sid in moved if sid in new_owner)
        if unassigned:
            details = "; ".join(filter(None, [details, ", ".join(f"{sid} could not be reassigned" for sid in unassigned)]))
        if not details:
            details = "no stops required reassignment"
        message = f"{vehicle_id} broke down. Its {len(moved)} remaining stop(s) were reassigned: {details}."
    elif event["type"] == "trigger_new_order":
        sid = event.get("stopId", "new stop")
        message = f"New priority stop {sid} was added and assigned to {new_owner[sid]}." if sid in new_owner else f"New priority stop {sid} could not be assigned — flagged for manual dispatch."
    elif event["type"] == "trigger_traffic_delay":
        a, b = event["segmentFrom"], event["segmentTo"]
        changed = sum(1 for route in new.routes if old_owner and route.stop_ids != next((r.stop_ids for r in old.routes if r.vehicle_id == route.vehicle_id), []))
        message = f"Heavy delay detected on {a} → {b}. {changed} route(s) were adjusted to avoid it."
    else:
        sid = event["stopId"]
        old_vehicle, new_vehicle = old_owner.get(sid, "its current vehicle"), new_owner.get(sid)
        if sid in unassigned:
            message = f"{sid}'s delivery window changed, making {old_vehicle}'s route infeasible. Stop {sid} could not be reassigned — flagged for manual dispatch."
        elif new_vehicle and new_vehicle != old_vehicle:
            message = f"{sid}'s delivery window changed, making {old_vehicle}'s route infeasible. Stop was reassigned to {new_vehicle}."
        else:
            message = f"{sid}'s delivery window changed. The assignment was re-optimized and remains with {new_vehicle or old_vehicle}."
    if unassigned and event["type"] != "trigger_new_order" and "could not be reassigned" not in message:
        message += " " + " ".join(f"Stop {sid} could not be reassigned — flagged for manual dispatch." for sid in unassigned)
    return message
