# Frontend Creation Prompt — Last-Mile Impossible Route

## Context (paste this if used in a fresh session)
We are building a hackathon project that solves a Dynamic Vehicle Routing Problem (DVRP): a
backend continuously re-optimizes delivery routes as disruptions happen (vehicle breakdown, new
priority order, traffic delay, delivery-window change), and pushes updated routes to the frontend
over a WebSocket. Your job is to build **only the frontend**.

## Goal
Build a React + TypeScript frontend that visualizes live vehicle routes on a Google Map, lets a
user trigger disruption events, and displays a running feed of plain-language explanations for
every re-optimization.

## Tech Constraints
- React + TypeScript
- Google Maps JavaScript API for rendering (use `@vis.gl/react-google-maps` or
  `@react-google-maps/api` — do not use the legacy `DirectionsService`/`DistanceMatrixService`)
- Zustand (or React Context) for state — no Redux
- Native browser `WebSocket` for live updates — no socket.io
- No backend logic, no calls to Google's Routes/Matrix/Geocoding APIs directly from the frontend
  (that's backend-only; frontend only renders what it receives)

## Folder Structure (follow exactly)
```
frontend/
├── src/
│   ├── App.tsx
│   ├── components/
│   │   ├── MapView.tsx
│   │   ├── EventControls.tsx
│   │   ├── ExplanationPanel.tsx
│   │   └── VehicleList.tsx
│   ├── hooks/
│   │   └── useLiveSolution.ts
│   ├── types/
│   │   └── index.ts
│   └── store/
│       └── useRouteStore.ts
├── package.json
└── .env.local
```

## Data Contracts (define these exact TypeScript types in `types/index.ts`)
```ts
export interface Stop {
  id: string;
  lat: number;
  lng: number;
  timeWindowStart: string; // ISO
  timeWindowEnd: string;   // ISO
  priority: "normal" | "high";
  demand: number;
}

export interface Vehicle {
  id: string;
  capacity: number;
  status: "active" | "unavailable";
  currentLat: number;
  currentLng: number;
}

export interface RouteAssignment {
  vehicleId: string;
  stopIds: string[];
  polyline: string; // encoded Google polyline
}

export interface Solution {
  routes: RouteAssignment[];
  timestamp: string;
}

export interface ExplanationEvent {
  id: string;
  message: string;
  timestamp: string;
  triggeringEventType: "breakdown" | "new_order" | "traffic_delay" | "window_change";
}

// WebSocket messages from backend (discriminated union)
export type ServerMessage =
  | { type: "solution_update"; solution: Solution; explanation: ExplanationEvent }
  | { type: "vehicle_position"; vehicleId: string; lat: number; lng: number }
  | { type: "initial_state"; stops: Stop[]; vehicles: Vehicle[]; solution: Solution };

// Messages sent to backend to trigger events
export type ClientMessage =
  | { type: "trigger_breakdown"; vehicleId: string }
  | { type: "trigger_new_order"; stop: Omit<Stop, "id"> }
  | { type: "trigger_traffic_delay"; segmentFrom: string; segmentTo: string; multiplier: number }
  | { type: "trigger_window_change"; stopId: string; newStart: string; newEnd: string };
```

## Component Responsibilities
- **`MapView.tsx`** — renders stops as pins, vehicles as markers, each vehicle's route as a
  distinct-colored polyline (decode the polyline string). Animate vehicle marker position
  smoothly on each `vehicle_position` message rather than snapping.
- **`EventControls.tsx`** — buttons/small forms to send each `ClientMessage` variant over the
  WebSocket. Keep this simple — dropdown to pick a vehicle/stop, then a trigger button.
- **`ExplanationPanel.tsx`** — appends (never replaces) each incoming `ExplanationEvent` to a
  scrollable feed, newest at top, with a timestamp.
- **`VehicleList.tsx`** — sidebar showing each vehicle's status, current stop count, capacity used.
- **`useLiveSolution.ts`** — owns the WebSocket connection, parses incoming `ServerMessage`s,
  writes into the Zustand store. Handle reconnect-on-drop.
- **`useRouteStore.ts`** — single Zustand store holding: `stops`, `vehicles`, `currentSolution`,
  `explanationFeed` (array, append-only).

## UI/UX Requirements
- Route redraws should update only the changed vehicle's polyline, not re-render the whole map
  (this visually reinforces "adjustment, not restart")
- Explanation feed must be visibly append-only — never clear it on a new solution
- Use distinct, consistent colors per vehicle across the whole session

## Non-Goals
- No authentication
- No hardcoded API keys — read Google Maps JS key from `import.meta.env.VITE_GOOGLE_MAPS_KEY`
- No calls to OR-Tools, Geocoding, or Routes API from this codebase — backend already provides
  everything pre-computed

## Acceptance Criteria
- [ ] Map loads and shows all stops + vehicles on initial WebSocket connect
- [ ] Each event button sends a correctly-typed `ClientMessage`
- [ ] Incoming `solution_update` redraws only affected routes
- [ ] Explanation feed accumulates without ever clearing
- [ ] Vehicle markers animate smoothly along their polyline over time
