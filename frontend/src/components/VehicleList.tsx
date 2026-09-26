import { useMemo } from "react";
import { useRouteStore } from "../store/useRouteStore";

const VEHICLE_COLORS = [
  "#10b981", // teal-green
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#ef4444", // red
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
];

function colorFor(vehicleId: string, sortedIds: string[]): string {
  const i = sortedIds.indexOf(vehicleId);
  return VEHICLE_COLORS[i % VEHICLE_COLORS.length];
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
          <li className="vehicle-list__empty">No vehicles yet.</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="vehicle-list">
      <ul className="vehicle-list__items">
        {vehicles.map((vehicle) => {
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

          return (
            <li
              key={vehicle.id}
              className={`vehicle-list__item vehicle-list__item--${vehicle.status}`}
            >
              <div className="vehicle-list__header">
                <span
                  className="vehicle-list__dot"
                  style={{ background: color }}
                  aria-hidden="true"
                />
                <span className="vehicle-list__id">{vehicle.id}</span>
                <span className={`badge badge--${vehicle.status}`}>
                  {vehicle.status}
                </span>
              </div>

              <div className="vehicle-list__stat">
                {stopIds.length} stop{stopIds.length !== 1 ? "s" : ""}
              </div>

              <div className="vehicle-list__capacity">
                <div className="vehicle-list__capacity-bar">
                  <div
                    className="vehicle-list__capacity-fill"
                    style={{ width: `${capacityPct}%`, background: color }}
                  />
                </div>
                <span className="vehicle-list__capacity-label">
                  {demandUsed}&nbsp;/&nbsp;{vehicle.capacity}
                </span>
              </div>
            </li>
          );
        })}

        {(currentSolution?.unassignedStopIds?.length ?? 0) > 0 && (
          <li className="vehicle-list__unassigned">
            ⚠ Needs dispatch:{" "}
            {currentSolution?.unassignedStopIds.join(", ")}
          </li>
        )}
      </ul>
    </div>
  );
}
