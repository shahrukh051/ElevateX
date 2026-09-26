import { useState, useMemo } from "react";
import { useRouteStore } from "../store/useRouteStore";
import { useLogisticsStore, getDriverProfile } from "../store/useLogisticsStore";

const VEHICLE_COLORS = [
  "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b",
  "#06b6d4", "#f97316", "#ec4899", "#14b8a6",
];

export default function OrdersPage() {
  const vehicles = useRouteStore((s) => s.vehicles);
  const stops = useRouteStore((s) => s.stops);
  const currentSolution = useRouteStore((s) => s.currentSolution);
  const { parcels, accidentEvents } = useLogisticsStore();

  const [filterSearch, setFilterSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "in_transit" | "reassigned" | "delivered">("all");

  const sortedIds = useMemo(() => [...vehicles.map((v) => v.id)].sort(), [vehicles]);

  function colorFor(id: string) {
    const i = sortedIds.indexOf(id);
    return VEHICLE_COLORS[i % VEHICLE_COLORS.length];
  }

  const stopById = useMemo(() => new Map(stops.map((s) => [s.id, s])), [stops]);

  const vehicleData = vehicles.map((vehicle, idx) => {
    const route = currentSolution?.routes?.find((r) => r.vehicleId === vehicle.id);
    const stopIds = route?.stopIds ?? [];
    const vParcels = parcels.filter((p) => p.vehicleId === vehicle.id);
    const demandUsed = stopIds.reduce((sum, id) => sum + (stopById.get(id)?.demand ?? 0), 0);
    const capacityPct = vehicle.capacity > 0 ? Math.min(100, Math.round((demandUsed / vehicle.capacity) * 100)) : Math.round(55 + idx * 6);
    const hasAccident = accidentEvents.some((e) => e.vehicleId === vehicle.id && e.status !== "resolved");
    const profile = getDriverProfile(vehicle.id);

    return {
      vehicle,
      profile,
      stopIds,
      vParcels,
      capacityPct,
      color: colorFor(vehicle.id),
      hasAccident,
    };
  });

  const totalParcels = parcels.length;
  const inTransit = parcels.filter((p) => p.status === "in_transit").length;
  const reassigned = parcels.filter((p) => p.status === "reassigned").length;
  const delivered = parcels.filter((p) => p.status === "delivered").length;

  return (
    <div className="orders-page-container">
      {/* Top Header & Search */}
      <div className="op-top-bar">
        <div>
          <h1 className="op-title">Fleet Manifest & Parcel Assignments</h1>
          <p className="op-subtitle">
            Manage parcel routing, track delivery couriers, and monitor capacity loads across Jaipur
          </p>
        </div>

        <div className="op-filters">
          <div className="op-search-box">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search order ID, recipient, or hub…"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="op-search-input"
            />
          </div>

          <div className="op-status-pills">
            <button
              className={`op-pill-btn ${statusFilter === "all" ? "op-pill-btn--active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              All ({totalParcels})
            </button>
            <button
              className={`op-pill-btn ${statusFilter === "in_transit" ? "op-pill-btn--active" : ""}`}
              onClick={() => setStatusFilter("in_transit")}
            >
              In Transit ({inTransit})
            </button>
            <button
              className={`op-pill-btn ${statusFilter === "reassigned" ? "op-pill-btn--active" : ""}`}
              onClick={() => setStatusFilter("reassigned")}
            >
              Reassigned ({reassigned})
            </button>
            <button
              className={`op-pill-btn ${statusFilter === "delivered" ? "op-pill-btn--active" : ""}`}
              onClick={() => setStatusFilter("delivered")}
            >
              Delivered ({delivered})
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="op-kpi-grid">
        <div className="op-kpi-card">
          <div className="op-kpi-icon-wrap op-kpi-icon-wrap--blue">📦</div>
          <div>
            <div className="op-kpi-val">{totalParcels}</div>
            <div className="op-kpi-lbl">Total Manifest</div>
          </div>
        </div>
        <div className="op-kpi-card">
          <div className="op-kpi-icon-wrap op-kpi-icon-wrap--green">🚚</div>
          <div>
            <div className="op-kpi-val">{inTransit}</div>
            <div className="op-kpi-lbl">Active in Transit</div>
          </div>
        </div>
        <div className="op-kpi-card">
          <div className="op-kpi-icon-wrap op-kpi-icon-wrap--purple">↩️</div>
          <div>
            <div className="op-kpi-val">{reassigned}</div>
            <div className="op-kpi-lbl">Auto-Reassigned</div>
          </div>
        </div>
        <div className="op-kpi-card">
          <div className="op-kpi-icon-wrap op-kpi-icon-wrap--emerald">✅</div>
          <div>
            <div className="op-kpi-val">{delivered}</div>
            <div className="op-kpi-lbl">Delivered</div>
          </div>
        </div>
        <div className="op-kpi-card">
          <div className="op-kpi-icon-wrap op-kpi-icon-wrap--slate">🛵</div>
          <div>
            <div className="op-kpi-val">{vehicles.length}</div>
            <div className="op-kpi-lbl">Jaipur Fleet</div>
          </div>
        </div>
      </div>

      {/* Vehicle Manifest Blocks (Image 2 Operations List inspired) */}
      <div className="op-vehicle-blocks">
        {vehicleData.map(({ vehicle, profile, stopIds, vParcels, capacityPct, color, hasAccident }) => {
          const visibleParcels = vParcels.filter((p) => {
            const matchesSearch =
              p.orderId.toLowerCase().includes(filterSearch.toLowerCase()) ||
              p.customer.toLowerCase().includes(filterSearch.toLowerCase()) ||
              p.destination.toLowerCase().includes(filterSearch.toLowerCase());
            if (!matchesSearch) return false;
            if (statusFilter === "all") return true;
            return p.status === statusFilter;
          });

          return (
            <div
              key={vehicle.id}
              className={`op-block-card ${hasAccident ? "op-block-card--accident" : ""}`}
            >
              {/* Header */}
              <div className="op-block-header">
                <div className="op-block-driver">
                  <img src={profile.avatar} alt={profile.name} className="op-driver-avatar" />
                  <div>
                    <div className="op-driver-name-row">
                      <span className="op-driver-name">{profile.name}</span>
                      <span className="op-vehicle-chip" style={{ borderColor: color }}>
                        {vehicle.id}
                      </span>
                      {hasAccident && <span className="op-accident-badge">🚨 Collision Reported</span>}
                    </div>
                    <div className="op-vehicle-model">
                      {profile.vehicleType} · {profile.plate} · ⭐ {profile.rating}
                    </div>
                  </div>
                </div>

                <div className="op-block-meta">
                  <div className="op-route-tag">
                    {profile.originHub} → {profile.destHub}
                  </div>
                  <div className="op-capacity-box">
                    <div className="op-cap-bar-track">
                      <div
                        className="op-cap-bar-fill"
                        style={{ width: `${capacityPct}%`, backgroundColor: color }}
                      />
                    </div>
                    <span className="op-cap-text">{capacityPct}% Load</span>
                  </div>
                  <span className={`pill-badge ${vehicle.status === "active" ? "pill-badge--green" : "pill-badge--rose"}`}>
                    {vehicle.status === "active" ? "RUNNING" : "STOPPED"}
                  </span>
                </div>
              </div>

              {/* Table */}
              {visibleParcels.length > 0 ? (
                <div className="op-table-wrapper">
                  <table className="op-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Recipient</th>
                        <th>Item Details</th>
                        <th>Jaipur Destination</th>
                        <th>Weight</th>
                        <th>ETA IST</th>
                        <th>Priority</th>
                        <th>Shipment Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleParcels.map((parcel) => (
                        <tr key={parcel.id} className={parcel.status === "reassigned" ? "op-row--reassigned" : ""}>
                          <td className="op-cell-order-id">
                            <span>#{parcel.orderId}</span>
                          </td>
                          <td className="op-cell-customer">
                            <strong>{parcel.customer}</strong>
                          </td>
                          <td className="op-cell-desc">{parcel.description}</td>
                          <td className="op-cell-dest">
                            📍 {parcel.destination}
                          </td>
                          <td className="op-cell-weight">{parcel.weight}</td>
                          <td className="op-cell-eta">{parcel.estimatedDelivery}</td>
                          <td>
                            <span className={`pill-badge ${parcel.priority === "high" ? "pill-badge--amber" : "pill-badge--slate"}`}>
                              {parcel.priority === "high" ? "⚡ Urgent" : "Normal"}
                            </span>
                          </td>
                          <td>
                            {parcel.status === "in_transit" ? (
                              <span className="pill-badge pill-badge--green">In Transit</span>
                            ) : parcel.status === "reassigned" ? (
                              <span className="pill-badge pill-badge--purple">
                                Shifted from {parcel.originalVehicleId}
                              </span>
                            ) : parcel.status === "delivered" ? (
                              <span className="pill-badge pill-badge--blue">Delivered</span>
                            ) : (
                              <span className="pill-badge pill-badge--slate">Pending</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="op-no-records">
                  No matching parcels for this vehicle with selected filters.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
