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
    if (!activeVehicles.some((vehicle) => vehicle.id === route.vehicleId)) return [];
    const chain = [route.vehicleId, ...route.stopIds];
    return chain.slice(0, -1).map((from, index) => ({ from, to: chain[index + 1] }));
  });

  // Breakdown
  const [breakdownVehicleId, setBreakdownVehicleId] = useState("");

  // New order
  const [orderLat, setOrderLat] = useState("");
  const [orderLng, setOrderLng] = useState("");
  const [orderPriority, setOrderPriority] = useState<"normal" | "high">("high");
  const [orderDemand, setOrderDemand] = useState("1");
  const [orderWindowStart, setOrderWindowStart] = useState("");
  const [orderWindowEnd, setOrderWindowEnd] = useState("");

  // Traffic delay
  const [segmentFrom, setSegmentFrom] = useState("");
  const [segmentTo, setSegmentTo] = useState("");
  const [multiplier, setMultiplier] = useState("2");
  const selectedSegmentIsActive = activeSegments.some((segment) => segment.from === segmentFrom && segment.to === segmentTo);

  // Window change
  const [windowStopId, setWindowStopId] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");

  return (
    <div className="event-controls">
      <h2>Disruptions</h2>

      <section className="event-controls__section">
        <h3>Vehicle breakdown</h3>
        <div className="event-controls__row">
          <select value={breakdownVehicleId} onChange={(e) => setBreakdownVehicleId(e.target.value)}>
            <option value="">Select vehicle…</option>
            {activeVehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.id}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!breakdownVehicleId}
            onClick={() => {
              sendMessage({ type: "trigger_breakdown", vehicleId: breakdownVehicleId });
              setBreakdownVehicleId("");
            }}
          >
            Trigger
          </button>
        </div>
      </section>

      <section className="event-controls__section">
        <h3>New priority order</h3>
        <div className="event-controls__grid">
          <input placeholder="Lat" inputMode="decimal" value={orderLat} onChange={(e) => setOrderLat(e.target.value)} />
          <input placeholder="Lng" inputMode="decimal" value={orderLng} onChange={(e) => setOrderLng(e.target.value)} />
          <input
            type="datetime-local"
            value={orderWindowStart}
            onChange={(e) => setOrderWindowStart(e.target.value)}
          />
          <input type="datetime-local" value={orderWindowEnd} onChange={(e) => setOrderWindowEnd(e.target.value)} />
          <select value={orderPriority} onChange={(e) => setOrderPriority(e.target.value as "normal" | "high")}>
            <option value="high">High priority</option>
          </select>
          <input placeholder="Demand" inputMode="numeric" value={orderDemand} onChange={(e) => setOrderDemand(e.target.value)} />
        </div>
        <button
          type="button"
          disabled={!orderLat || !orderLng || !orderWindowStart || !orderWindowEnd}
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
            setOrderLat("");
            setOrderLng("");
            setOrderWindowStart("");
            setOrderWindowEnd("");
          }}
        >
          Add order
        </button>
      </section>

      <section className="event-controls__section">
        <h3>Traffic delay</h3>
        <div className="event-controls__grid">
          <select value={`${segmentFrom}|${segmentTo}`} onChange={(e) => {
            const [from, to] = e.target.value.split("|");
            setSegmentFrom(from ?? ""); setSegmentTo(to ?? "");
          }}>
            <option value="|">Select an active route segment…</option>
            {activeSegments.map((segment, index) => (
              <option key={`${segment.from}-${segment.to}-${index}`} value={`${segment.from}|${segment.to}`}>
                {segment.from} → {segment.to}
              </option>
            ))}
          </select>
          <input placeholder="Multiplier" inputMode="decimal" value={multiplier} onChange={(e) => setMultiplier(e.target.value)} />
        </div>
        <button
          type="button"
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
      </section>

      <section className="event-controls__section">
        <h3>Delivery window change</h3>
        <div className="event-controls__grid">
          <select value={windowStopId} onChange={(e) => setWindowStopId(e.target.value)}>
            <option value="">Select stop…</option>
            {stops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id}
              </option>
            ))}
          </select>
          <input type="datetime-local" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
          <input type="datetime-local" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
        </div>
        <button
          type="button"
          disabled={!windowStopId || !newStart || !newEnd}
          onClick={() => {
            sendMessage({
              type: "trigger_window_change",
              stopId: windowStopId,
              newStart: new Date(newStart).toISOString(),
              newEnd: new Date(newEnd).toISOString(),
            });
          }}
        >
          Update window
        </button>
      </section>
    </div>
  );
}
