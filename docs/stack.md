# Tech Stack — APIs, Languages, Libraries

## APIs

| API | Purpose | Used In |
|---|---|---|
| **Google Geocoding API** | Convert stop addresses to lat/lng | Backend, at stop-creation time |
| **Google Routes API — ComputeRouteMatrix** | Traffic-aware time/distance matrix between all stops (up to 625 elements) | Backend, feeds the optimizer's cost matrix |
| **Google Routes API — ComputeRoutes** | Turn-by-turn polyline for a specific vehicle's final route | Backend → Frontend, for drawing routes on the map |
| **Google Maps JavaScript API** | Render map, markers, animated vehicle movement | Frontend |

> Note: Routes API replaces the legacy Directions API / Distance Matrix API — use
> `ComputeRoutes` and `ComputeRouteMatrix`, not the old endpoints.

## Optimization Engine
- **Google OR-Tools (Python)** — primary solver for the VRP with time windows, capacity, and
  priority constraints. Chosen over writing a solver from scratch; supports warm-starting a
  re-solve from a previous solution.
- *(Alternative/fallback: VROOM — C++ engine, solves via HTTP API, also supports VRPTW. Use if
  OR-Tools solve times feel too slow during the demo.)*

## Backend
- **Language:** Python
- **Framework:** FastAPI
- **Responsibilities:**
  - Owns simulated world state (vehicles, stops, live clock)
  - Calls Google APIs (Geocoding, Route Matrix, Routes)
  - Runs OR-Tools solver on trigger
  - Pushes updates to frontend
- **Key libraries:**
  - `ortools` — the solver
  - `httpx` — async calls to Google Maps APIs
  - `websockets` (via FastAPI's native WebSocket support) — push live updates to frontend
  - `pydantic` — request/response models
  - `apscheduler` (optional) — time-triggered re-optimization checks

## Frontend
- **Language:** TypeScript
- **Framework:** React
- **Responsibilities:**
  - Render map, vehicles, routes
  - Event trigger buttons (breakdown / new order / traffic delay)
  - Explanation panel
  - Live updates via WebSocket
- **Key libraries:**
  - `@vis.gl/react-google-maps` (or `@react-google-maps/api`) — Google Maps in React
  - `zustand` or React Context — lightweight state management for live vehicle/route state
  - Native `WebSocket` client — receive live re-optimization pushes

## Data Layer (Simulated Fleet Data)
- **In-memory Python dict/list, or SQLite** — simulated driver/vehicle records:
  `{id, capacity, shift_start, shift_end, current_lat, current_lng, status}`
- No real fleet database exists publicly — this is intentionally synthetic, seeded at startup.

## Deployment
- **Backend:** Render / Railway (FastAPI + WebSocket support)
- **Frontend:** Vercel
- **Env vars:** `GOOGLE_MAPS_API_KEY` (backend only — never exposed to frontend for the Routes/
  Matrix calls; frontend uses a separate restricted key for Maps JavaScript rendering)

## Language/Library Summary by Layer
```
Frontend  → TypeScript, React, Google Maps JS API, WebSocket client
Backend   → Python, FastAPI, OR-Tools, httpx, WebSocket server
External  → Google Geocoding API, Google Routes API (ComputeRoutes, ComputeRouteMatrix)
```
