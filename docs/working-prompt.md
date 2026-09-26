# Working Creation Prompt — Last-Mile Impossible Route

## Context (paste this if used in a fresh session)
The frontend and backend scaffolding already exist (see `frontend-prompt.md` and
`backend-prompt.md`). What's still missing is the **actual "dynamic" intelligence** — the logic
that decides when to re-optimize, keeps the re-solve incremental, and explains what changed. This
is the part that makes the project answer the real problem statement rather than just being a
one-time route solver with a map on top.

## Goal
Implement the runtime behavior described below inside `services/trigger_engine.py`,
`services/simulator.py`, and the diff/explanation logic — wiring them together so the full
event → decide → re-solve → explain → broadcast loop works end to end.

## The Loop You're Implementing
```
1. Event occurs (breakdown / new order / traffic delay / window change)
2. world_state is mutated to reflect it
3. trigger_engine decides: re-solve or ignore
4. if re-solve: solver.warm_start_solve() runs, seeded from current solution
5. old vs new solution are diffed → explanation string generated
6. new solution + explanation are broadcast to all connected frontend clients
7. simulator resumes moving vehicles along their (possibly updated) routes
```

## Trigger Decision Rules (implement exactly these, keep them isolated and testable)
| Event | Rule |
|---|---|
| Vehicle breakdown | Always re-solve |
| New priority order | Always re-solve |
| Traffic delay | Re-solve only if delay multiplier > 1.5x on a segment currently in use by an active route |
| Time-window change | Re-solve only if it makes the current assignment infeasible (check before re-solving, don't just always trigger) |

Log every event and the trigger decision (re-solve vs. ignore) with a one-line reason — this log
is useful for the demo video ("here's proof we're not blindly re-solving on everything").

## Warm-Start Requirement
- The re-solve must start from the **current solution's assignment**, not from scratch.
- After solving, compute a **churn metric**: number of (vehicle, stop) pairs that changed vs. the
  previous solution. Log this number after every re-solve — it's your evidence that the system
  minimizes disruption rather than just re-running the solver blind.

## Explanation Generation (diff logic)
Given `old_solution: Solution` and `new_solution: Solution`:
1. For each vehicle, compare its `stop_ids` list before and after.
2. Identify stops that moved to a different vehicle, and any new/removed stops.
3. Compose a message template based on the triggering event type, e.g.:
   - Breakdown: `"{vehicle} broke down. Its {n} remaining stops were reassigned: {details}."`
   - New order: `"New priority stop {stop_id} was added and assigned to {vehicle}."`
   - Traffic delay: `"Heavy delay detected on {segment}. {n} routes were adjusted to avoid it."`
   - Window change: `"{stop_id}'s delivery window changed, making {vehicle}'s route infeasible.
     Stop was reassigned to {vehicle2}."`
4. Return this as the `message` field of an `ExplanationEvent` (see backend-prompt.md contract).

## Vehicle Movement Simulation (`simulator.py`)
- Each active vehicle tracks: current polyline, start time of current leg, estimated duration.
- On each tick (every 2–3 seconds), compute elapsed fraction = `(now - start_time) / duration`,
  interpolate lat/lng along the decoded polyline accordingly, broadcast `vehicle_position`.
- On a re-solve that changes a vehicle's route, reset its polyline/start_time/duration to the new
  assignment's leg — the vehicle should visibly redirect, not teleport.

## Edge Cases to Handle
- **Unassignable stop** (no vehicle has remaining capacity/time): don't drop it silently — mark it
  `unassigned` in the solution and surface it in the explanation
  (`"Stop {id} could not be reassigned — flagged for manual dispatch."`)
- **Rapid successive events** (two events within the same solve window): queue the second event
  and process it after the first re-solve completes — never run two solves concurrently on
  shared state
- **Breakdown with zero remaining stops**: mark vehicle unavailable, skip re-solve entirely, log
  "no re-solve needed"

## Acceptance Criteria
- [ ] Minor traffic delay does not trigger a re-solve (verify via log)
- [ ] Major traffic delay, breakdown, and new order all trigger a re-solve
- [ ] Churn metric is logged and is visibly lower than "number of total stops" (proof it's not a
  full reshuffle)
- [ ] Every re-solve produces exactly one matching, human-readable explanation
- [ ] An unassignable stop is flagged, never dropped or causes a crash
- [ ] Two events fired back-to-back are processed sequentially, not concurrently
