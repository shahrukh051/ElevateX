import { useEffect, useMemo, useRef, useState } from "react";
import { APIProvider, AdvancedMarker, Map, useMap } from "@vis.gl/react-google-maps";
import { useRouteStore } from "../store/useRouteStore";
import type { Vehicle } from "../types";
import { getMapLayers, subscribeMapLayers } from "./MapLayers";

const VEHICLE_COLORS = [
  "#10b981", // teal-green  (V-01)
  "#f59e0b", // amber       (V-02)
  "#3b82f6", // blue        (V-03)
  "#ef4444", // red         (V-04)
  "#8b5cf6", // purple      (V-05)
  "#06b6d4", // cyan        (V-06)
  "#f97316", // orange      (V-07)
  "#84cc16", // lime        (V-08)
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

/** Assigns each vehicle a stable color for the whole session. */
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

/** Google Maps Polyline with route color */
function RoutePolyline({ path, color }: { path: LatLng[]; color: string }) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) return;
    const polyline = new google.maps.Polyline({
      map,
      strokeColor: color,
      strokeOpacity: 0.85,
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

/** Google Maps Vehicle marker with directional heading arrow and smooth animation */
function VehicleMarker({
  vehicle,
  color,
  isSelected,
  onClick,
}: {
  vehicle: Vehicle;
  color: string;
  isSelected?: boolean;
  onClick?: () => void;
}) {
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

    const durationMs = 900;
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

  const bearing = vehicle.bearing ?? 0;

  return (
    <AdvancedMarker position={renderPos} title={`Vehicle ${vehicle.id}`} zIndex={isSelected ? 30 : 15}>
      <div
        onClick={onClick}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          cursor: "pointer",
          transform: "translate(-50%, -50%)",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: vehicle.status === "active" ? color : "#64748b",
            boxShadow: `0 0 12px ${color}99`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `rotate(${bearing}deg)`,
            transition: "transform 0.3s ease",
            border: "2px solid #0b0f17",
          }}
        >
          {/* Directional navigation pointer */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff">
            <path d="M12 2L4 20l8-4 8 4L12 2z" />
          </svg>
        </div>
        <span
          style={{
            background: "rgba(11,15,23,0.9)",
            color: "#ffffff",
            fontSize: 9,
            fontWeight: 700,
            padding: "1px 5px",
            borderRadius: 3,
            marginTop: 2,
            border: `1px solid ${color}66`,
            whiteSpace: "nowrap",
          }}
        >
          {vehicle.id}
        </span>
      </div>
    </AdvancedMarker>
  );
}

export default function MapView() {
  const stops = useRouteStore((s) => s.stops);
  const vehicles = useRouteStore((s) => s.vehicles);
  const currentSolution = useRouteStore((s) => s.currentSolution);

  // Re-render whenever a MapLayers toggle changes
  const [layers, setLayers] = useState(getMapLayers());
  useEffect(() => {
    return subscribeMapLayers(() => setLayers(getMapLayers()));
  }, []);

  // Map mode: "vector" (custom high-fps SVG canvas) or "google" (Google Maps)
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined;
  const [mapMode, setMapMode] = useState<"vector" | "google">("vector");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const vehicleIds = useMemo(() => vehicles.map((v) => v.id), [vehicles]);
  const colors = useVehicleColors(vehicleIds);

  // Cache decoded paths by vehicleId+encoded string
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

  // Stable bounding box based on stops + vehicles so map canvas stays fixed
  const bounds = useMemo(() => {
    const pts = stops.length > 0
      ? stops.map((s) => ({ lat: s.lat, lng: s.lng }))
      : [{ lat: 26.9157, lng: 75.8189 }];
    const lats = pts.map((p) => p.lat);
    const lngs = pts.map((p) => p.lng);
    return {
      minLat: Math.min(...lats) - 0.015,
      maxLat: Math.max(...lats) + 0.015,
      minLng: Math.min(...lngs) - 0.018,
      maxLng: Math.max(...lngs) + 0.018,
    };
  }, [stops]);

  const xy = (lat: number, lng: number) => ({
    x: 35 + ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng || 1)) * 930,
    y: 535 - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat || 1)) * 505,
  });

  const defaultCenter = stops[0]
    ? { lat: stops[0].lat, lng: stops[0].lng }
    : { lat: 26.9157, lng: 75.8189 };

  // Filter stops based on disruptions layer
  const visibleStops = useMemo(() => {
    if (layers.disruptions) return stops;
    // Hide unassigned and priority stops if disruptions toggle is off
    return stops.filter((s) => s.priority !== "high" && !currentSolution?.unassignedStopIds?.includes(s.id));
  }, [stops, layers.disruptions, currentSolution]);

  // Mode switcher element
  const modeSwitcher = (
    <div className="map-mode-toggle">
      <button
        type="button"
        className={`map-mode-btn ${mapMode === "vector" ? "map-mode-btn--active" : ""}`}
        onClick={() => setMapMode("vector")}
        title="High-performance animated vector map"
      >
        ⚡ Dynamic Map
      </button>
      {apiKey && (
        <button
          type="button"
          className={`map-mode-btn ${mapMode === "google" ? "map-mode-btn--active" : ""}`}
          onClick={() => setMapMode("google")}
          title="Google Maps road layer"
        >
          🗺️ Google Maps
        </button>
      )}
    </div>
  );

  // Common Legend
  const legend = vehicles.length > 0 && (
    <div className="map-legend">
      <div className="map-legend__title">Active Fleet ({vehicles.length})</div>
      {vehicles.map((v) => (
        <div
          key={v.id}
          className="map-legend__row"
          style={{
            cursor: "pointer",
            opacity: selectedVehicleId && selectedVehicleId !== v.id ? 0.45 : 1,
            fontWeight: selectedVehicleId === v.id ? 700 : 500,
          }}
          onClick={() => setSelectedVehicleId(selectedVehicleId === v.id ? null : v.id)}
        >
          <span className="map-legend__line" style={{ background: colors[v.id] ?? "#10b981" }} />
          <span className="map-legend__label">{v.id}</span>
          <span style={{ fontSize: 9, color: "#64748b", marginLeft: "auto" }}>
            {v.status === "active" ? "RUNNING" : "STOPPED"}
          </span>
        </div>
      ))}
      <div
        className="map-legend__row"
        style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <span className="map-legend__dot" style={{ background: "#f59e0b" }} />
        <span className="map-legend__label" style={{ fontSize: 10 }}>Priority Delivery</span>
      </div>
      {currentSolution?.unassignedStopIds && currentSolution.unassignedStopIds.length > 0 && (
        <div className="map-legend__row">
          <span className="map-legend__dot" style={{ background: "#ef4444" }} />
          <span className="map-legend__label" style={{ fontSize: 10 }}>Unassigned Stop</span>
        </div>
      )}
    </div>
  );

  // 1. HIGH-PERFORMANCE DYNAMIC VECTOR MAP
  if (mapMode === "vector" || !apiKey) {
    return (
      <div className="map-view map-view--local" style={{ position: "relative" }}>
        {modeSwitcher}

        <svg viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Live delivery routes map">
          <defs>
            {/* Grid background */}
            <pattern id="route-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0H0V40" fill="none" stroke="#1c2635" strokeWidth="0.8" />
            </pattern>
            {/* Heatmap blur filter */}
            <filter id="heat-blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="10" />
            </filter>
          </defs>

          {/* Background grid */}
          <rect width="1000" height="560" fill="#0d131f" />
          <rect width="1000" height="560" fill="url(#route-grid)" />

          {/* Arterial city roads */}
          <path d="M-20 280 Q350 260 520 280 T1020 270" fill="none" stroke="#192332" strokeWidth="12" />
          <path d="M480 -20 Q500 240 510 380 T490 580" fill="none" stroke="#192332" strokeWidth="12" />
          <path d="M120 -20 Q320 180 500 320 T920 580" fill="none" stroke="#17202e" strokeWidth="8" />
          <path d="M880 -20 Q650 200 480 340 T80 580" fill="none" stroke="#17202e" strokeWidth="8" />

          {/* Heatmap layer (toggled via MapLayers) */}
          {layers.heatmap &&
            stops.map((stop) => {
              const pt = xy(stop.lat, stop.lng);
              const r = 24 + (stop.demand || 1) * 12;
              return (
                <circle
                  key={`heat-${stop.id}`}
                  cx={pt.x}
                  cy={pt.y}
                  r={r}
                  fill="url(#heat-grad)"
                  opacity="0.32"
                  filter="url(#heat-blur)"
                />
              );
            })}

          {/* Route polylines with animated directional dash flow */}
          {decodedRoutes.map((route) => {
            if (route.path.length <= 1) return null;
            const isDimmed = selectedVehicleId && selectedVehicleId !== route.vehicleId;
            const pts = route.path
              .map(({ lat, lng }) => {
                const pt = xy(lat, lng);
                return `${pt.x},${pt.y}`;
              })
              .join(" ");
            const color = colors[route.vehicleId] ?? "#10b981";

            return (
              <g key={route.vehicleId} opacity={isDimmed ? 0.2 : 1}>
                {/* Route halo */}
                <polyline
                  points={pts}
                  fill="none"
                  stroke={color}
                  strokeWidth="8"
                  opacity="0.22"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Main route track */}
                <polyline
                  points={pts}
                  fill="none"
                  stroke={color}
                  strokeWidth="3.2"
                  opacity="0.85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Directional animated flow dashes */}
                <polyline
                  points={pts}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1.8"
                  strokeDasharray="6 14"
                  strokeLinecap="round"
                  opacity="0.65"
                  className="flow-dash"
                />
              </g>
            );
          })}

          {/* Delivery stops */}
          {visibleStops.map((stop) => {
            const pt = xy(stop.lat, stop.lng);
            const isUnassigned = currentSolution?.unassignedStopIds?.includes(stop.id);
            const isHighPriority = stop.priority === "high";
            const stopColor = isUnassigned ? "#ef4444" : isHighPriority ? "#f59e0b" : "#3b4d66";

            return (
              <g key={stop.id} transform={`translate(${pt.x} ${pt.y})`}>
                {isHighPriority && (
                  <circle r="14" fill="#f59e0b" opacity="0.2">
                    <animate attributeName="r" values="10;18;10" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.3;0.05;0.3" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
                {isUnassigned && (
                  <circle r="14" fill="#ef4444" opacity="0.25">
                    <animate attributeName="r" values="10;20;10" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle
                  r={isHighPriority ? 9 : 7}
                  fill={stopColor}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}
                />
                <text
                  y="3"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="7.5"
                  fontWeight="700"
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {stop.id.slice(-2)}
                </text>
              </g>
            );
          })}

          {/* Vehicles running with live heading directions and radar pulse */}
          {vehicles.map((vehicle) => {
            const pt = xy(vehicle.currentLat, vehicle.currentLng);
            const color = colors[vehicle.id] ?? "#10b981";
            const isSelected = selectedVehicleId === vehicle.id;
            const bearing = vehicle.bearing ?? 0;

            return (
              <g
                key={vehicle.id}
                transform={`translate(${pt.x} ${pt.y})`}
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedVehicleId(isSelected ? null : vehicle.id)}
              >
                {/* Radar pulse ring for running vehicles */}
                {vehicle.status === "active" && (
                  <circle r="22" fill={color} opacity="0.18">
                    <animate attributeName="r" values="16;28;16" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.25;0.04;0.25" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Vehicle navigation body rotated according to heading */}
                <g transform={`rotate(${bearing})`}>
                  <circle
                    r="13"
                    fill="#0b0f17"
                    stroke={vehicle.status === "active" ? color : "#64748b"}
                    strokeWidth="2.5"
                    style={{ filter: `drop-shadow(0 0 6px ${color}88)` }}
                  />
                  {/* Direction arrow pointing forward */}
                  <path
                    d="M0 -9L6 6L0 3L-6 6Z"
                    fill={vehicle.status === "active" ? color : "#64748b"}
                  />
                </g>

                {/* Vehicle label badge */}
                <rect
                  x="-17"
                  y="16"
                  width="34"
                  height="16"
                  rx="4"
                  fill="rgba(11,15,23,0.92)"
                  stroke={color}
                  strokeWidth="0.8"
                />
                <text
                  y="27.5"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="9"
                  fontWeight="700"
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {vehicle.id}
                </text>
              </g>
            );
          })}
        </svg>

        {legend}
        <div className="map-view__local-note">
          ● JAIPUR LIVE FLEET · NIMS UNIVERSITY · SINDHI CAMP · RAILWAY STATION · GT MALL · WTP
        </div>
      </div>
    );
  }

  // 2. GOOGLE MAPS VIEW
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {modeSwitcher}

      <APIProvider apiKey={apiKey}>
        <Map
          className="map-view"
          defaultCenter={defaultCenter}
          defaultZoom={13}
          mapId={mapId || "DEMO_MAP_ID"}
          disableDefaultUI={false}
          gestureHandling="greedy"
          colorScheme="DARK"
        >
          {visibleStops.map((stop) => {
            const isUnassigned = currentSolution?.unassignedStopIds?.includes(stop.id);
            const isHigh = stop.priority === "high";
            const stopColor = isUnassigned ? "#ef4444" : isHigh ? "#f59e0b" : "#475569";

            return (
              <AdvancedMarker
                key={stop.id}
                position={{ lat: stop.lat, lng: stop.lng }}
                title={`${stop.id} (${stop.priority})`}
                zIndex={isHigh ? 20 : 10}
              >
                <div
                  style={{
                    width: isHigh ? 22 : 18,
                    height: isHigh ? 22 : 18,
                    borderRadius: "50%",
                    background: stopColor,
                    border: "2px solid #ffffff",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 8,
                    fontWeight: 700,
                  }}
                >
                  {stop.id.slice(-2)}
                </div>
              </AdvancedMarker>
            );
          })}

          {vehicles.map((vehicle) => (
            <VehicleMarker
              key={vehicle.id}
              vehicle={vehicle}
              color={colors[vehicle.id] ?? "#10b981"}
              isSelected={selectedVehicleId === vehicle.id}
              onClick={() =>
                setSelectedVehicleId(selectedVehicleId === vehicle.id ? null : vehicle.id)
              }
            />
          ))}

          {decodedRoutes.map((route) => (
            <RoutePolyline
              key={route.vehicleId}
              path={route.path}
              color={colors[route.vehicleId] ?? "#10b981"}
            />
          ))}
        </Map>

        {legend}
      </APIProvider>
    </div>
  );
}
