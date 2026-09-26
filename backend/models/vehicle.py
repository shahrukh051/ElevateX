from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Vehicle(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    capacity: int
    status: Literal["active", "unavailable"] = "active"
    current_lat: float = Field(alias="currentLat")
    current_lng: float = Field(alias="currentLng")
