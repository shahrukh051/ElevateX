# Route.md — Pipeline & Repo Structure

## End-to-End Pipeline

```
1. Stops defined (addresses)
        │
        ▼
2. Google Geocoding API  →  lat/lng per stop
        │
        ▼
3. Google Routes API: ComputeRouteMatrix (traffic-aware)
        │  → time/distance matrix between all stops
        ▼
4. Simulated fleet data (vehicles: capacity, shift, position, status)
        │
        ▼
5. OR-Tools solver
        │  inputs: cost matrix + vehicle constraints + time windows + priority
        │  output: assigned route per vehicle
        ▼
6. Google Routes API: ComputeRoutes (per vehicle)
        │  → turn-by-turn polyline for map rendering
        ▼
7. Backend pushes solution to frontend (WebSocket)
        │
        ▼
8. Frontend renders map + animates vehicle movement along polyline
        │
        ▼
9. Event happens (breakdown / new order / traffic delay / window change)
        │
        ▼
10. Trigger check → does this event need a re-solve?
        │  yes → back to step 5, warm-started from current solution
        │  no  → ignored / logged only
        ▼
11. New solution + explanation string → pushed to frontend → repeat from step 7
```

## Repo Folder Structure

```
last-mile-router/
├── README.md
├── backend/
│   ├── main.py                  # FastAPI app entrypoint, WebSocket endpoint
│   ├── config.py                # env vars, API keys
│   ├── models/
│   │   ├── stop.py              # Stop schema (id, lat, lng, window, priority, demand)
│   │   ├── vehicle.py           # Vehicle schema (id, capacity, shift, position, status)
│   │   └── solution.py          # Route/solution response schema
│   ├── services/
│   │   ├── maps_client.py       # Wraps Geocoding + Routes API calls
│   │   ├── solver.py            # OR-Tools setup, solve(), warm_start_solve()
│   │   ├── trigger_engine.py    # Decides whether an event warrants re-optimization
│   │   └── simulator.py         # Simulated vehicle movement + fake event generation
│   ├── state/
│   │   └── world_state.py       # In-memory current state: vehicles, stops, active routes
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── MapView.tsx          # Google Map + markers + polylines
│   │   │   ├── EventControls.tsx    # Buttons: breakdown / new order / delay
│   │   │   ├── ExplanationPanel.tsx # "Why did this change?" feed
│   │   │   └── VehicleList.tsx      # Sidebar: vehicle status, stops assigned
│   │   ├── hooks/
│   │   │   └── useLiveSolution.ts   # WebSocket subscription hook
│   │   ├── types/
│   │   │   └── index.ts             # Shared TS types (Stop, Vehicle, Solution)
│   │   └── store/
│   │       └── useRouteStore.ts     # Zustand store: current solution, events log
│   ├── package.json
│   └── .env.local                   # frontend Maps JS key (restricted)
└── docs/
    ├── problem-statement.md
    ├── stack.md
    ├── route.md
    └── working.md
```

## Notes on Arrangement
- **`services/trigger_engine.py`** is the most important file conceptually — it's where you
  encode the rule for "is this event worth re-solving for." Keep this logic isolated and easy to
  explain in the demo video.
- **`services/simulator.py`** owns all fake data generation and vehicle position interpolation —
  keeping it separate from `solver.py` makes it obvious in code review that the optimization logic
  is real, not scripted.
- **`state/world_state.py`** is the single source of truth the solver reads from and the
  simulator writes to — avoids state getting out of sync between the two.
