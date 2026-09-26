import { useState } from "react";
import { useRouteStore } from "../store/useRouteStore";
import { useLogisticsStore, seedParcels } from "../store/useLogisticsStore";
import { useWeather } from "../hooks/useWeather";
import type { ClientMessage } from "../types";

interface DisruptionsPageProps {
  sendMessage: (msg: ClientMessage) => void;
}

const DRIVER_NAMES = [
  "Rajesh Sharma",
  "Priya Meena",
  "Vikram Singh",
  "Sunita Verma",
  "Amit Choudhary",
  "Pooja Joshi",
  "Deepak Saini",
  "Kavita Rathore",
];

export default function DisruptionsPage({ sendMessage }: DisruptionsPageProps) {
  const vehicles = useRouteStore((s) => s.vehicles);
  const stops = useRouteStore((s) => s.stops);
  const currentSolution = useRouteStore((s) => s.currentSolution);
  const { parcels, accidentEvents, triggerAccident, clearAccidents, resolveAccident } =
    useLogisticsStore();
  const { weather, loading: weatherLoading } = useWeather("Jaipur");

  const [accidentAlert, setAccidentAlert] = useState<string | null>(null);
  const [weatherAlert, setWeatherAlert] = useState<string | null>(null);

  // Breakdown simulation
  const [breakdownVehicleId, setBreakdownVehicleId] = useState("");
  const activeVehicles = vehicles.filter((v) => v.status === "active");
  const sortedIds = [...vehicles.map((v) => v.id)].sort();

  // Traffic delay
  const activeSegments = (currentSolution?.routes ?? []).flatMap((r) => {
    const list: { from: string; to: string; label: string }[] = [];
    const stopIds = r.stopIds ?? [];
    if (stopIds.length > 0) {
      list.push({
        from: r.vehicleId,
        to: stopIds[0],
        label: `${r.vehicleId} → ${stopIds[0]}`,
      });
      for (let i = 0; i < stopIds.length - 1; i++) {
        list.push({
          from: stopIds[i],
          to: stopIds[i + 1],
          label: `${stopIds[i]} → ${stopIds[i + 1]}`,
        });
      }
    }
    return list;
  });

  const [segmentFrom, setSegmentFrom] = useState("");
  const [segmentTo, setSegmentTo] = useState("");
  const [multiplier, setMultiplier] = useState("2.0");

  const selectedSegmentIsActive =
    segmentFrom &&
    segmentTo &&
    activeSegments.some((s) => s.from === segmentFrom && s.to === segmentTo);

  // Meteorological Disruption simulation
  function simulateWeatherImpact(severity: "monsoon" | "fog") {
    if (activeSegments.length === 0) return;
    const target = activeSegments[Math.floor(Math.random() * activeSegments.length)];
    const mult = severity === "monsoon" ? 2.5 : 1.8;
    sendMessage({
      type: "trigger_traffic_delay",
      segmentFrom: target.from,
      segmentTo: target.to,
      multiplier: mult,
    });
    setWeatherAlert(
      severity === "monsoon"
        ? `Monsoon Downpour simulated on ${target.from} → ${target.to} (2.5x travel time). Re-routing in progress.`
        : `Dense Fog simulated on ${target.from} → ${target.to} (1.8x travel time). Safety buffers increased.`
    );
    setTimeout(() => setWeatherAlert(null), 7000);
  }

  // New order
  const [orderLat, setOrderLat] = useState("26.9157");
  const [orderLng, setOrderLng] = useState("75.8189");
  const [orderPriority, setOrderPriority] = useState<"normal" | "high">("high");
  const [orderDemand, setOrderDemand] = useState("1");

  function defaultTime(hoursAhead: number) {
    const d = new Date(Date.now() + hoursAhead * 3600 * 1000);
    return d.toISOString().slice(0, 16);
  }
  const [orderWindowStart] = useState(() => defaultTime(0.5));
  const [orderWindowEnd] = useState(() => defaultTime(4));

  // Window change
  const [windowStopId, setWindowStopId] = useState("");
  const [newStart] = useState(() => defaultTime(1));
  const [newEnd] = useState(() => defaultTime(3));

  function handleBreakdown() {
    if (!breakdownVehicleId) return;
    const vehicle = vehicles.find((v) => v.id === breakdownVehicleId);
    if (!vehicle) return;

    if (parcels.length === 0) {
      seedParcels(vehicles.map((v) => v.id));
    }

    const event = triggerAccident(
      breakdownVehicleId,
      vehicle.currentLat,
      vehicle.currentLng,
      vehicles
    );
    sendMessage({ type: "trigger_breakdown", vehicleId: breakdownVehicleId });

    if (event) {
      setAccidentAlert(
        `${breakdownVehicleId}: ${event.parcelsCount} parcels auto-reassigned to ${event.reassignedTo}`
      );
      setTimeout(() => setAccidentAlert(null), 6000);
    }
    setBreakdownVehicleId("");
  }

  return (
    <div className="disruptions-page">
      <div className="disruptions-header">
        <div className="disruptions-header__title">Disruption Control Center</div>
        <div className="disruptions-header__sub">Simulate and manage real-time fleet disruptions across Jaipur</div>
      </div>

      {accidentAlert && (
        <div className="disruptions-alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>{accidentAlert}</span>
          <button onClick={() => setAccidentAlert(null)}>&times;</button>
        </div>
      )}

      {weatherAlert && (
        <div className="disruptions-alert disruptions-alert--cyan">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
          </svg>
          <span>{weatherAlert}</span>
          <button onClick={() => setWeatherAlert(null)}>&times;</button>
        </div>
      )}

      <div className="disruptions-grid">
        {/* Vehicle Breakdown */}
        <div className="disr-card disr-card--danger">
          <div className="disr-card__icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div className="disr-card__title">Vehicle Breakdown / Accident</div>
          <div className="disr-card__desc">
            Trigger a breakdown. The nearest available vehicle will automatically pick up all parcels and continue the route.
          </div>
          <div className="disr-card__body">
            <select
              id="breakdown-vehicle"
              value={breakdownVehicleId}
              onChange={(e) => setBreakdownVehicleId(e.target.value)}
              className="disr-select"
            >
              <option value="">Select vehicle…</option>
              {activeVehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.id} · {DRIVER_NAMES[sortedIds.indexOf(v.id) % DRIVER_NAMES.length]}</option>
              ))}
            </select>
          </div>
          <button
            id="breakdown-trigger-btn"
            type="button"
            className="disr-btn disr-btn--danger"
            disabled={!breakdownVehicleId}
            onClick={handleBreakdown}
          >
            Trigger Breakdown
          </button>
        </div>

        {/* Traffic Delay */}
        <div className="disr-card disr-card--amber">
          <div className="disr-card__icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div className="disr-card__title">Traffic Delay</div>
          <div className="disr-card__desc">
            Apply a traffic multiplier to a route segment, forcing re-optimization.
          </div>
          <div className="disr-card__body">
            <select
              id="traffic-segment"
              value={segmentFrom && segmentTo ? `${segmentFrom}|${segmentTo}` : ""}
              onChange={(e) => {
                const [f, t] = e.target.value.split("|");
                setSegmentFrom(f || "");
                setSegmentTo(t || "");
              }}
              className="disr-select"
            >
              <option value="">Select route segment…</option>
              {activeSegments.map((s, idx) => (
                <option key={`${s.from}-${s.to}-${idx}`} value={`${s.from}|${s.to}`}>
                  {s.label}
                </option>
              ))}
            </select>
            <input
              id="traffic-multiplier"
              type="number"
              step="0.5"
              min="1"
              max="10"
              placeholder="Multiplier (e.g. 2.0)"
              value={multiplier}
              onChange={(e) => setMultiplier(e.target.value)}
              className="disr-input"
            />
          </div>
          <button
            id="apply-delay-btn"
            type="button"
            className="disr-btn disr-btn--amber"
            disabled={!selectedSegmentIsActive}
            onClick={() => {
              sendMessage({
                type: "trigger_traffic_delay",
                segmentFrom,
                segmentTo,
                multiplier: parseFloat(multiplier) || 1,
              });
            }}
          >
            Apply Traffic Delay
          </button>
        </div>

        {/* New Priority Order */}
        <div className="disr-card disr-card--blue">
          <div className="disr-card__icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
          </div>
          <div className="disr-card__title">New Priority Order</div>
          <div className="disr-card__desc">
            Add an urgent delivery order. The system will re-optimize routes immediately.
          </div>
          <div className="disr-card__body">
            <div className="disr-input-row">
              <input id="order-lat" placeholder="Lat (e.g. 26.9157)" inputMode="decimal" value={orderLat} onChange={(e) => setOrderLat(e.target.value)} className="disr-input" />
              <input id="order-lng" placeholder="Lng (e.g. 75.8189)" inputMode="decimal" value={orderLng} onChange={(e) => setOrderLng(e.target.value)} className="disr-input" />
            </div>
            <select id="order-priority" value={orderPriority} onChange={(e) => setOrderPriority(e.target.value as "normal" | "high")} className="disr-select">
              <option value="high">High priority</option>
              <option value="normal">Normal</option>
            </select>
            <input id="order-demand" placeholder="Demand units" inputMode="numeric" value={orderDemand} onChange={(e) => setOrderDemand(e.target.value)} className="disr-input" />
          </div>
          <button
            id="add-order-btn"
            type="button"
            className="disr-btn disr-btn--blue"
            disabled={!orderLat || !orderLng}
            onClick={() => {
              sendMessage({
                type: "trigger_new_order",
                stop: {
                  lat: parseFloat(orderLat),
                  lng: parseFloat(orderLng),
                  timeWindowStart: new Date(orderWindowStart).toISOString(),
                  timeWindowEnd: new Date(orderWindowEnd).toISOString(),
                  priority: orderPriority,
                  demand: parseInt(orderDemand, 10) || 1,
                },
              });
              setOrderLat(""); setOrderLng("");
            }}
          >
            Add Priority Order
          </button>
        </div>

        {/* Window Change */}
        <div className="disr-card disr-card--purple">
          <div className="disr-card__icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div className="disr-card__title">Delivery Window Change</div>
          <div className="disr-card__desc">
            Update the delivery time window for a specific stop location.
          </div>
          <div className="disr-card__body">
            <select
              id="window-stop"
              value={windowStopId}
              onChange={(e) => setWindowStopId(e.target.value)}
              className="disr-select"
            >
              <option value="">Select stop…</option>
              {stops.map((s) => (
                <option key={s.id} value={s.id}>{s.id}</option>
              ))}
            </select>
            <input id="window-start" type="datetime-local" defaultValue={newStart} className="disr-input" />
            <input id="window-end" type="datetime-local" defaultValue={newEnd} className="disr-input" />
          </div>
          <button
            id="update-window-btn"
            type="button"
            className="disr-btn disr-btn--purple"
            disabled={!windowStopId}
            onClick={() => {
              sendMessage({
                type: "trigger_window_change",
                stopId: windowStopId,
                newStart: new Date(newStart).toISOString(),
                newEnd: new Date(newEnd).toISOString(),
              });
            }}
          >
            Update Window
          </button>
        </div>

        {/* Weather Disruption Simulator */}
        <div className="disr-card disr-card--cyan">
          <div className="disr-card__icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
            </svg>
          </div>
          <div className="disr-card__title">Live Weather & Road Condition</div>
          <div className="disr-card__desc">
            Monitor real-time OpenWeatherMap data for Jaipur and simulate meteorological delays on active routes.
          </div>
          <div className="disr-card__body">
            {weather ? (
              <div className="disr-weather-snapshot">
                <div className="dws-row">
                  <img src={weather.iconUrl} alt={weather.description} className="dws-icon" width="28" height="28" />
                  <span className="dws-temp">{Math.round(weather.temp)}°C · {weather.condition}</span>
                  <span className={`dws-badge dws-badge--${weather.roadConditionClass}`}>{weather.roadCondition}</span>
                </div>
                <div className="dws-stats">
                  <span>Humidity: {weather.humidity}%</span>
                  <span>·</span>
                  <span>Wind: {weather.windSpeed} km/h</span>
                  <span>·</span>
                  <span>Visibility: {weather.visibility} km</span>
                </div>
                <div className="dws-advisory">{weather.fleetAdvisory}</div>
              </div>
            ) : (
              <div className="dws-loading">
                {weatherLoading ? "Connecting to OpenWeatherMap…" : "Weather data ready"}
              </div>
            )}
          </div>
          <div className="disr-weather-btn-row">
            <button
              id="simulate-monsoon-btn"
              type="button"
              className="disr-btn disr-btn--cyan"
              disabled={activeSegments.length === 0}
              onClick={() => simulateWeatherImpact("monsoon")}
            >
              Simulate Monsoon (2.5x Delay)
            </button>
            <button
              id="simulate-fog-btn"
              type="button"
              className="disr-btn disr-btn--slate"
              disabled={activeSegments.length === 0}
              onClick={() => simulateWeatherImpact("fog")}
            >
              Simulate Fog (1.8x Delay)
            </button>
          </div>
        </div>
      </div>

      {/* Accident event log */}
      {accidentEvents.length > 0 && (
        <div className="disruptions-log">
          <div className="disruptions-log__header">
            <span>INCIDENT LOG</span>
            <button className="disruptions-log__clear" onClick={clearAccidents}>Clear All</button>
          </div>
          {accidentEvents.map((evt) => (
            <div key={evt.id} className={`disruptions-log__item disruptions-log__item--${evt.status}`}>
              <div className="dli__row">
                <span className="dli__id">{evt.id}</span>
                <span className="dli__time">{new Date(evt.timestamp).toLocaleTimeString("en-IN")}</span>
                <span className={`dli__badge dli__badge--${evt.status}`}>{evt.status.toUpperCase()}</span>
              </div>
              <div className="dli__detail">
                {evt.vehicleId} breakdown · {evt.parcelsCount} parcels → {evt.reassignedTo}
              </div>
              <div className="dli__nearby">
                Nearby: {evt.nearbyVehicles.join(", ")}
              </div>
              {evt.status !== "resolved" && (
                <button
                  className="dli__resolve-btn"
                  onClick={() => resolveAccident(evt.id)}
                >
                  Mark Resolved
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
