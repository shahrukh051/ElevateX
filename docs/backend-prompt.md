# Backend Creation Prompt — Last-Mile Impossible Route

## Context (paste this if used in a fresh session)
We are building a hackathon project that solves a Dynamic Vehicle Routing Problem (DVRP): routes
must re-optimize live as disruptions occur (vehicle breakdown, new priority order, traffic delay,
delivery-window change). Your job is to build **only the backend** — the frontend already expects
a specific WebSocket message contract (below), so match it exactly.

## Goal
Build a FastAPI backend that: holds simulated fleet/stop state, calls Google Maps APIs for
real road data, solves the VRP with OR-Tools, and pushes live updates to connected frontend
clients over WebSocket.

## Tech Constraints
- Python, FastAPI
- `ortools` for solving (VRP with time windows, capacity, priority)
- `httpx` for async Google Maps API calls
- FastAPI's native WebSocket support — no separate socket.io server
- In-memory state for the hackathon (a Python dict/class is fine — no need for Postgres)

## Folder Structure (follow exactly)
```
backend/
├── main.py
├── config.py
├── models/
│   ├── stop.py
│   ├── vehicle.py
│   └── solution.py
├── services/
│   ├── maps_client.py
│   ├── solver.py
│   ├── trigger_engine.py
│   └── simulator.py
├── state/
│   └── world_state.py
└── requirements.txt
```

## Data Contracts (must match frontend exactly — see `frontend-prompt.md`)
Implement these as Pydantic models in `models/`:
```python
class Stop(BaseModel):
    id: str
    lat: float
    lng: float
    time_window_start: datetime
    time_window_end: datetime
    priority: Literal["normal", "high"]
    demand: int

class Vehicle(BaseModel):
    id: str
    capacity: int
    status: Literal["active", "unavailable"]
    current_lat: float
    current_lng: float

class RouteAssignment(BaseModel):
    vehicle_id: str
    stop_ids: list[str]
    polyline: str

class Solution(BaseModel):
    routes: list[RouteAssignment]
    timestamp: datetime
```
WebSocket outgoing messages must be JSON matching the frontend's `ServerMessage` union exactly:
`solution_update`, `vehicle_position`, `initial_state`. Incoming messages match `ClientMessage`:
`trigger_breakdown`, `trigger_new_order`, `trigger_traffic_delay`, `trigger_window_change`.

## Google Maps Integration (`services/maps_client.py`)
- `geocode(address: str) -> tuple[float, float]` — wraps Geocoding API
- `get_route_matrix(points: list[tuple[float, float]]) -> list[list[float]]` — wraps
  `ComputeRouteMatrix` (traffic-aware; cap at ≤20 points to stay well under the 625-element limit)
- `get_route_polyline(origin, destination, waypoints: list) -> str` — wraps `ComputeRoutes`,
  returns the encoded polyline for one vehicle's ordered stop list
- Read `GOOGLE_MAPS_API_KEY` from `config.py` / env — never hardcode

## Solver (`services/solver.py`)
- `solve(stops, vehicles, matrix) -> Solution` — cold-start solve using OR-Tools' routing model
  with capacity constraints, time windows, and priority (encode priority as a penalty for
  leaving a high-priority stop unassigned)
- `warm_start_solve(stops, vehicles, matrix, previous_solution) -> Solution` — same solve, but
  seed the search with `previous_solution`'s assignment so unaffected routes are preserved where
  feasible
- Cap solve time (e.g. `search_parameters.time_limit.seconds = 3`) so re-solves stay fast

## Trigger Engine (`services/trigger_engine.py`)
- Given an incoming event and current `world_state`, decide: re-solve now, or ignore/log only
- Rules: breakdown → always re-solve; new order → always re-solve; traffic delay → re-solve only
  if the delay multiplier exceeds a threshold (e.g. 1.5x); window change → re-solve only if it
  makes the current assignment infeasible
- On "re-solve" decision, call `solver.warm_start_solve(...)`, then generate an explanation string
  by diffing old vs. new `Solution` (which stops moved, to which vehicle, why)

## Simulator (`services/simulator.py`)
- Seeds initial fake vehicles/stops at startup
- Background task: every N seconds, interpolate each active vehicle's position along its current
  polyline based on elapsed time vs. estimated duration, broadcast `vehicle_position` messages
- Exposes functions to mutate state for each event type (mark vehicle unavailable, add new stop,
  multiply a segment's cost, change a stop's window) — called by the WebSocket endpoint when a
  `ClientMessage` arrives

## Endpoints (`main.py`)
- `WS /ws` — on connect, send `initial_state`; on receiving a `ClientMessage`, mutate state via
  `simulator.py`, run it through `trigger_engine.py`, broadcast the result to all connected
  clients
- `GET /health` — simple liveness check

## Non-Goals
- No database — in-memory state only
- No auth
- No real GPS/hardware integration

## Acceptance Criteria
- [ ] `initial_state` message matches frontend's expected shape exactly
- [ ] Each `ClientMessage` type is handled and produces a `solution_update`
- [ ] Warm-start re-solve measurably preserves unaffected vehicle routes (log a churn count)
- [ ] Solve time stays under ~3 seconds per re-optimization
- [ ] Explanation strings are human-readable and reference the specific triggering event
