# Last-Mile Impossible Route

Last-mile delivery plans can become outdated within minutes as traffic shifts, vehicles break down, delivery windows change, and priority orders appear. This demo treats the problem as a Dynamic Vehicle Routing Problem: it starts with routes for a simulated fleet, evaluates live events against explicit trigger rules, warm-starts re-optimization from the current assignment, measures route churn, and explains each change while vehicles keep moving.

## Run locally

### Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Copy `.env.example` to `.env` for backend configuration, then add your restricted Maps JavaScript key as `VITE_GOOGLE_MAPS_KEY` in `frontend/.env.local`. `GOOGLE_MAPS_API_KEY` enables real Google route matrix and route geometry calls; without it, the backend uses a deterministic local travel-time model and generated route polylines. `VITE_GOOGLE_MAPS_KEY` enables the Google map; the frontend shows its local route view when no browser key is configured. The frontend WebSocket defaults to `ws://localhost:8000/ws` and can be changed with `VITE_WS_URL`.

## Project notes

- [Problem statement](docs/problem-statement.md)
- [Tech stack](docs/stack.md)
- [Route and repo structure](docs/route.md)
- [Runtime behavior](docs/working.md)
- [Frontend prompt](docs/frontend-prompt.md)
- [Backend prompt](docs/backend-prompt.md)
- [Working logic prompt](docs/working-prompt.md)
- [Merge prompt](docs/merge-prompt.md)

The backend keeps state in memory for the demo. Events are serialized through one solve lock; each event is logged with its trigger decision, and each re-solve logs its warm-start churn count. The OR-Tools search has a three-second limit.
