import { useMemo } from "react";
import { useRouteStore } from "../store/useRouteStore";

const VEHICLE_COLORS = [
  "#10b981", // teal-green
  "#3b82f6", // blue
  "#ef4444", // red
  "#8b5cf6", // purple
  "#f59e0b", // amber
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
];

const DRIVER_NAMES = [
  "Arjun Sharma", "Priya Meena", "Rakesh Kumawat",
  "Neha Yadav", "Imran Khan", "Kavita Saini",
  "Deepak Verma", "Sunita Joshi",
];

const JAIPUR_HUBS = [
  "NIMS University", "Sindhi Camp", "Railway Station",
  "GT Mall", "WTP Jaipur", "Hawa Mahal", "Mansarovar", "Vaishali Nagar",
];

function colorFor(vehicleId: string, sortedIds: string[]): string {
  const i = sortedIds.indexOf(vehicleId);
  return VEHICLE_COLORS[i % VEHICLE_COLORS.length];
}

function statusLabel(status: string, pct: number): { label: string; cls: string } {
  if (status === "unavailable") return { label: "DELAYED", cls: "badge--unavailable" };
  if (pct > 60) return { label: "EN ROUTE", cls: "badge--en-route" };
  return { label: "AVAILABLE", cls: "badge--active" };
}

export default function VehicleList() {
  const vehicles = useRouteStore((s) => s.vehicles);
  const stops = useRouteStore((s) => s.stops);
  const currentSolution = useRouteStore((s) => s.currentSolution);

  const sortedIds = useMemo(() => [...vehicles.map((v) => v.id)].sort(), [vehicles]);
  const stopById = useMemo(() => new Map(stops.map((s) => [s.id, s])), [stops]);

  const stopIdsByVehicle = useMemo(() => {
    const map = new Map<string, string[]>();
    currentSolution?.routes.forEach((route) => map.set(route.vehicleId, route.stopIds));
    return map;
  }, [currentSolution]);

  if (vehicles.length === 0) {
    return (
      <div className="vehicle-list">
        <ul className="vehicle-list__items">
          <li className="vehicle-list__empty">Connecting to fleet…</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="vehicle-list">
      <ul className="vehicle-list__items">
        {vehicles.map((vehicle, idx) => {
          const stopIds = stopIdsByVehicle.get(vehicle.id) ?? [];
          const demandUsed = stopIds.reduce(
            (sum, id) => sum + (stopById.get(id)?.demand ?? 0),
            0
          );
          const capacityPct =
            vehicle.capacity > 0
              ? Math.min(100, Math.round((demandUsed / vehicle.capacity) * 100))
              : 0;
          const color = colorFor(vehicle.id, sortedIds);
          const driverName = DRIVER_NAMES[idx % DRIVER_NAMES.length];
          const fromHub = JAIPUR_HUBS[idx % JAIPUR_HUBS.length];
          const toHub = JAIPUR_HUBS[(idx + 2) % JAIPUR_HUBS.length];
          const { label, cls } = statusLabel(vehicle.status, capacityPct);

          return (
            <li
              key={vehicle.id}
              className={`vehicle-list__item vehicle-list__item--${vehicle.status}`}
              style={{ borderLeft: `3px solid ${color}` }}
            >
              <div className="vehicle-list__header">
                <span className="vehicle-list__id">
                  <span
                    className="vehicle-list__id-dot"
                    style={{ background: color, color }}
                  />
                  {vehicle.id}
                </span>
                <span className={`vehicle-list__badge ${cls}`}>{label}</span>
              </div>

              <div className="vehicle-list__route">
                {stopIds.length > 0
                  ? `${fromHub} → ${toHub}`
                  : `${fromHub} · next dispatch`}
              </div>

              <div className="vehicle-list__driver">{driverName}</div>

              <div className="vehicle-list__capacity">
                <div className="vehicle-list__capacity-bar">
                  <div
                    className="vehicle-list__capacity-fill"
                    style={{ width: `${capacityPct}%`, background: color }}
                  />
                </div>
                <span className="vehicle-list__capacity-label">{capacityPct}%</span>
              </div>
            </li>
          );
        })}

        {(currentSolution?.unassignedStopIds?.length ?? 0) > 0 && (
          <li className="vehicle-list__unassigned">
            Needs dispatch:{" "}
            {currentSolution?.unassignedStopIds.join(", ")}
          </li>
        )}
      </ul>
    </div>
  );
}
