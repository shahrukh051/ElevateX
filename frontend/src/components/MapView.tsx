import { useEffect, useMemo, useRef, useState } from "react";
import { APIProvider, AdvancedMarker, Map, useMap } from "@vis.gl/react-google-maps";
import { useRouteStore } from "../store/useRouteStore";
import { useLogisticsStore, getDriverProfile } from "../store/useLogisticsStore";
import type { Vehicle } from "../types";
import { getMapLayers, subscribeMapLayers } from "./MapLayers";

const VEHICLE_COLORS = [
  "#10b981", // emerald (V-01)
  "#3b82f6", // blue    (V-02)
  "#8b5cf6", // purple  (V-03)
  "#f59e0b", // amber   (V-04)
  "#06b6d4", // cyan    (V-05)
  "#f97316", // orange  (V-06)
  "#ec4899", // pink    (V-07)
  "#14b8a6", // teal    (V-08)
];

type LatLng = { lat: number; lng: number };

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

function MapVehicleMarker({
  vehicle,
  color,
  isSelected,
  hasAccident,
  onClick,
}: {
  vehicle: Vehicle;
  color: string;
  isSelected?: boolean;
  hasAccident?: boolean;
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

    const durationMs = 850;
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

  const profile = getDriverProfile(vehicle.id);
  const bearing = vehicle.bearing ?? 0;

  return (
    <AdvancedMarker position={renderPos} title={`${profile.name} (${vehicle.id})`} zIndex={isSelected ? 40 : 20}>
      <div
        onClick={onClick}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          cursor: "pointer",
          transform: "translate(-50%, -50%)",
          filter: isSelected ? "drop-shadow(0 8px 16px rgba(0,0,0,0.25))" : "drop-shadow(0 2px 6px rgba(0,0,0,0.15))",
        }}
      >
        {/* Animated halo for accident or active */}
        {hasAccident && (
          <div
            style={{
              position: "absolute",
              width: 52,
              height: 52,
              borderRadius: "50%",
              backgroundColor: "rgba(239, 68, 68, 0.35)",
              animation: "pulse-red 1.2s infinite ease-out",
            }}
          />
        )}

        {/* Marker Circle with Driver Photo */}
        <div
          style={{
            position: "relative",
            width: isSelected ? 38 : 34,
            height: isSelected ? 38 : 34,
            borderRadius: "50%",
            border: `3px solid ${hasAccident ? "#ef4444" : color}`,
            backgroundColor: "#ffffff",
            overflow: "hidden",
            boxShadow: "0 3px 8px rgba(0,0,0,0.18)",
            transition: "all 0.2s ease",
          }}
        >
          <img
            src={profile.avatar}
            alt={profile.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />

          {/* Heading direction indicator */}
          <div
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              width: 14,
              height: 14,
              borderRadius: "50%",
              backgroundColor: hasAccident ? "#ef4444" : color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `rotate(${bearing}deg)`,
              border: "1.5px solid #ffffff",
            }}
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill="#ffffff">
              <path d="M12 2L4 20l8-4 8 4L12 2z" />
            </svg>
          </div>
        </div>

        {/* Vehicle Badge */}
        <div
          style={{
            backgroundColor: hasAccident ? "#ef4444" : "#0f172a",
            color: "#ffffff",
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 6px",
            borderRadius: 6,
            marginTop: 3,
            border: "1px solid rgba(255,255,255,0.4)",
            whiteSpace: "nowrap",
            boxShadow: "0 2px 4px rgba(0,0,0,0.12)",
          }}
        >
          {hasAccident ? `🚨 ${vehicle.id}` : vehicle.id}
        </div>
      </div>
    </AdvancedMarker>
  );
}

