from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class RouteAssignment(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    vehicle_id: str = Field(alias="vehicleId")
    stop_ids: list[str] = Field(default_factory=list, alias="stopIds")
    polyline: str = ""


class Solution(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    routes: list[RouteAssignment]
    timestamp: datetime
    unassigned_stop_ids: list[str] = Field(default_factory=list, alias="unassignedStopIds")


class ExplanationEvent(BaseModel):
    id: str
    message: str
    timestamp: datetime
    triggering_event_type: Literal["breakdown", "new_order", "traffic_delay", "window_change"] = Field(alias="triggeringEventType")
