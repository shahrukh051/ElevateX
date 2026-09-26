from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Stop(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    lat: float
    lng: float
    time_window_start: datetime = Field(alias="timeWindowStart")
    time_window_end: datetime = Field(alias="timeWindowEnd")
    priority: Literal["normal", "high"] = "normal"
    demand: int = Field(ge=0)
    unassigned: bool = False
