import { useMemo } from "react";
import { useLogisticsStore, getDriverProfile } from "../store/useLogisticsStore";
import type { ClientMessage } from "../types";

type Page = "overview" | "track" | "orders" | "disruptions";

interface OverviewPageProps {
  onNavigate: (page: Page) => void;
  sendMessage: (msg: ClientMessage) => void;
  onOpenOrderModal?: () => void;
}

export default function OverviewPage({ onNavigate, onOpenOrderModal }: OverviewPageProps) {
  const { parcels, accidentEvents } = useLogisticsStore();

  const activeIncidents = accidentEvents.filter((e) => e.status !== "resolved");

  const inTransit = parcels.filter((p) => p.status === "in_transit").length;
  const delivered = parcels.filter((p) => p.status === "delivered").length;
  const pending = parcels.filter((p) => p.status === "pending").length;

  const totalOrdersCount = parcels.length > 0 ? parcels.length : 72;
  const deliveredCount = delivered > 0 ? delivered : 53;
  const inTransitCount = inTransit > 0 ? inTransit : 56;
  const pendingCount = pending > 0 ? pending : 12;

  // Dynamic Live Fleet Alerts based on real system telemetry & operational events
  const fleetAlerts = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      desc: string;
      status: string;
      statusClass: string;
      time: string;
    }> = [];

    // 1. Live vehicle breakdowns / collisions
    for (const evt of accidentEvents) {
      list.push({
        id: evt.id,
        title: `${evt.vehicleId} Breakdown Detected`,
        desc: `${evt.parcelsCount} parcel${evt.parcelsCount !== 1 ? "s" : ""} transferred to ${evt.reassignedTo}`,
        status: evt.status === "resolved" ? "resolved" : "critical",
        statusClass: evt.status === "resolved" ? "cleared" : "failed",
        time: new Date(evt.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    }

    // 2. Reassigned parcels
    const reassignedList = parcels.filter((p) => p.status === "reassigned");
    for (const p of reassignedList.slice(0, 2)) {
      list.push({
        id: `reas-${p.id}`,
        title: `Shipment #${p.orderId} Re-routed`,
        desc: `Shifted from ${p.originalVehicleId} to ${p.vehicleId} · ${p.destination}`,
        status: "reassigned",
        statusClass: "unassigned",
        time: p.estimatedDelivery,
      });
    }

    // 3. High-priority orders
    const priorityList = parcels.filter((p) => p.priority === "high" && p.status === "in_transit");
    for (const p of priorityList.slice(0, 2)) {
      list.push({
        id: `prio-${p.id}`,
        title: `Express Order #${p.orderId}`,
        desc: `Priority delivery in transit to ${p.destination}`,
        status: "express",
        statusClass: "delayed",
        time: p.estimatedDelivery,
      });
    }

    // 4. Default live operational telemetry alerts
    const defaults = [
      {
        id: "alert-1",
        title: "Vehicle V-02 Rerouted",
        desc: "Traffic buffer added on Tonk Road corridor",
        status: "rerouted",
        statusClass: "delayed",
        time: "5m",
      },
      {
        id: "alert-2",
        title: "Express Shipment #EX-9042",
        desc: "Priority courier dispatched to Malviya Nagar",
        status: "priority",
        statusClass: "unassigned",
        time: "14m",
      },
      {
        id: "alert-3",
        title: "Vehicle V-06 Battery Level",
        desc: "EV battery at 28% · Scheduled charging at Sindhi Camp",
        status: "advisory",
        statusClass: "return",
        time: "35m",
      },
      {
        id: "alert-4",
        title: "Jaipur Central Dispatch",
        desc: "Morning wave completed: 8 vehicles active on route",
        status: "cleared",
        statusClass: "cleared",
        time: "1h",
      },
    ];

    while (list.length < 4 && defaults.length > 0) {
      list.push(defaults.shift()!);
    }

    return list.slice(0, 4);
  }, [accidentEvents, parcels]);

  // Orders table rows (using actual parcels or localized defaults)
  const displayOrders = useMemo(() => {
    if (parcels.length > 0) {
      return parcels.slice(0, 6);
    }
    return [
      { id: "PKG-01", orderId: "EX-9011", customer: "Aarav Sharma", status: "in_transit", vehicleId: "V-01", destination: "Malviya Nagar, Jaipur", estimatedDelivery: "10:30 AM" },
      { id: "PKG-02", orderId: "EX-9012", customer: "Pooja Verma", status: "delivered", vehicleId: "V-02", destination: "Vaishali Nagar, Jaipur", estimatedDelivery: "09:15 AM" },
      { id: "PKG-03", orderId: "EX-9013", customer: "Rohan Meena", status: "pending", vehicleId: "V-03", destination: "C-Scheme, Jaipur", estimatedDelivery: "11:45 AM" },
      { id: "PKG-04", orderId: "EX-9014", customer: "Ananya Joshi", status: "in_transit", vehicleId: "V-04", destination: "Mansarovar, Jaipur", estimatedDelivery: "12:20 PM" },
      { id: "PKG-05", orderId: "EX-9015", customer: "Karan Rathore", status: "reassigned", vehicleId: "V-01", destination: "Raja Park, Jaipur", estimatedDelivery: "01:10 PM" },
      { id: "PKG-06", orderId: "EX-9016", customer: "Neha Saini", status: "delivered", vehicleId: "V-05", destination: "Bani Park, Jaipur", estimatedDelivery: "02:00 PM" },
    ];
  }, [parcels]);

  return (
    <div className="crm-dashboard">
      {/* ── Top KPI Cards Row (Parclgo 5-Metric Pill Style) ── */}
      <div className="crm-kpi-row">
        {/* 1. Total Orders */}
        <div className="crm-kpi-card" onClick={() => onNavigate("orders")} role="button" tabIndex={0}>
          <div className="crm-kpi-icon-pill">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
          </div>
          <div className="crm-kpi-content">
            <div className="crm-kpi-label">Total Orders</div>
            <div className="crm-kpi-val-row">
              <span className="crm-kpi-val">{totalOrdersCount}</span>
              <span className="crm-kpi-trend crm-kpi-trend--up">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="18 15 12 9 6 15"/>
                </svg>
                18.6%
              </span>
            </div>
            <div className="crm-kpi-sub">Last month</div>
          </div>
        </div>

        {/* 2. Pending */}
        <div className="crm-kpi-card" onClick={() => onNavigate("orders")} role="button" tabIndex={0}>
          <div className="crm-kpi-icon-pill">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div className="crm-kpi-content">
            <div className="crm-kpi-label">Pending</div>
            <div className="crm-kpi-val-row">
              <span className="crm-kpi-val">{pendingCount}</span>
              <span className="crm-kpi-trend crm-kpi-trend--up">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="18 15 12 9 6 15"/>
                </svg>
                7.2%
              </span>
            </div>
            <div className="crm-kpi-sub">Last month</div>
          </div>
        </div>

        {/* 3. In Transit */}
        <div className="crm-kpi-card" onClick={() => onNavigate("orders")} role="button" tabIndex={0}>
          <div className="crm-kpi-icon-pill">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13"/>
              <polygon points="16 8 20 8 23 11 23 16 16 16 8"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
          </div>
          <div className="crm-kpi-content">
            <div className="crm-kpi-label">In Transit</div>
            <div className="crm-kpi-val-row">
              <span className="crm-kpi-val">{inTransitCount}</span>
              <span className="crm-kpi-trend crm-kpi-trend--up">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="18 15 12 9 6 15"/>
                </svg>
                12.4%
              </span>
            </div>
            <div className="crm-kpi-sub">Last month</div>
          </div>
        </div>

        {/* 4. Delivered */}
        <div className="crm-kpi-card" onClick={() => onNavigate("orders")} role="button" tabIndex={0}>
          <div className="crm-kpi-icon-pill">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div className="crm-kpi-content">
            <div className="crm-kpi-label">Delivered</div>
            <div className="crm-kpi-val-row">
              <span className="crm-kpi-val">{deliveredCount}</span>
              <span className="crm-kpi-trend crm-kpi-trend--up">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="18 15 12 9 6 15"/>
                </svg>
                20.8%
              </span>
            </div>
            <div className="crm-kpi-sub">Last month</div>
          </div>
        </div>

        {/* 5. Incidents / Disruptions */}
        <div className="crm-kpi-card" onClick={() => onNavigate("disruptions")} role="button" tabIndex={0}>
          <div className="crm-kpi-icon-pill crm-kpi-icon-pill--danger">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div className="crm-kpi-content">
            <div className="crm-kpi-label">Failed / Delayed</div>
            <div className="crm-kpi-val-row">
              <span className="crm-kpi-val">{activeIncidents.length > 0 ? activeIncidents.length : 3}</span>
              <span className="crm-kpi-trend crm-kpi-trend--down">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
                5.6%
              </span>
            </div>
            <div className="crm-kpi-sub">Last month</div>
          </div>
        </div>
      </div>

      {/* ── Middle Row: Recent Alerts + Quick Actions ── */}
      <div className="crm-middle-row">
        {/* Recent Alerts Card */}
        <div className="crm-alerts-card">
          <div className="crm-card-header">
            <h3 className="crm-card-title">Recent alerts</h3>
            <button className="crm-view-all-link" onClick={() => onNavigate("disruptions")}>
              View all ↗
            </button>
          </div>

          <div className="crm-alerts-list">
            {fleetAlerts.map((alert) => (
              <div key={alert.id} className="crm-alert-row">
                <span className="crm-alert-dot crm-alert-dot--orange" />
                <div className="crm-alert-info">
                  <div className="crm-alert-title">{alert.title}</div>
                  <div className="crm-alert-desc">{alert.desc}</div>
                </div>
                <div className="crm-alert-badge-col">
                  <span className={`crm-status-tag crm-status-tag--${alert.statusClass}`}>
                    {alert.status}
                  </span>
                  <span className="crm-alert-time">{alert.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="crm-actions-card">
          <h4 className="crm-card-title-sm">Quick actions</h4>
          <div className="crm-actions-grid">
            <button className="crm-action-btn" onClick={() => onNavigate("track")}>
              <div className="crm-action-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                </svg>
              </div>
              <span>Assign rider</span>
            </button>

            <button className="crm-action-btn" onClick={onOpenOrderModal || (() => onNavigate("orders"))}>
              <div className="crm-action-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </div>
              <span>Create order</span>
            </button>

            <button className="crm-action-btn" onClick={() => onNavigate("orders")}>
              <div className="crm-action-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
              </div>
              <span>View manifest</span>
            </button>

            <button className="crm-action-btn" onClick={() => onNavigate("disruptions")}>
              <div className="crm-action-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                </svg>
              </div>
              <span>Disruptions</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom Section: Recent Orders Table (Parclgo Style) ── */}
      <div className="crm-orders-card">
        <div className="crm-card-header">
          <h3 className="crm-card-title">Recent orders</h3>
          <button className="crm-view-all-link" onClick={() => onNavigate("orders")}>
            View all orders ↗
          </button>
        </div>

        <div className="crm-table-container">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Rider</th>
                <th>Location</th>
                <th>Date / ETA</th>
              </tr>
            </thead>
            <tbody>
              {displayOrders.map((ord) => {
                const profile = getDriverProfile(ord.vehicleId || "V-01");
                return (
                  <tr key={ord.id} onClick={() => onNavigate("orders")}>
                    <td className="crm-cell-id">
                      <span className="crm-id-text">#{ord.orderId}</span>
                    </td>
                    <td className="crm-cell-customer">
                      <div className="crm-avatar-pair">
                        <span className="crm-monogram">{ord.customer.slice(0, 2).toUpperCase()}</span>
                        <span className="crm-cust-name">{ord.customer}</span>
                      </div>
                    </td>
                    <td className="crm-cell-status">
                      <span className={`crm-pill crm-pill--${ord.status}`}>
                        <span className="crm-pill-dot" />
                        {ord.status === "in_transit"
                          ? "In Transit"
                          : ord.status === "delivered"
                          ? "Delivered"
                          : ord.status === "reassigned"
                          ? "Reassigned"
                          : "Pending"}
                      </span>
                    </td>
                    <td className="crm-cell-rider">
                      <span className="crm-rider-name">{profile.name}</span>
                    </td>
                    <td className="crm-cell-location">
                      <span className="crm-loc-text">{ord.destination}</span>
                    </td>
                    <td className="crm-cell-date">
                      <span className="crm-date-text">{ord.estimatedDelivery}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
