import { useEffect, useMemo, useRef, useState } from "react";
import { APIProvider, AdvancedMarker, Map, Pin, useMap } from "@vis.gl/react-google-maps";
import { useRouteStore } from "../store/useRouteStore";
import type { Vehicle } from "../types";

const VEHICLE_COLORS = [
  "#46D1B4",
  "#F2A93B",
  "#5B8DEF",
  "#F0555A",
  "#B084F2",
  "#5FD1F2",
  "#E68A5C",
  "#8ADB6B",
];

type LatLng = { lat: number; lng: number };

/** Decodes a Google encoded polyline string into a list of lat/lng points. */
function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

/** Assigns each vehicle a stable color for the whole session, independent of array order. */
function useVehicleColors(vehicleIds: string[]): Record<string, string> {
  const key = [...vehicleIds].sort().join(",");
  return useMemo(() => {
    const sorted = [...vehicleIds].sort();
    const map: Record<string, string> = {};
    sorted.forEach((id, i) => {
      map[id] = VEHICLE_COLORS[i % VEHICLE_COLORS.length];
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

/**
 * Imperative Google Maps Polyline kept in sync with `path`. Mutates the existing
 * polyline via setPath instead of recreating it, and only re-runs when this
 * vehicle's own path reference changes (see decodedRoutes memoization below),
 * so an unrelated vehicle's route redraw never touches this one.
 */
function RoutePolyline({ path, color }: { path: LatLng[]; color: string }) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) return;
    const polyline = new google.maps.Polyline({
      map,
      strokeColor: color,
      strokeOpacity: 0.9,
      strokeWeight: 4,
    });
    polylineRef.current = polyline;
    return () => polyline.setMap(null);
  }, [map, color]);

  useEffect(() => {
    polylineRef.current?.setPath(path);
  }, [path]);

  return null;
}

/** Vehicle marker that eases toward each new position instead of snapping to it. */
function VehicleMarker({ vehicle, color }: { vehicle: Vehicle; color: string }) {
  const [renderPos, setRenderPos] = useState<LatLng>({
    lat: vehicle.currentLat,
    lng: vehicle.currentLng,
  });
  const fromRef = useRef(renderPos);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = { lat: vehicle.currentLat, lng: vehicle.currentLng };
    if (from.lat === to.lat && from.lng === to.lng) return;

    const durationMs = 800;
    const start = performance.now();
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setRenderPos({
        lat: from.lat + (to.lat - from.lat) * eased,
        lng: from.lng + (to.lng - from.lng) * eased,
      });
      if (t < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = to;
      }
    };
    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [vehicle.currentLat, vehicle.currentLng]);

  return (
    <AdvancedMarker position={renderPos} title={`Vehicle ${vehicle.id}`} zIndex={10}>
      <Pin
        background={vehicle.status === "unavailable" ? "#3A4356" : color}
        borderColor="#0B0F17"
        glyphColor="#0B0F17"
      />
    </AdvancedMarker>
  );
}

