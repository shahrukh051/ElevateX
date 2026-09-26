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
    allow_origins=[FRONTEND_ORIGIN, "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


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
