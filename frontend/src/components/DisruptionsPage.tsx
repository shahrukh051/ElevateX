import { useRouteStore } from "../store/useRouteStore";
import { useLogisticsStore, seedParcels } from "../store/useLogisticsStore";
import type { ClientMessage } from "../types";
import { useState } from "react";

const DRIVER_NAMES = [
  "Arjun Sharma", "Priya Meena", "Rakesh Kumawat",
  "Neha Yadav", "Imran Khan", "Kavita Saini",
  "Deepak Verma", "Sunita Joshi",
];

const VEHICLE_COLORS = [
  "#10b981", "#f59e0b", "#3b82f6", "#ef4444",
  "#8b5cf6", "#06b6d4", "#f97316", "#84cc16",
];

interface DisruptionsPageProps {
  sendMessage: (msg: ClientMessage) => void;
}

export default function DisruptionsPage({ sendMessage }: DisruptionsPageProps) {
  const vehicles = useRouteStore((s) => s.vehicles);
  const stops = useRouteStore((s) => s.stops);
  const currentSolution = useRouteStore((s) => s.currentSolution);
  const { parcels, accidentEvents, triggerAccident, resolveAccident, clearAccidents } =
    useLogisticsStore();

  const sortedIds = [...vehicles.map((v) => v.id)].sort();
  const activeVehicles = vehicles.filter((v) => v.status === "active");

  const activeSegments = (currentSolution?.routes ?? []).flatMap((route) => {
    if (!activeVehicles.some((v) => v.id === route.vehicleId)) return [];
    const chain = [route.vehicleId, ...route.stopIds];
    return chain.slice(0, -1).map((from, i) => ({ from, to: chain[i + 1] }));
  });

  // Breakdown
  const [breakdownVehicleId, setBreakdownVehicleId] = useState("");
  const [accidentAlert, setAccidentAlert] = useState<string | null>(null);

  // Traffic delay
  const [segmentFrom, setSegmentFrom] = useState("");
  const [segmentTo, setSegmentTo] = useState("");
  const [multiplier, setMultiplier] = useState("2.5");
  const selectedSegmentIsActive = activeSegments.some(
    (s) => s.from === segmentFrom && s.to === segmentTo
  );

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
          <span>⚠️</span>
          <span>{accidentAlert}</span>
          <button onClick={() => setAccidentAlert(null)}>✕</button>
        </div>
      )}

      <div className="disruptions-grid">
        {/* Vehicle Breakdown */}
        <div className="disr-card disr-card--danger">
          <div className="disr-card__icon">🚨</div>
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
            🚨 Trigger Breakdown
          </button>
        </div>

        {/* Traffic Delay */}
        <div className="disr-card disr-card--amber">
          <div className="disr-card__icon">🚦</div>
          <div className="disr-card__title">Traffic Delay</div>
          <div className="disr-card__desc">
            Apply a traffic multiplier to a route segment, forcing re-optimization.
          </div>
          <div className="disr-card__body">
            <select
              id="traffic-segment"
              value={`${segmentFrom}|${segmentTo}`}
              onChange={(e) => {
                const [from, to] = e.target.value.split("|");
                setSegmentFrom(from ?? "");
                setSegmentTo(to ?? "");
              }}
              className="disr-select"
            >
              <option value="|">Select route segment…</option>
              {activeSegments.map((seg, i) => (
                <option key={`${seg.from}-${seg.to}-${i}`} value={`${seg.from}|${seg.to}`}>
                  {seg.from} → {seg.to}
                </option>
              ))}
            </select>
            <input
              id="traffic-multiplier"
              placeholder="Multiplier (e.g. 2.5)"
              inputMode="decimal"
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
            🚦 Apply Traffic Delay
          </button>
        </div>

        {/* New Priority Order */}
        <div className="disr-card disr-card--blue">
          <div className="disr-card__icon">📦</div>
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
              <option value="high">⚡ High priority</option>
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
            📦 Add Priority Order
          </button>
        </div>

        {/* Window Change */}
        <div className="disr-card disr-card--purple">
          <div className="disr-card__icon">🕐</div>
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
            🕐 Update Window
          </button>
        </div>
      </div>

      {/* Accident event log */}
      {accidentEvents.length > 0 && (
        <div className="disruptions-log">
          <div className="disruptions-log__header">
            <span>📋 INCIDENT LOG</span>
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