export default function MapView() {
  const stops = useRouteStore((s) => s.stops);
  const vehicles = useRouteStore((s) => s.vehicles);
  const currentSolution = useRouteStore((s) => s.currentSolution);

  const vehicleIds = useMemo(() => vehicles.map((v) => v.id), [vehicles]);
  const colors = useVehicleColors(vehicleIds);

  // Cache decoded paths by vehicleId+encoded string so an unchanged route keeps
  // the exact same array reference across renders, and only a truly changed
  // route triggers RoutePolyline's setPath effect.
  const decodedCacheRef = useRef<Record<string, { encoded: string; path: LatLng[] }>>({});
  const decodedRoutes = useMemo(() => {
    if (!currentSolution) return [];
    return currentSolution.routes.map((route) => {
      const cached = decodedCacheRef.current[route.vehicleId];
      if (cached && cached.encoded === route.polyline) {
        return { vehicleId: route.vehicleId, path: cached.path };
      }
      const path = decodePolyline(route.polyline);
      decodedCacheRef.current[route.vehicleId] = { encoded: route.polyline, path };
      return { vehicleId: route.vehicleId, path };
    });
  }, [currentSolution]);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined;

  const defaultCenter = stops[0]
    ? { lat: stops[0].lat, lng: stops[0].lng }
    : { lat: 26.9124, lng: 75.7873 }; // Jaipur, used only until stops arrive

  if (!apiKey) {
    const allPoints = [
      ...stops.map((stop) => ({ lat: stop.lat, lng: stop.lng })),
      ...vehicles.map((vehicle) => ({ lat: vehicle.currentLat, lng: vehicle.currentLng })),
    ];
    const minLat = Math.min(...allPoints.map((point) => point.lat)) - 0.004;
    const maxLat = Math.max(...allPoints.map((point) => point.lat)) + 0.004;
    const minLng = Math.min(...allPoints.map((point) => point.lng)) - 0.005;
    const maxLng = Math.max(...allPoints.map((point) => point.lng)) + 0.005;
    const xy = (lat: number, lng: number) => ({
      x: 30 + (lng - minLng) / (maxLng - minLng || 1) * 940,
      y: 530 - (lat - minLat) / (maxLat - minLat || 1) * 500,
    });
    return (
      <div className="map-view map-view--local">
        <svg viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Live delivery routes map">
          <defs><pattern id="route-grid" width="42" height="42" patternUnits="userSpaceOnUse"><path d="M42 0H0V42" fill="none" stroke="#263445" strokeWidth=".8" /></pattern></defs>
          <rect width="1000" height="560" fill="url(#route-grid)" />
          {Array.from({ length: 5 }, (_, i) => <path key={`road-${i}`} d={`M${i * 230 - 40} 550C${i * 220 + 110} 390 ${i * 180 - 30} 240 ${i * 220 + 80} 10`} fill="none" stroke="#263548" strokeWidth="7" opacity=".65" />)}
          {decodedRoutes.map((route) => route.path.length > 1 && <polyline key={route.vehicleId} points={route.path.map(({ lat, lng }) => { const point = xy(lat, lng); return `${point.x},${point.y}`; }).join(" ")} fill="none" stroke={colors[route.vehicleId] ?? "#46D1B4"} strokeWidth="3.4" strokeLinejoin="round" strokeLinecap="round" opacity=".85" />)}
          {stops.map((stop) => { const point = xy(stop.lat, stop.lng); const isUnassigned = currentSolution?.unassignedStopIds?.includes(stop.id); return <g key={stop.id} transform={`translate(${point.x} ${point.y})`}>
            <circle r="10" fill={isUnassigned ? "#F0555A" : stop.priority === "high" ? "#F2A93B" : "#33445A"} stroke="#e7edf7" strokeWidth="1.5" />
            <text y="3.5" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="700">{stop.id.slice(-2)}</text>
          </g>; })}
          {vehicles.map((vehicle) => { const point = xy(vehicle.currentLat, vehicle.currentLng); return <g key={vehicle.id} transform={`translate(${point.x} ${point.y})`}>
            <circle r="15" fill={colors[vehicle.id] ?? "#46D1B4"} opacity=".14" />
            <path d="M0 -10L8 7L0 4L-8 7Z" fill={vehicle.status === "active" ? colors[vehicle.id] : "#66758a"} stroke="#0b0f17" strokeWidth="2" />
            <text x="11" y="4" fill="#e4ebf4" fontSize="10" fontWeight="700">{vehicle.id}</text>
          </g>; })}
        </svg>
        <div className="map-view__local-note">LOCAL ROUTE VIEW · set a Maps key for the road basemap</div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        className="map-view"
        defaultCenter={defaultCenter}
        defaultZoom={12}
        mapId={mapId || undefined}
        disableDefaultUI={false}
        gestureHandling="greedy"
        colorScheme="DARK"
      >
        {stops.map((stop) => (
          <AdvancedMarker key={stop.id} position={{ lat: stop.lat, lng: stop.lng }} title={stop.id}>
            <Pin
              background={stop.priority === "high" ? "#F0555A" : "#8B98AC"}
              borderColor="#0B0F17"
              glyphColor="#0B0F17"
              scale={stop.priority === "high" ? 1.05 : 0.85}
            />
          </AdvancedMarker>
        ))}

        {vehicles.map((vehicle) => (
          <VehicleMarker key={vehicle.id} vehicle={vehicle} color={colors[vehicle.id] ?? "#46D1B4"} />
        ))}

        {decodedRoutes.map((route) => (
          <RoutePolyline
            key={route.vehicleId}
            path={route.path}
            color={colors[route.vehicleId] ?? "#46D1B4"}
          />
        ))}
      </Map>
    </APIProvider>
  );
}
