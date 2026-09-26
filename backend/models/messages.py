from datetime import datetime
from typing import Annotated, Literal, Union

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter
from models.solution import ExplanationEvent, Solution
from models.stop import Stop
from models.vehicle import Vehicle


class TriggerBreakdown(BaseModel):
    type: Literal["trigger_breakdown"]
    vehicle_id: str = Field(alias="vehicleId")
    model_config = ConfigDict(populate_by_name=True)


class TriggerNewOrder(BaseModel):
    type: Literal["trigger_new_order"]
    stop: dict


class TriggerTrafficDelay(BaseModel):
    type: Literal["trigger_traffic_delay"]
    segment_from: str = Field(alias="segmentFrom")
    segment_to: str = Field(alias="segmentTo")
    multiplier: float = Field(gt=0)
    model_config = ConfigDict(populate_by_name=True)


class TriggerWindowChange(BaseModel):
    type: Literal["trigger_window_change"]
    stop_id: str = Field(alias="stopId")
    new_start: datetime = Field(alias="newStart")
    new_end: datetime = Field(alias="newEnd")
    model_config = ConfigDict(populate_by_name=True)


ClientMessage = Annotated[Union[TriggerBreakdown, TriggerNewOrder, TriggerTrafficDelay, TriggerWindowChange], Field(discriminator="type")]
client_message_adapter = TypeAdapter(ClientMessage)


class InitialStateMessage(BaseModel):
    type: Literal["initial_state"] = "initial_state"
    stops: list[Stop]
    vehicles: list[Vehicle]
    solution: Solution


class SolutionUpdateMessage(BaseModel):
    type: Literal["solution_update"] = "solution_update"
    solution: Solution
    explanation: ExplanationEvent


class VehiclePositionMessage(BaseModel):
    type: Literal["vehicle_position"] = "vehicle_position"
    vehicle_id: str = Field(alias="vehicleId")
    lat: float
    lng: float
    bearing: float = 0.0
    model_config = ConfigDict(populate_by_name=True)
