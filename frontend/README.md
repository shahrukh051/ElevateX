# Last-Mile Route Control — Frontend

React + TypeScript frontend for the DVRP hackathon project. Renders live vehicle
routes on Google Maps, lets you trigger disruption events, and shows a
running feed of plain-language re-optimization explanations. This app only
renders what the backend sends over WebSocket — no routing logic lives here.

## Setup

```bash
npm install
cp .env.local .env.local.bak   # already present — just fill in the key below
```

Edit `.env.local`:

- `VITE_GOOGLE_MAPS_KEY` — a Google Maps JavaScript API key with the Maps
  JavaScript API and Advanced Markers enabled.
- `VITE_GOOGLE_MAPS_MAP_ID` — optional, a Map ID from Cloud Console (needed
  for full Advanced Marker styling; the map still renders without it).
- `VITE_WS_URL` — your backend's WebSocket endpoint (defaults to
  `ws://localhost:8000/ws`).

## Run

```bash
npm run dev
```

## What the backend needs to send

On connect, an `initial_state` message with all `stops`, `vehicles`, and the
current `solution`. After that, `solution_update` on every re-optimization
(with a paired `explanation`) and `vehicle_position` for live marker
movement. Exact shapes are in `src/types/index.ts`.

## Notes on the trickier requirements

- **Only the changed route redraws**: `MapView` caches each vehicle's decoded
  path keyed by its encoded polyline string. If a `solution_update` repeats
  the same string for a vehicle, that vehicle's path array reference is
  reused, so its `RoutePolyline` component's `setPath` effect never fires.
- **Smooth vehicle movement**: `VehicleMarker` eases from its last rendered
  position to each new `vehicle_position` over ~800ms with `requestAnimationFrame`,
  instead of snapping.
- **Append-only explanation feed**: the store only ever prepends to
  `explanationFeed`; nothing clears or replaces it.
