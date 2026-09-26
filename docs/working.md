# Working.md — How the System Works

## 1. Startup
- Backend seeds `world_state` with a fixed set of stops (addresses → geocoded to lat/lng) and a
  fixed set of simulated vehicles (id, capacity, shift window, starting depot position).
- Backend calls `ComputeRouteMatrix` once to get the full traffic-aware time/distance matrix
  between all stops and vehicle starting points.
- Backend runs the OR-Tools solver on this initial data → produces an initial route per vehicle.
- Backend calls `ComputeRoutes` per vehicle to get the actual road polyline.
- Solution is pushed to the frontend over WebSocket on connect.

## 2. Normal Operation (No Events)
- Frontend renders the map: stops as pins, vehicles as moving markers.
- `simulator.py` on the backend advances each vehicle's position along its polyline based on
  elapsed time vs. estimated travel duration, and broadcasts position updates every few seconds.
- No re-optimization happens — this is the steady state.

## 3. An Event Fires
Events are triggered manually in the demo (buttons in `EventControls.tsx`) but represent real
disruptions:
- **Traffic delay** — a segment's travel time is artificially multiplied
- **Vehicle breakdown** — a vehicle's status flips to `unavailable`, its unfinished stops become
  unassigned
- **New priority order** — a new stop is added to the pending list with `priority: high`
- **Time-window change** — an existing stop's delivery window is updated

Each event updates `world_state` first, then notifies `trigger_engine.py`.

## 4. Trigger Decision
`trigger_engine.py` decides whether the event is worth a re-solve:
- Breakdown, new order → **always re-solve** (assignment is directly affected)
- Small traffic delay under a threshold → **ignore**, log only
- Large traffic delay over a threshold → **re-solve**
- Time-window change → **re-solve** only if it makes the current assignment infeasible

This distinction is what prevents the system from thrashing on every minor fluctuation, and it's
the detail worth highlighting in the demo video.

## 5. Re-Optimization (Warm Start)
- `solver.py` is called again, but seeded with the **current solution** as a starting point rather
  than solving from a blank slate.
- Only the affected vehicles/stops are meaningfully perturbed; unaffected routes are left as-is
  wherever possible — this is what keeps churn low.
- Solver returns an updated assignment within a capped time budget (e.g. 2–3 seconds), so the
  system stays responsive even though VRP is NP-hard.

## 6. Explanation Generation
- Backend diffs the old solution against the new one: which stops moved, which vehicle picked
  them up, why (linked to the triggering event).
- Produces a plain-language string, e.g.:
  *"Vehicle 2 broke down at 11:42 AM. Its remaining 4 stops were reassigned — 3 to Vehicle 1,
  1 to Vehicle 3 — based on capacity and proximity."*
- This string, plus the new routes/polylines, is pushed to the frontend.

## 7. Frontend Update
- `useLiveSolution.ts` receives the WebSocket push, updates the Zustand store.
- `MapView.tsx` redraws only the changed routes (not a full re-render/reset of the whole map) —
  reinforces the "adjustment, not restart" story visually.
- `ExplanationPanel.tsx` appends the new explanation to a running feed, so judges can scroll back
  through the whole sequence of decisions during the demo.

## 8. Edge Cases to Handle Gracefully
- **Unassignable stop** (no vehicle has capacity/time left) → flagged in the UI as "needs manual
  reconciliation," not silently dropped or a crash.
- **Two events in quick succession** → trigger engine should queue/debounce so the solver isn't
  called twice in overlapping windows.
- **Vehicle breaks down with zero remaining stops** → no re-solve needed; just mark it
  unavailable and skip.

## 9. Demo Video Flow (suggested)
1. Show initial optimized routes on the map (10s)
2. Trigger a breakdown → show re-solve happen live, point at the explanation panel (30s)
3. Trigger a new priority order → same (30s)
4. Explain the trigger engine's logic in one sentence, and the warm-start approach in one
   sentence (30s)
5. Acknowledge scope/tradeoffs honestly (simulated fleet, capped solve time, warm-start not
   full incremental optimization) (20s)
