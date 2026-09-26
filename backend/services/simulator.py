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
    # Key requested Jaipur hubs:
    (26.9248, 75.8016),  # 01 Sindhi Camp Central Bus Stand
    (26.9200, 75.7878),  # 02 Jaipur Junction Railway Station
    (26.8536, 75.8055),  # 03 GT Mall (Gaurav Tower), Malviya Nagar
    (26.8530, 75.8050),  # 04 WTP Jaipur (World Trade Park), JLN Marg
    (27.1855, 75.9870),  # 05 NIMS University, Delhi-Jaipur Highway
    (26.9239, 75.8267),  # 06 Hawa Mahal, Pink City
    (26.9258, 75.8236),  # 07 City Palace Jaipur
    (26.9534, 75.8462),  # 08 Jal Mahal, Amer Road
    (26.9855, 75.8513),  # 09 Amer Fort, Jaipur
    (26.9116, 75.8195),  # 10 Albert Hall Museum, Ram Niwas Garden
    (26.9172, 75.8115),  # 11 MI Road (Panch Batti)
    (26.9080, 75.8040),  # 12 C-Scheme (Statue Circle)
    (26.9095, 75.7850),  # 13 Civil Lines Metro
    (26.9110, 75.7440),  # 14 Vaishali Nagar (Amrapali Circle)
    (26.8550, 75.7650),  # 15 Mansarovar (VT Road)
    (26.8970, 75.8270),  # 16 Raja Park
    (26.8430, 75.8020),  # 17 Jawahar Circle Garden
    (26.8289, 75.8056),  # 18 Jaipur Airport Terminal 2
    (26.8850, 75.8150),  # 19 Bapu Nagar
    (26.8920, 75.8160),  # 20 University of Rajasthan
    (26.9010, 75.7720),  # 21 Sodala, Ajmer Road
    (26.8890, 75.7600),  # 22 Shyam Nagar
    (26.9680, 75.7790),  # 23 Vidhyadhar Nagar
    (26.9420, 75.7890),  # 24 Shastri Nagar
    (26.7780, 75.8350),  # 25 Sitapura Industrial Area
    (26.8180, 75.7720),  # 26 Sanganer Town
    (27.0580, 75.9220),  # 27 Kukas, Delhi-Jaipur Highway
    (27.1420, 75.9650),  # 28 Achrol, near NIMS University
]


async def initialize_world() -> None:
    if world_state.initialized:
        return
    now = datetime.now(timezone.utc)
    world_state.vehicles = {
        "V-01": Vehicle(id="V-01", capacity=6, status="active", current_lat=26.9248, current_lng=75.8016),  # Sindhi Camp
        "V-02": Vehicle(id="V-02", capacity=6, status="active", current_lat=26.9200, current_lng=75.7878),  # Railway Station
        "V-03": Vehicle(id="V-03", capacity=6, status="active", current_lat=26.8536, current_lng=75.8055),  # GT Mall / WTP
        "V-04": Vehicle(id="V-04", capacity=6, status="active", current_lat=27.1855, current_lng=75.9870),  # NIMS University
        "V-05": Vehicle(id="V-05", capacity=6, status="active", current_lat=26.9080, current_lng=75.8040),  # C-Scheme
        "V-06": Vehicle(id="V-06", capacity=6, status="active", current_lat=26.8550, current_lng=75.7650),  # Mansarovar
        "V-07": Vehicle(id="V-07", capacity=6, status="active", current_lat=26.9239, current_lng=75.8267),  # Hawa Mahal / Pink City
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


import math


def calculate_bearing(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    d_lng = math.radians(lng2 - lng1)
    y = math.sin(d_lng) * math.cos(math.radians(lat2))
    x = math.cos(math.radians(lat1)) * math.sin(math.radians(lat2)) - math.sin(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.cos(d_lng)
    bearing = (math.degrees(math.atan2(y, x)) + 360) % 360
    return round(bearing, 1)


async def simulation_loop(broadcast) -> None:
    while True:
        await asyncio.sleep(1.0)
        now = datetime.now(timezone.utc)
        for vehicle_id, leg in list(world_state.legs.items()):
            vehicle = world_state.vehicles.get(vehicle_id)
            if not vehicle or vehicle.status != "active":
                continue
            fraction = (now - leg.start_time).total_seconds() / max(leg.duration_seconds, 0.1)
            vehicle.current_lat, vehicle.current_lng = maps_client.interpolate_polyline(leg.points, fraction)
            
            bearing = 0.0
            if len(leg.points) >= 2:
                bearing = calculate_bearing(leg.points[0][0], leg.points[0][1], leg.points[-1][0], leg.points[-1][1])
                
            position = VehiclePositionMessage(
                vehicleId=vehicle_id,
                lat=vehicle.current_lat,
                lng=vehicle.current_lng,
                bearing=bearing,
            )
            await broadcast(position.model_dump(mode="json", by_alias=True))
            
            if fraction >= 1 and leg.target_stop_id and world_state.solution:
                route = next((r for r in world_state.solution.routes if r.vehicle_id == vehicle_id), None)
                if route and route.stop_ids:
                    if route.stop_ids[0] == leg.target_stop_id:
                        popped = route.stop_ids.pop(0)
                        # Cycle stop to the end so vehicle continuously operates
                        route.stop_ids.append(popped)
                    
                    next_stop_id = route.stop_ids[0]
                    next_stop = world_state.stops.get(next_stop_id)
                    if next_stop:
                        travel = world_state.travel_times.get((vehicle_id, next_stop.id), 25.0)
                        world_state.legs[vehicle_id] = LegState(
                            points=[(vehicle.current_lat, vehicle.current_lng), (next_stop.lat, next_stop.lng)],
                            start_time=now,
                            duration_seconds=max(4.0, min(travel * 0.15, 12.0)),
                            target_stop_id=next_stop.id,
                        )
                    else:
                        world_state.legs.pop(vehicle_id, None)
                else:
                    world_state.legs.pop(vehicle_id, None)


def initial_state_payload() -> dict:
    message = InitialStateMessage(stops=list(world_state.stops.values()), vehicles=list(world_state.vehicles.values()), solution=world_state.solution)
    return message.model_dump(mode="json", by_alias=True, exclude={"stops": {"__all__": {"unassigned"}}})
