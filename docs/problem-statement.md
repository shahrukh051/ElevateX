# Problem Statement — The Last-Mile Impossible Route

## Category
Logistics / Optimization / Real-Time Systems

## The Problem (as given)
A delivery plan can become outdated within minutes. Traffic changes, vehicles break down,
customers change their delivery windows, and new priority orders appear while drivers are
already on the road.

Build a system that can **continuously adjust delivery routes and vehicle assignments** as
conditions change. It should consider vehicle capacity, delivery windows, driver limits, travel
time, and delivery priority.

The goal is not simply to find a route once. The system should be able to **react to new events
without throwing away all previous work and starting from zero every time**.

## What Kind of Problem This Actually Is
This is a **Dynamic Vehicle Routing Problem (DVRP)** — the real-time variant of the classic
Vehicle Routing Problem with Time Windows (VRPTW). Unlike a static VRP where every input is
known up front, a DVRP has information that evolves during execution: new orders, cancelled
stops, changing traffic, and vehicle failures.

The core technical challenge is **not** "solve a VRP" (solvers already do that). It is:
- Deciding **when** a change is significant enough to justify re-solving
- Re-solving in a way that **preserves as much of the existing plan as possible** (low churn)
- Doing all of this **fast enough** to feel live

## What We Need to Build (MVP)
1. **Initial route generation** — given stops, vehicles, capacities, and time windows, produce an
   optimized route per vehicle.
2. **Live event injection** — simulate real-world disruptions: traffic delay, vehicle breakdown,
   new priority order, customer time-window change.
3. **Incremental re-optimization** — when an event fires, re-solve using the previous solution as
   a starting point (warm start), instead of recomputing everything from scratch.
4. **Map visualization** — show routes and vehicle positions updating live as events happen.
5. **Explanation panel** — plain-language reason for every re-optimization, e.g. *"Vehicle 2 broke
   down; its 4 stops were reassigned to Vehicle 1 and Vehicle 3."*

## Explicitly Out of Scope (for 24 hours)
- True incremental/online optimization algorithms (research-level; we use warm-start re-solves
  instead)
- Real GPS hardware / real drivers — vehicle movement is simulated
- Multi-depot, multi-day planning
- Production-grade auth, multi-tenant support

## What "Done" Looks Like
- A map showing 3+ vehicles and 15–20 stops with an optimized initial plan
- At least 3 working disruption types (breakdown, new order, traffic delay) that trigger visible,
  sensible route changes
- Route changes are **incremental**, not a completely different route each time
- Every re-optimization has a human-readable explanation
- Deployed link + GitHub repo + 3–5 min explanation video

## Judging Angle (what will make this stand out)
- Explainability of *why* a re-optimization happened, not just that it did
- Low churn — the new plan should look like a patch on the old plan
- Honesty about tradeoffs — DVRP is NP-hard; state the solve-time budget explicitly instead of
  overclaiming a fully "optimal" system
