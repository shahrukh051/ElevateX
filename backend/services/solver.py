from datetime import datetime, timezone

from models.solution import RouteAssignment, Solution
from models.stop import Stop
from models.vehicle import Vehicle

try:
    from ortools.constraint_solver import pywrapcp, routing_enums_pb2
except ImportError:  # The deterministic fallback keeps the demo bootable before dependencies are installed.
    pywrapcp = None
    routing_enums_pb2 = None


def solve(stops: list[Stop], vehicles: list[Vehicle], matrix: list[list[float]]) -> Solution:
    return _solve(stops, vehicles, matrix, None)


def warm_start_solve(stops: list[Stop], vehicles: list[Vehicle], matrix: list[list[float]], previous_solution: Solution) -> Solution:
    return _solve(stops, vehicles, matrix, previous_solution)


def _solve(stops: list[Stop], vehicles: list[Vehicle], matrix: list[list[float]], previous: Solution | None) -> Solution:
    if not vehicles:
        return Solution(routes=[], timestamp=datetime.now(timezone.utc), unassigned_stop_ids=[s.id for s in stops])
    active = [v for v in vehicles if v.status == "active"]
    if not active:
        return Solution(routes=[RouteAssignment(vehicleId=v.id, stopIds=[], polyline="") for v in vehicles], timestamp=datetime.now(timezone.utc), unassignedStopIds=[s.id for s in stops])
    if pywrapcp is None or not stops:
        assignments = _fallback_assign(stops, active, matrix, previous)
    else:
        assignments = _ortools_assign(stops, active, matrix, previous, len(vehicles))
    routes = [RouteAssignment(vehicleId=v.id, stopIds=assignments.get(v.id, []), polyline="") for v in vehicles]
    assigned = {stop_id for route in routes for stop_id in route.stop_ids}
    return Solution(routes=routes, timestamp=datetime.now(timezone.utc), unassignedStopIds=[s.id for s in stops if s.id not in assigned])


def _ortools_assign(stops: list[Stop], active: list[Vehicle], matrix: list[list[float]], previous: Solution | None, all_vehicle_count: int) -> dict[str, list[str]]:
    vehicle_count = len(active)
    node_count = vehicle_count + len(stops)
    if len(matrix) != node_count:
        return _fallback_assign(stops, active, matrix, previous)
    manager = pywrapcp.RoutingIndexManager(node_count, vehicle_count, list(range(vehicle_count)), list(range(vehicle_count)))
    routing = pywrapcp.RoutingModel(manager)

    def travel(from_index: int, to_index: int) -> int:
        a, b = manager.IndexToNode(from_index), manager.IndexToNode(to_index)
        return int(max(0, matrix[a][b]))

    transit_index = routing.RegisterTransitCallback(travel)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_index)
    demand_by_node = [0] * vehicle_count + [stop.demand for stop in stops]

    def demand(index: int) -> int:
        return demand_by_node[manager.IndexToNode(index)]

    demand_index = routing.RegisterUnaryTransitCallback(demand)
    routing.AddDimensionWithVehicleCapacity(demand_index, 0, [v.capacity for v in active], True, "Capacity")
    routing.AddDimension(transit_index, 6 * 3600, 8 * 3600, False, "Time")
    time_dimension = routing.GetDimensionOrDie("Time")
    now = datetime.now(timezone.utc)
    for offset, stop in enumerate(stops, start=vehicle_count):
        index = manager.NodeToIndex(offset)
        start = max(0, int((stop.time_window_start - now).total_seconds()))
        end = min(8 * 3600, int((stop.time_window_end - now).total_seconds()))
        if end < start:
            end = start
        time_dimension.CumulVar(index).SetRange(start, end)
        routing.AddDisjunction([index], 10_000_000 if stop.priority == "high" else 100_000)
    params = pywrapcp.DefaultRoutingSearchParameters()
    params.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PARALLEL_CHEAPEST_INSERTION
    params.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    params.time_limit.seconds = 3
    seed = None
    if previous:
        stop_index = {stop.id: index + vehicle_count for index, stop in enumerate(stops)}
        previous_by_vehicle = {r.vehicle_id: r.stop_ids for r in previous.routes}
        route_nodes = [[stop_index[sid] for sid in previous_by_vehicle.get(vehicle.id, []) if sid in stop_index] for vehicle in active]
        try:
            seed = routing.ReadAssignmentFromRoutes(route_nodes, True)
        except (RuntimeError, ValueError):
            seed = None
    assignment = routing.SolveFromAssignmentWithParameters(seed, params) if seed else None
    if assignment is None:
        assignment = routing.SolveWithParameters(params)
    if assignment is None:
        return _fallback_assign(stops, active, matrix, previous)
    result: dict[str, list[str]] = {}
    node_to_stop = {i + vehicle_count: stop.id for i, stop in enumerate(stops)}
    for vehicle_no, vehicle in enumerate(active):
        index = routing.Start(vehicle_no)
        order: list[str] = []
        while not routing.IsEnd(index):
            index = assignment.Value(routing.NextVar(index))
            node = manager.IndexToNode(index)
            if node in node_to_stop:
                order.append(node_to_stop[node])
        result[vehicle.id] = order
    return result


def _fallback_assign(stops: list[Stop], vehicles: list[Vehicle], matrix: list[list[float]], previous: Solution | None) -> dict[str, list[str]]:
    orders = {v.id: [] for v in vehicles}
    capacities = {v.id: v.capacity for v in vehicles}
    stop_by_id = {s.id: s for s in stops}
    assigned: set[str] = set()
    if previous:
        for route in previous.routes:
            if route.vehicle_id not in orders:
                continue
            for stop_id in route.stop_ids:
                stop = stop_by_id.get(stop_id)
                if stop and stop_id not in assigned and stop.demand <= capacities[route.vehicle_id]:
                    orders[route.vehicle_id].append(stop_id)
                    capacities[route.vehicle_id] -= stop.demand
                    assigned.add(stop_id)
    for stop in sorted((s for s in stops if s.id not in assigned), key=lambda s: (s.priority != "high", s.time_window_end)):
        candidates = [v for v in vehicles if capacities[v.id] >= stop.demand]
        if not candidates:
            continue
        # Preserve the previous route shape where feasible; append pending work with minimum matrix cost.
        def cost(vehicle: Vehicle) -> float:
            previous_stop = orders[vehicle.id][-1] if orders[vehicle.id] else None
            a = vehicles.index(vehicle)
            b = (len(vehicles) + list(stop_by_id).index(stop.id))
            try:
                return matrix[a][b] if previous_stop is None else matrix[len(vehicles) + list(stop_by_id).index(previous_stop)][b]
            except (IndexError, ValueError):
                return float(len(orders[vehicle.id]))
        chosen = min(candidates, key=cost)
        orders[chosen.id].append(stop.id)
        capacities[chosen.id] -= stop.demand
    return orders
