import { useState } from "react";
import { useRouteStore } from "../store/useRouteStore";
import type { ClientMessage } from "../types";

interface EventControlsProps {
  sendMessage: (message: ClientMessage) => void;
}

export default function EventControls({ sendMessage }: EventControlsProps) {
  const vehicles = useRouteStore((s) => s.vehicles);
  const stops = useRouteStore((s) => s.stops);
  const currentSolution = useRouteStore((s) => s.currentSolution);

  const activeVehicles = vehicles.filter((v) => v.status === "active");
  const activeSegments = (currentSolution?.routes ?? []).flatMap((route) => {
    if (!activeVehicles.some((v) => v.id === route.vehicleId)) return [];
    const chain = [route.vehicleId, ...route.stopIds];
    return chain.slice(0, -1).map((from, i) => ({ from, to: chain[i + 1] }));
  });

function defaultTime(hoursAhead: number) {
  const d = new Date(Date.now() + hoursAhead * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}

  // Breakdown
  const [breakdownVehicleId, setBreakdownVehicleId] = useState("");

  // New order
  const [orderLat, setOrderLat] = useState("26.9157");
  const [orderLng, setOrderLng] = useState("75.8189");
  const [orderPriority, setOrderPriority] = useState<"normal" | "high">("high");
  const [orderDemand, setOrderDemand] = useState("1");
  const [orderWindowStart, setOrderWindowStart] = useState(() => defaultTime(0.5));
  const [orderWindowEnd, setOrderWindowEnd] = useState(() => defaultTime(4));

  // Traffic delay
  const [segmentFrom, setSegmentFrom] = useState("");
  const [segmentTo, setSegmentTo] = useState("");
  const [multiplier, setMultiplier] = useState("2.5");
  const selectedSegmentIsActive = activeSegments.some(
    (s) => s.from === segmentFrom && s.to === segmentTo
  );

  // Window change
  const [windowStopId, setWindowStopId] = useState("");
  const [newStart, setNewStart] = useState(() => defaultTime(1));
  const [newEnd, setNewEnd] = useState(() => defaultTime(3));

  return (
    <div className="event-controls">

      {/* ── Vehicle breakdown ── */}
      <div className="event-controls__section">
        <div className="event-controls__section-title">
          <svg className="ec-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Vehicle breakdown
        </div>
        <div className="event-controls__row">
          <select
            id="breakdown-vehicle"
            value={breakdownVehicleId}
            onChange={(e) => setBreakdownVehicleId(e.target.value)}
          >
            <option value="">Select vehicle…</option>
            {activeVehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.id}</option>
            ))}
          </select>
        </div>
        <button
          id="breakdown-trigger-btn"
          type="button"
          className="ec-btn ec-btn--danger"
          disabled={!breakdownVehicleId}
          onClick={() => {
            sendMessage({ type: "trigger_breakdown", vehicleId: breakdownVehicleId });
            setBreakdownVehicleId("");
          }}
        >
          Trigger
        </button>
      </div>

      {/* ── New priority order ── */}
      <div className="event-controls__section">
        <div className="event-controls__section-title">
          <svg className="ec-icon" style={{ color: "var(--accent-info)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          New Priority Order
        </div>
        <div className="event-controls__grid">
          <input id="order-lat" placeholder="Lat" inputMode="decimal" value={orderLat} onChange={(e) => setOrderLat(e.target.value)} />
          <input id="order-lng" placeholder="Lng" inputMode="decimal" value={orderLng} onChange={(e) => setOrderLng(e.target.value)} />
          <input id="order-start" type="datetime-local" value={orderWindowStart} onChange={(e) => setOrderWindowStart(e.target.value)} />
          <input id="order-end"   type="datetime-local" value={orderWindowEnd}   onChange={(e) => setOrderWindowEnd(e.target.value)} />
          <select id="order-priority" value={orderPriority} onChange={(e) => setOrderPriority(e.target.value as "normal" | "high")}>
            <option value="high">High priority</option>
            <option value="normal">Normal</option>
          </select>
          <input id="order-demand" placeholder="Demand" inputMode="numeric" value={orderDemand} onChange={(e) => setOrderDemand(e.target.value)} />
        </div>
        <button
          id="add-order-btn"
          type="button"
          className="ec-btn ec-btn--primary"
          disabled={!orderLat || !orderLng || !orderWindowStart || !orderWindowEnd}
          onClick={() => {
            sendMessage({
              type: "trigger_new_order",
              stop: {
                lat: parseFloat(orderLat),
                lng: parseFloat(orderLng),
                timeWindowStart: new Date(orderWindowStart).toISOString(),
                timeWindowEnd:   new Date(orderWindowEnd).toISOString(),
                priority: orderPriority,
                demand: parseInt(orderDemand, 10) || 1,
              },
            });
            setOrderLat(""); setOrderLng(""); setOrderWindowStart(""); setOrderWindowEnd("");
          }}
        >
          Add order
        </button>
      </div>

      {/* ── Traffic delay ── */}
      <div className="event-controls__section">
        <div className="event-controls__section-title">
          <svg className="ec-icon" style={{ color: "var(--accent-alert)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          Traffic delay
        </div>
        <div className="event-controls__grid">
          <select
            id="traffic-segment"
            style={{ gridColumn: "1/-1" }}
            value={`${segmentFrom}|${segmentTo}`}
            onChange={(e) => {
              const [from, to] = e.target.value.split("|");
              setSegmentFrom(from ?? "");
              setSegmentTo(to ?? "");
            }}
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
            placeholder="Multiplier"
            inputMode="decimal"
            value={multiplier}
            onChange={(e) => setMultiplier(e.target.value)}
          />
        </div>
        <button
          id="apply-delay-btn"
          type="button"
          className="ec-btn ec-btn--primary"
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
          Apply delay
        </button>
      </div>

      {/* ── Delivery window change ── */}
      <div className="event-controls__section">
        <div className="event-controls__section-title">
          <svg className="ec-icon" style={{ color: "var(--accent-purple)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Window change
        </div>
        <div className="event-controls__grid">
          <select
            id="window-stop"
            style={{ gridColumn: "1/-1" }}
            value={windowStopId}
            onChange={(e) => setWindowStopId(e.target.value)}
          >
            <option value="">Select stop…</option>
            {stops.map((s) => (
              <option key={s.id} value={s.id}>{s.id}</option>
            ))}
          </select>
          <input id="window-start" type="datetime-local" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
          <input id="window-end"   type="datetime-local" value={newEnd}   onChange={(e) => setNewEnd(e.target.value)} />
        </div>
        <button
          id="update-window-btn"
          type="button"
          className="ec-btn ec-btn--primary"
          disabled={!windowStopId || !newStart || !newEnd}
          onClick={() => {
            sendMessage({
              type: "trigger_window_change",
              stopId: windowStopId,
              newStart: new Date(newStart).toISOString(),
              newEnd:   new Date(newEnd).toISOString(),
            });
          }}
        >
          Update window
        </button>
      </div>

    </div>
  );
}
