import logging
import math
from typing import Iterable

import httpx

from config import GOOGLE_MAPS_API_KEY

logger = logging.getLogger(__name__)


def _fallback_polyline(points: Iterable[tuple[float, float]]) -> str:
    """Encode (lat, lng) points using Google's polyline format."""
    result: list[str] = []
    last_lat = last_lng = 0
    for lat, lng in points:
        for value, previous in ((round(lat * 1e5), last_lat), (round(lng * 1e5), last_lng)):
            delta = value - previous
            last_lat, last_lng = (value, last_lng) if previous == last_lat else (last_lat, value)
            encoded = ~(delta << 1) if delta < 0 else delta << 1
            while encoded >= 0x20:
                result.append(chr((0x20 | (encoded & 0x1f)) + 63))
                encoded >>= 5
            result.append(chr(encoded + 63))
    return "".join(result)


def encode_polyline(points: Iterable[tuple[float, float]]) -> str:
    # Keep the local fallback independent from credentials and network access.
    points = list(points)
    result: list[str] = []
    lat_prev = lng_prev = 0
    for lat, lng in points:
        lat_i, lng_i = round(lat * 1e5), round(lng * 1e5)
        for delta in (lat_i - lat_prev, lng_i - lng_prev):
            value = ~(delta << 1) if delta < 0 else delta << 1
            while value >= 0x20:
                result.append(chr((0x20 | (value & 0x1f)) + 63))
                value >>= 5
            result.append(chr(value + 63))
        lat_prev, lng_prev = lat_i, lng_i
    return "".join(result)


def decode_polyline(encoded: str) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    index = lat = lng = 0
    while index < len(encoded):
        values = []
        for _ in range(2):
            shift = value = 0
            while True:
                byte = ord(encoded[index]) - 63
                index += 1
                value |= (byte & 0x1f) << shift
                shift += 5
                if byte < 0x20:
                    break
            values.append(~(value >> 1) if value & 1 else value >> 1)
        lat += values[0]
        lng += values[1]
        points.append((lat / 1e5, lng / 1e5))
    return points


def interpolate_polyline(points: list[tuple[float, float]], fraction: float) -> tuple[float, float]:
    if not points:
        return 0.0, 0.0
    if len(points) == 1:
        return points[0]
    fraction = min(max(fraction, 0.0), 1.0)
    lengths = [math.dist(points[i], points[i + 1]) for i in range(len(points) - 1)]
    total = sum(lengths)
    if total == 0:
        return points[-1]
    remaining = total * fraction
    for i, length in enumerate(lengths):
        if remaining <= length or i == len(lengths) - 1:
            ratio = remaining / length if length else 0
            return (points[i][0] + (points[i + 1][0] - points[i][0]) * ratio,
                    points[i][1] + (points[i + 1][1] - points[i][1]) * ratio)
        remaining -= length
    return points[-1]


async def geocode(address: str) -> tuple[float, float]:
    if not GOOGLE_MAPS_API_KEY:
        raise RuntimeError("GOOGLE_MAPS_API_KEY is required for geocoding")
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get("https://maps.googleapis.com/maps/api/geocode/json", params={"address": address, "key": GOOGLE_MAPS_API_KEY})
        response.raise_for_status()
        data = response.json()
    if data.get("status") != "OK" or not data.get("results"):
        raise ValueError(f"Geocoding failed for {address}: {data.get('status')}")
    location = data["results"][0]["geometry"]["location"]
    return location["lat"], location["lng"]


async def get_route_matrix(points: list[tuple[float, float]]) -> list[list[float]]:
    """Return travel times in seconds; falls back to a deterministic local estimate."""
    if not 1 <= len(points) <= 20:
        raise ValueError("Route matrix supports between 1 and 20 points")
    if GOOGLE_MAPS_API_KEY:
        try:
            body = {
                "origins": [{"waypoint": {"location": {"latLng": {"latitude": lat, "longitude": lng}}}} for lat, lng in points],
                "destinations": [{"waypoint": {"location": {"latLng": {"latitude": lat, "longitude": lng}}}} for lat, lng in points],
                "travelMode": "DRIVE",
                "routingPreference": "TRAFFIC_AWARE",
            }
            headers = {"X-Goog-Api-Key": GOOGLE_MAPS_API_KEY, "X-Goog-FieldMask": "originIndex,destinationIndex,duration"}
            async with httpx.AsyncClient(timeout=20) as client:
                response = await client.post("https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix", json=body, headers=headers)
                response.raise_for_status()
                payload = response.json()
            result = [[0.0 for _ in points] for _ in points]
            for item in payload:
                duration = item.get("duration", "0s").removesuffix("s")
                result[item["originIndex"]][item["destinationIndex"]] = float(duration)
            return result
        except Exception as error:
            logger.warning("Google Routes API computeRouteMatrix failed (%s); falling back to local travel times", error)
    return [[0.0 if i == j else _haversine_km(a, b) / 28 * 3600 for j, b in enumerate(points)] for i, a in enumerate(points)]


async def get_route_polyline(origin: tuple[float, float], destination: tuple[float, float], waypoints: list[tuple[float, float]]) -> str:
    points = [origin, *waypoints, destination]
    if GOOGLE_MAPS_API_KEY:
        try:
            body = {
                "origin": {"location": {"latLng": {"latitude": origin[0], "longitude": origin[1]}}},
                "destination": {"location": {"latLng": {"latitude": destination[0], "longitude": destination[1]}}},
                "intermediates": [{"location": {"latLng": {"latitude": lat, "longitude": lng}}} for lat, lng in waypoints],
                "travelMode": "DRIVE",
                "routingPreference": "TRAFFIC_AWARE",
                "polylineQuality": "OVERVIEW",
            }
            headers = {"X-Goog-Api-Key": GOOGLE_MAPS_API_KEY, "X-Goog-FieldMask": "routes.polyline.encodedPolyline"}
            async with httpx.AsyncClient(timeout=20) as client:
                response = await client.post("https://routes.googleapis.com/directions/v2:computeRoutes", json=body, headers=headers)
                response.raise_for_status()
                data = response.json()
            routes = data.get("routes", [])
            if routes:
                return routes[0]["polyline"]["encodedPolyline"]
        except Exception as error:
            logger.warning("Google Routes API computeRoutes failed (%s); falling back to local polyline", error)
    return encode_polyline(points)



def _haversine_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    rad = math.pi / 180
    dlat, dlng = (b[0] - a[0]) * rad, (b[1] - a[1]) * rad
    x = math.sin(dlat / 2) ** 2 + math.cos(a[0] * rad) * math.cos(b[0] * rad) * math.sin(dlng / 2) ** 2
    return 6371 * 2 * math.atan2(math.sqrt(x), math.sqrt(1 - x))


def estimate_travel_seconds(a: tuple[float, float], b: tuple[float, float]) -> float:
    return _haversine_km(a, b) / 28 * 3600
