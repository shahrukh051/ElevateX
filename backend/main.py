from datetime import datetime, timezone
import asyncio
import logging
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from config import FRONTEND_ORIGIN
from models.messages import client_message_adapter
from services.simulator import initial_state_payload, initialize_world, simulation_loop
from services.trigger_engine import process_event
from state.world_state import LegState, world_state

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
clients: set[WebSocket] = set()


async def broadcast(message: dict) -> None:
    disconnected = []
    for client in tuple(clients):
        try:
            await client.send_json(message)
        except Exception:
            disconnected.append(client)
    for client in disconnected:
        clients.discard(client)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await initialize_world()
    simulator_task = asyncio.create_task(simulation_loop(broadcast))
    yield
    simulator_task.cancel()
    with suppress(asyncio.CancelledError):
        await simulator_task


app = FastAPI(title="Last-Mile Impossible Route", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.get("/reset")
async def reset_fleet() -> dict:
    """Restore all vehicles to active and re-arm movement legs."""
    for vehicle in world_state.vehicles.values():
        vehicle.status = "active"
    if world_state.solution:
        now = datetime.now(timezone.utc)
        for route in world_state.solution.routes:
            if route.stop_ids and route.vehicle_id not in world_state.legs:
                target = world_state.stops.get(route.stop_ids[0])
                vehicle = world_state.vehicles.get(route.vehicle_id)
                if target and vehicle:
                    world_state.legs[route.vehicle_id] = LegState(
                        points=[(vehicle.current_lat, vehicle.current_lng), (target.lat, target.lng)],
                        start_time=now,
                        duration_seconds=8.0,
                        target_stop_id=target.id,
                    )
    await broadcast(initial_state_payload())
    return {"status": "ok", "reset": list(world_state.vehicles.keys())}


@app.get("/sync")
async def sync_fleet() -> dict:
    """Rebroadcast current world state to all connected clients."""
    await broadcast(initial_state_payload())
    return {"status": "ok"}


@app.get("/clear")
async def clear_disruptions() -> dict:
    """Remove all pending/priority stops (P-*) and rebroadcast state."""
    priority_ids = [sid for sid in list(world_state.stops.keys()) if sid.startswith("P-")]
    for sid in priority_ids:
        world_state.stops.pop(sid, None)
        if world_state.solution:
            for route in world_state.solution.routes:
                if sid in route.stop_ids:
                    route.stop_ids.remove(sid)
    await broadcast(initial_state_payload())
    return {"status": "ok", "removed": priority_ids}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    clients.add(websocket)
    await websocket.send_json(initial_state_payload())
    try:
        while True:
            raw = await websocket.receive_json()
            try:
                message = client_message_adapter.validate_python(raw)
                event = message.model_dump(mode="json", by_alias=True)
            except ValidationError as error:
                await websocket.send_json({"type": "error", "message": f"Invalid event payload: {error.errors()[0]['msg']}"})
                continue
            await process_event(event, broadcast)
    except WebSocketDisconnect:
        pass
    finally:
        clients.discard(websocket)