export default function MapView({ onSimulateAccident }: { onSimulateAccident?: (vehicleId: string) => void }) {
  const stops = useRouteStore((s) => s.stops);
  const vehicles = useRouteStore((s) => s.vehicles);
  const currentSolution = useRouteStore((s) => s.currentSolution);

  const [layers, setLayers] = useState(getMapLayers());
  useEffect(() => {
    return subscribeMapLayers(() => setLayers(getMapLayers()));
  }, []);

  const apiKey =
    (import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined)?.trim() ||
    "AIzaSyCuK2tdlCHHJGXf-JzvhSXOQf5aFckrFtw";
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined;
  const [mapMode, setMapMode] = useState<"vector" | "google">("google");

  const { selectedVehicleId, setSelectedVehicle, parcels, accidentEvents, reassignToVehicle } =
    useLogisticsStore();

  const vehicleIds = useMemo(() => vehicles.map((v) => v.id), [vehicles]);
  const colors = useVehicleColors(vehicleIds);

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
    x: 40 + ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng || 1)) * 920,
    y: 530 - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat || 1)) * 490,
  });

  const defaultCenter = stops[0]
    ? { lat: stops[0].lat, lng: stops[0].lng }
    : { lat: 26.9157, lng: 75.8189 };

  const visibleStops = useMemo(() => {
    if (layers.disruptions) return stops;
    return stops.filter((s) => s.priority !== "high" && !currentSolution?.unassignedStopIds?.includes(s.id));
  }, [stops, layers.disruptions, currentSolution]);

  // Selected vehicle details for floating popover (Inspired by Image 1 & 2)
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
  const selectedProfile = selectedVehicle ? getDriverProfile(selectedVehicle.id) : null;
  const selectedParcels = parcels.filter((p) => p.vehicleId === selectedVehicleId);
  const activeAccident = accidentEvents.find(
    (e) => e.vehicleId === selectedVehicleId && e.status !== "resolved"
  );

  // Switcher UI
  const modeSwitcher = (
    <div className="map-mode-pill-bar">
      <button
        type="button"
        className={`map-mode-pill ${mapMode === "google" ? "map-mode-pill--active" : ""}`}
        onClick={() => setMapMode("google")}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
          <line x1="8" y1="2" x2="8" y2="18"/>
          <line x1="16" y1="6" x2="16" y2="22"/>
        </svg>
        Google Maps
      </button>
      <button
        type="button"
        className={`map-mode-pill ${mapMode === "vector" ? "map-mode-pill--active" : ""}`}
        onClick={() => setMapMode("vector")}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        Vector Canvas
      </button>
    </div>
  );

  // Floating Driver / Vehicle Popover on Map (Image 1 & Image 2)
  const floatingVehicleCard = selectedVehicle && selectedProfile && (
    <div className={`map-floating-popup ${activeAccident ? "map-floating-popup--accident" : ""}`}>
      {/* Header with Close */}
      <div className="mfp-header">
        <div className="mfp-driver">
          <div className="mfp-avatar-wrap">
            <img src={selectedProfile.avatar} alt={selectedProfile.name} className="mfp-avatar" />
            <span className={`mfp-online-dot ${activeAccident ? "mfp-online-dot--danger" : ""}`} />
          </div>
          <div className="mfp-info">
            <div className="mfp-name-row">
              <h4 className="mfp-name">{selectedProfile.name}</h4>
              <span className="mfp-id-tag">{selectedVehicle.id}</span>
            </div>
            <p className="mfp-sub">
              {activeAccident ? "🚨 Accident Reported" : "Online · Active Route"} · ⭐ {selectedProfile.rating}
            </p>
          </div>
        </div>
        <div className="mfp-actions-top">
          <a
            href={`tel:${selectedProfile.phone}`}
            className="mfp-call-btn"
            title={`Call driver: ${selectedProfile.phone}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </a>
          <button
            className="mfp-close-btn"
            onClick={() => setSelectedVehicle(null)}
            title="Close card"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Vehicle specs row */}
      <div className="mfp-vehicle-row">
        <div className="mfp-vehicle-detail">
          <span className="mfp-vlabel">Vehicle</span>
          <span className="mfp-vval">{selectedProfile.vehicleType}</span>
        </div>
        <div className="mfp-vehicle-detail">
          <span className="mfp-vlabel">Plate</span>
          <span className="mfp-vval">{selectedProfile.plate}</span>
        </div>
        <div className="mfp-vehicle-detail">
          <span className="mfp-vlabel">Parcels</span>
          <span className="mfp-vval">{selectedParcels.length} Items</span>
        </div>
      </div>

      {/* Route Location info */}
      <div className="mfp-route-row">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span className="mfp-loc-text">
          Near {selectedProfile.destHub}, Jaipur
        </span>
      </div>

      {/* ACCIDENT DETECTED DISPATCH ALERT (Requirement: nearest vehicle auto transfer) */}
      {activeAccident ? (
        <div className="mfp-accident-box">
          <div className="mfp-accident-header">
            <span className="mfp-accident-badge">🚨 Collision / Breakdown</span>
            <span className="mfp-accident-time">Just now</span>
          </div>
          <p className="mfp-accident-desc">
            Vehicle has broken down. <strong>{activeAccident.parcelsCount} parcels</strong> need immediate transfer to a nearby partner to prevent delivery delays.
          </p>

          {/* 4 Nearby Vehicles Ranking */}
          <div className="mfp-candidates-list">
            <div className="mfp-candidates-title">
              <span>Nearby Delivery Partners ({activeAccident.nearbyCandidates?.length || 0})</span>
              <span className="mfp-auto-tag">Auto-Calculated</span>
            </div>
            {activeAccident.nearbyCandidates?.map((candidate, idx) => (
              <div
                key={candidate.id}
                className={`mfp-candidate-item ${idx === 0 ? "mfp-candidate-item--recommended" : ""}`}
              >
                <img src={candidate.avatar} alt={candidate.name} className="mfp-cand-img" />
                <div className="mfp-cand-info">
                  <div className="mfp-cand-top">
                    <span className="mfp-cand-name">{candidate.name}</span>
                    <span className="mfp-cand-id">{candidate.id}</span>
                  </div>
                  <span className="mfp-cand-dist">
                    📍 {candidate.distanceKm} km away · {candidate.vehicleType}
                  </span>
                </div>
                {idx === 0 ? (
                  <span className="mfp-best-badge">Nearest ⚡</span>
                ) : (
                  <button
                    className="mfp-assign-btn"
                    onClick={() => reassignToVehicle(selectedVehicle.id, candidate.id)}
                  >
                    Select
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Quick Auto-Dispatch to Nearest Button */}
          {activeAccident.reassignedTo && (
            <button
              className="mfp-auto-dispatch-btn"
              onClick={() => reassignToVehicle(selectedVehicle.id, activeAccident.reassignedTo!)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              Auto-Transfer Parcels to Nearest ({activeAccident.reassignedTo})
            </button>
          )}
        </div>
      ) : (
        /* Normal State: Quick Breakdown Trigger button */
        <div className="mfp-actions-footer">
          <button
            className="mfp-trigger-breakdown-btn"
            onClick={() => onSimulateAccident && onSimulateAccident(selectedVehicle.id)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Simulate Breakdown / Accident
          </button>
        </div>
      )}
    </div>
  );

  // 1. HIGH RESOLUTION VECTOR MAP (Clean Modern Light Theme inspired by Image 1 & 4)
  if (mapMode === "vector" || !apiKey) {
    return (
      <div className="map-view-wrapper">
        {modeSwitcher}
        {floatingVehicleCard}

        <svg
          viewBox="0 0 1000 560"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Jaipur Live Logistics Map"
          className="map-vector-svg"
        >
          <defs>
            <pattern id="light-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0H0V40" fill="none" stroke="#e2e8f0" strokeWidth="0.75" />
            </pattern>
          </defs>

          {/* Light modern map canvas */}
          <rect width="1000" height="560" fill="#f8fafc" />
          <rect width="1000" height="560" fill="url(#light-grid)" />

          {/* Jaipur River / Water body */}
          <path
            d="M-50 490 Q220 440 450 470 T1050 480"
            fill="none"
            stroke="#bae6fd"
            strokeWidth="38"
            opacity="0.8"
          />

          {/* Jaipur Green Parks */}
          <rect x="180" y="80" width="140" height="90" rx="12" fill="#dcfce7" opacity="0.75" />
          <rect x="680" y="280" width="160" height="110" rx="16" fill="#dcfce7" opacity="0.75" />
          <rect x="420" y="320" width="90" height="70" rx="8" fill="#dcfce7" opacity="0.7" />

          {/* Major arterial roads (Jaipur highways) */}
          <path d="M-20 280 Q350 260 520 280 T1020 270" fill="none" stroke="#cbd5e1" strokeWidth="14" />
          <path d="M480 -20 Q500 240 510 380 T490 580" fill="none" stroke="#cbd5e1" strokeWidth="14" />
          <path d="M120 -20 Q320 180 500 320 T920 580" fill="none" stroke="#e2e8f0" strokeWidth="10" />
          <path d="M880 -20 Q650 200 480 340 T80 580" fill="none" stroke="#e2e8f0" strokeWidth="10" />

          {/* Road centerlines */}
          <path d="M-20 280 Q350 260 520 280 T1020 270" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="8 6" />
          <path d="M480 -20 Q500 240 510 380 T490 580" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="8 6" />

          {/* Routes */}
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
              <g key={route.vehicleId} opacity={isDimmed ? 0.25 : 1}>
                <polyline
                  points={pts}
                  fill="none"
                  stroke={color}
                  strokeWidth="8"
                  opacity="0.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points={pts}
                  fill="none"
                  stroke={color}
                  strokeWidth="3.5"
                  opacity="0.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points={pts}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1.8"
                  strokeDasharray="6 14"
                  strokeLinecap="round"
                  opacity="0.75"
                  className="flow-dash"
                />
              </g>
            );
          })}

          {/* Delivery Stops */}
          {visibleStops.map((stop) => {
            const pt = xy(stop.lat, stop.lng);
            const isUnassigned = currentSolution?.unassignedStopIds?.includes(stop.id);
            const isHighPriority = stop.priority === "high";
            const stopColor = isUnassigned ? "#ef4444" : isHighPriority ? "#f59e0b" : "#64748b";

            return (
              <g key={stop.id} transform={`translate(${pt.x} ${pt.y})`}>
                <circle
                  r={isHighPriority ? 9 : 7}
                  fill={stopColor}
                  stroke="#ffffff"
                  strokeWidth="2"
                  filter="drop-shadow(0 2px 4px rgba(0,0,0,0.15))"
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

          {/* Vehicles */}
          {vehicles.map((vehicle) => {
            const pt = xy(vehicle.currentLat, vehicle.currentLng);
            const color = colors[vehicle.id] ?? "#10b981";
            const isSelected = selectedVehicleId === vehicle.id;
            const hasAccident = accidentEvents.some(
              (e) => e.vehicleId === vehicle.id && e.status !== "resolved"
            );
            const bearing = vehicle.bearing ?? 0;

            return (
              <g
                key={vehicle.id}
                transform={`translate(${pt.x} ${pt.y})`}
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedVehicle(isSelected ? null : vehicle.id)}
              >
                {/* Radar pulse for active */}
                {vehicle.status === "active" && !hasAccident && (
                  <circle r="22" fill={color} opacity="0.18">
                    <animate attributeName="r" values="16;28;16" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.25;0.04;0.25" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Accident Pulse */}
                {hasAccident && (
                  <circle r="26" fill="#ef4444" opacity="0.3">
                    <animate attributeName="r" values="18;34;18" dur="1.2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;0.05;0.4" dur="1.2s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Vehicle body */}
                <g transform={`rotate(${bearing})`}>
                  <circle
                    r="15"
                    fill="#ffffff"
                    stroke={hasAccident ? "#ef4444" : color}
                    strokeWidth="3"
                    style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.18))" }}
                  />
                  <path
                    d="M0 -10L6 6L0 3L-6 6Z"
                    fill={hasAccident ? "#ef4444" : color}
                  />
                </g>

                {/* Badge Label */}
                <rect
                  x="-19"
                  y="18"
                  width="38"
                  height="16"
                  rx="4"
                  fill={hasAccident ? "#ef4444" : "#0f172a"}
                />
                <text
                  y="29.5"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="9"
                  fontWeight="700"
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {hasAccident ? `! ${vehicle.id}` : vehicle.id}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // 2. GOOGLE MAPS VIEW (Light Theme)
  return (
    <div className="map-view-wrapper">
      {modeSwitcher}
      {floatingVehicleCard}

      <APIProvider apiKey={apiKey}>
        <Map
          className="map-view"
          defaultCenter={defaultCenter}
          defaultZoom={13}
          mapId={mapId || "DEMO_MAP_ID"}
          disableDefaultUI={false}
          gestureHandling="greedy"
          colorScheme="LIGHT"
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
                    boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
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

          {vehicles.map((vehicle) => {
            const hasAccident = accidentEvents.some(
              (e) => e.vehicleId === vehicle.id && e.status !== "resolved"
            );
            return (
              <MapVehicleMarker
                key={vehicle.id}
                vehicle={vehicle}
                color={colors[vehicle.id] ?? "#10b981"}
                isSelected={selectedVehicleId === vehicle.id}
                hasAccident={hasAccident}
                onClick={() =>
                  setSelectedVehicle(selectedVehicleId === vehicle.id ? null : vehicle.id)
                }
              />
            );
          })}

          {decodedRoutes.map((route) => (
            <RoutePolyline
              key={route.vehicleId}
              path={route.path}
              color={colors[route.vehicleId] ?? "#10b981"}
            />
          ))}
        </Map>
      </APIProvider>
    </div>
  );
}
