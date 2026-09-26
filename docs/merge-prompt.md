# Merge & File Arrangement Prompt — Last-Mile Impossible Route

## Context (paste this if used in a fresh session)
Three pieces have been built separately, possibly in different sessions:
1. A frontend (React + TypeScript) — see `frontend-prompt.md`
2. A backend (FastAPI + OR-Tools) — see `backend-prompt.md`
3. The dynamic "working" logic layered into the backend's `trigger_engine.py`/`simulator.py` —
   see `working-prompt.md`

Your job now is **only integration**: assemble everything into one working repo, resolve any
mismatches between the pieces, and make sure it runs end to end.

## Goal
Produce a single repo, exactly matching the structure below, that runs with two commands
(one for backend, one for frontend) and demonstrates the full live re-optimization loop.

## Final Repo Structure (target — reconcile all existing code into this)
```
last-mile-router/
├── README.md
├── .env.example
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── models/
│   │   ├── stop.py
│   │   ├── vehicle.py
│   │   └── solution.py
│   ├── services/
│   │   ├── maps_client.py
│   │   ├── solver.py
│   │   ├── trigger_engine.py
│   │   └── simulator.py
│   ├── state/
│   │   └── world_state.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── MapView.tsx
│   │   │   ├── EventControls.tsx
│   │   │   ├── ExplanationPanel.tsx
│   │   │   └── VehicleList.tsx
│   │   ├── hooks/
│   │   │   └── useLiveSolution.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── store/
│   │       └── useRouteStore.ts
│   ├── package.json
│   └── .env.local
└── docs/
    ├── problem-statement.md
    ├── stack.md
    ├── route.md
    ├── working.md
    ├── frontend-prompt.md
    ├── backend-prompt.md
    ├── working-prompt.md
    └── merge-prompt.md
```

## Integration Checklist (work through in order)
1. **Place code in correct folders** — move/rename any files that don't match the structure above.
2. **Verify the WebSocket contract matches on both sides** — the frontend's `ServerMessage`/
   `ClientMessage` types (in `frontend/src/types/index.ts`) must byte-match the backend's Pydantic
   models and message-type strings (in `backend/models/` and `main.py`). Fix any drift by editing
   whichever side is wrong, not by adding translation layers.
3. **Wire the WebSocket URL** — frontend's `useLiveSolution.ts` must point at the backend's actual
   running address (`ws://localhost:8000/ws` for local dev), read from an env var, not hardcoded.
4. **Environment variables** — create `.env.example` at repo root listing every required var
   (`GOOGLE_MAPS_API_KEY` for backend, `VITE_GOOGLE_MAPS_KEY` for frontend), with no real keys
   committed.
5. **Dependency files** — confirm `backend/requirements.txt` includes `fastapi`, `uvicorn`,
   `ortools`, `httpx`, `pydantic`; confirm `frontend/package.json` includes `react`, `typescript`,
   the Google Maps React library, and `zustand`.
6. **Root README.md** — write setup and run instructions:
   ```
   ## Backend
   cd backend && pip install -r requirements.txt && uvicorn main:app --reload

   ## Frontend
   cd frontend && npm install && npm run dev
   ```
   Include a one-paragraph project summary (pull from `docs/problem-statement.md`) and a link to
   each doc file.
7. **Docs folder** — move all previously generated `.md` files into `docs/` exactly as listed in
   the structure above.
8. **End-to-end smoke test** — start backend, start frontend, open the browser, confirm:
   - Initial map loads with stops and vehicles
   - Triggering each event type produces a visible route change and a new explanation entry
   - No console errors on either side

## What NOT to do
- Don't introduce a new state management pattern, new libraries, or new folders not listed above
  just because it seems cleaner — the goal is reconciliation, not a redesign.
- Don't silently drop a feature from any of the three prior prompts to make integration easier —
  if something is genuinely incompatible, flag it explicitly instead of quietly omitting it.

## Final Acceptance Criteria
- [ ] Repo matches the target folder structure exactly
- [ ] `npm run dev` + `uvicorn main:app --reload` together produce a fully working live demo
- [ ] All four original docs (`problem-statement.md`, `stack.md`, `route.md`, `working.md`) plus
      all four prompt files live under `docs/`
- [ ] README lets a stranger clone and run the project with no prior context
- [ ] Matches every item in `problem-statement.md`'s "What 'Done' Looks Like" section
