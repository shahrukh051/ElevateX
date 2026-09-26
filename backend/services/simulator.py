import asyncio
import logging
from datetime import datetime, timedelta, timezone

from models.solution import Solution
from models.messages import InitialStateMessage, VehiclePositionMessage
from models.stop import Stop
from models.vehicle import Vehicle
from services import maps_client, solver
from services.trigger_engine import _attach_polylines, _reset_changed_legs
from state.world_state import LegState, world_state

logger = logging.getLogger("last_mile.simulator")

SEED_STOPS = [
    (12.9717, 77.5940), (12.9820, 77.6025), (12.9655, 77.6070), (12.9568, 77.5841),
    (12.9783, 77.6180), (12.9890, 77.5790), (12.9495, 77.6002), (12.9682, 77.5725),
    (12.9930, 77.5952), (12.9605, 77.6210), (12.9457, 77.5830), (12.9853, 77.5880),
    (12.9734, 77.6300), (12.9532, 77.6100), (12.9970, 77.6105), (12.9400, 77.5940),
]


async def initialize_world() -> None:
    if world_state.initialized:
        return
    now = datetime.now(timezone.utc)
    world_state.vehicles = {
        "V-01": Vehicle(id="V-01", capacity=8, status="active", current_lat=12.9716, current_lng=77.5946),
        "V-02": Vehicle(id="V-02", capacity=8, status="active", current_lat=12.9600, current_lng=77.6000),
        "V-03": Vehicle(id="V-03", capacity=8, status="active", current_lat=12.9850, current_lng=77.5850),
    }
    world_state.stops = {
        f"D-{index + 1:02d}": Stop(
            id=f"D-{index + 1:02d}", lat=lat, lng=lng,
            timeWindowStart=now + timedelta(minutes=10), timeWindowEnd=now + timedelta(hours=5),
            priority="normal", demand=1,
        ) for index, (lat, lng) in enumerate(SEED_STOPS)
    }
    await refresh_travel_times()
    matrix, _ = _matrix_for_active_world()
    world_state.solution = solver.solve(list(world_state.stops.values()), list(world_state.vehicles.values()), matrix)
    await _attach_polylines(world_state.solution)
    empty = Solution(routes=[], timestamp=now)
    _reset_changed_legs(empty, world_state.solution, [])
    world_state.initialized = True
    logger.info("world initialized: %d vehicles, %d stops, %d unassigned", len(world_state.vehicles), len(world_state.stops), len(world_state.solution.unassigned_stop_ids))


async def refresh_travel_times() -> None:
    vehicles = list(world_state.vehicles.values())
    stops = list(world_state.stops.values())
    points = [(v.current_lat, v.current_lng) for v in vehicles] + [(s.lat, s.lng) for s in stops]
    matrix = await maps_client.get_route_matrix(points)
    ids = [v.id for v in vehicles] + [s.id for s in stops]
    world_state.travel_times = {(left, right): matrix[i][j] for i, left in enumerate(ids) for j, right in enumerate(ids)}


def _matrix_for_active_world() -> tuple[list[list[float]], list[str]]:
    ids = [v.id for v in world_state.vehicles.values() if v.status == "active"] + list(world_state.stops)
    return [[world_state.travel_times.get((a, b), 0.0) for b in ids] for a in ids], ids


async def simulation_loop(broadcast) -> None:
    while True:
        await asyncio.sleep(2.5)
        now = datetime.now(timezone.utc)
        for vehicle_id, leg in list(world_state.legs.items()):
            vehicle = world_state.vehicles.get(vehicle_id)
            if not vehicle or vehicle.status != "active":
                continue
            fraction = (now - leg.start_time).total_seconds() / max(leg.duration_seconds, 0.1)
            vehicle.current_lat, vehicle.current_lng = maps_client.interpolate_polyline(leg.points, fraction)
            position = VehiclePositionMessage(vehicleId=vehicle_id, lat=vehicle.current_lat, lng=vehicle.current_lng)
            await broadcast(position.model_dump(mode="json", by_alias=True))
            if fraction >= 1 and leg.target_stop_id and world_state.solution:
                route = next((r for r in world_state.solution.routes if r.vehicle_id == vehicle_id), None)
                if route and route.stop_ids and route.stop_ids[0] == leg.target_stop_id:
                    route.stop_ids.pop(0)
                    route.polyline = maps_client.encode_polyline([(vehicle.current_lat, vehicle.current_lng)] + [(world_state.stops[sid].lat, world_state.stops[sid].lng) for sid in route.stop_ids])
                    if route.stop_ids:
                        next_stop = world_state.stops[route.stop_ids[0]]
                        world_state.legs[vehicle_id] = LegState(
                            points=[(vehicle.current_lat, vehicle.current_lng), (next_stop.lat, next_stop.lng)],
                            start_time=now, duration_seconds=max(2.5, world_state.travel_times.get((leg.target_stop_id, next_stop.id), 90.0)),
                            target_stop_id=next_stop.id,
                        )
                    else:
                        world_state.legs.pop(vehicle_id, None)


def initial_state_payload() -> dict:
    message = InitialStateMessage(stops=list(world_state.stops.values()), vehicles=list(world_state.vehicles.values()), solution=world_state.solution)
    return message.model_dump(mode="json", by_alias=True, exclude={"stops": {"__all__": {"unassigned"}}})
