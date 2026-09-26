from dataclasses import dataclass, field
from datetime import datetime, timezone

from models.solution import Solution
from models.stop import Stop
from models.vehicle import Vehicle


@dataclass
class LegState:
    points: list[tuple[float, float]] = field(default_factory=list)
    start_time: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    duration_seconds: float = 1.0
    target_stop_id: str | None = None


@dataclass
class WorldState:
    stops: dict[str, Stop] = field(default_factory=dict)
    vehicles: dict[str, Vehicle] = field(default_factory=dict)
    solution: Solution | None = None
    travel_times: dict[tuple[str, str], float] = field(default_factory=dict)
    legs: dict[str, LegState] = field(default_factory=dict)
    initialized: bool = False


world_state = WorldState()
