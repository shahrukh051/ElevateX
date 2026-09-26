import { useMemo } from "react";
import { useRouteStore } from "../store/useRouteStore";

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

/** Same deterministic assignment as MapView, so each vehicle's dot matches its route color. */
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

  return (
    <div className="vehicle-list">
      <h2>Fleet</h2>
      <ul className="vehicle-list__items">
      {vehicles.map((vehicle) => {
          const stopIds = stopIdsByVehicle.get(vehicle.id) ?? [];
          const demandUsed = stopIds.reduce((sum, id) => sum + (stopById.get(id)?.demand ?? 0), 0);
          const capacityPct =
            vehicle.capacity > 0 ? Math.min(100, Math.round((demandUsed / vehicle.capacity) * 100)) : 0;

          return (
            <li key={vehicle.id} className={`vehicle-list__item vehicle-list__item--${vehicle.status}`}>
              <div className="vehicle-list__header">
                <span
                  className="vehicle-list__dot"
                  style={{ background: colorFor(vehicle.id, sortedIds) }}
                  aria-hidden="true"
                />
                <span className="vehicle-list__id">{vehicle.id}</span>
                <span className="vehicle-list__status">{vehicle.status}</span>
              </div>
              <div className="vehicle-list__stat">
                {stopIds.length} stop{stopIds.length === 1 ? "" : "s"}
              </div>
              <div className="vehicle-list__capacity">
                <div className="vehicle-list__capacity-bar">
                  <div className="vehicle-list__capacity-fill" style={{ width: `${capacityPct}%` }} />
                </div>
                <span className="vehicle-list__capacity-label">
                  {demandUsed} / {vehicle.capacity}
                </span>
              </div>
            </li>
          );
      })}
      {(currentSolution?.unassignedStopIds?.length ?? 0) > 0 && (
        <li className="vehicle-list__empty vehicle-list__empty--unassigned">
          Needs manual dispatch: {currentSolution?.unassignedStopIds.join(", ")}
        </li>
      )}
        {vehicles.length === 0 && <li className="vehicle-list__empty">No vehicles yet.</li>}
      </ul>
    </div>
  );
}
