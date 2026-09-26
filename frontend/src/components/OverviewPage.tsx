import { useMemo } from "react";
import { useRouteStore } from "../store/useRouteStore";
import { useLogisticsStore, getDriverProfile } from "../store/useLogisticsStore";
import { OverviewWeatherCard } from "./WeatherWidget";
import type { ClientMessage } from "../types";

type Page = "overview" | "track" | "orders" | "disruptions";

interface OverviewPageProps {
  onNavigate: (page: Page) => void;
  sendMessage: (msg: ClientMessage) => void;
}

const JAIPUR_ZONES = [
  "Vaishali Nagar", "Malviya Nagar", "Mansarovar", "Tonk Road",
  "Civil Lines", "Raja Park", "Sindhi Camp", "Sanganer",
];

export default function OverviewPage({ onNavigate }: OverviewPageProps) {
  const vehicles = useRouteStore((s) => s.vehicles);
  const { parcels, accidentEvents } = useLogisticsStore();

  const activeVehicles = vehicles.filter((v) => v.status === "active");
  const activeIncidents = accidentEvents.filter((e) => e.status !== "resolved");

  const inTransit = parcels.filter((p) => p.status === "in_transit").length;
  const delivered = parcels.filter((p) => p.status === "delivered").length;
  const reassigned = parcels.filter((p) => p.status === "reassigned").length;
  const pending = parcels.filter((p) => p.status === "pending").length;

  const deliveryRate = parcels.length > 0 ? Math.round((delivered / parcels.length) * 100) : 0;

  const recentEvents = useMemo(() => {
    return [...accidentEvents]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [accidentEvents]);

  // Simulate zone delivery heatmap
  const zoneStats = useMemo(() => {
    return JAIPUR_ZONES.map((zone, i) => ({
      zone,
      count: Math.max(1, Math.round(3 + Math.sin(i * 1.5) * 2 + Math.random() * 3)),
      active: Math.random() > 0.3,
    }));
  }, []);

  const onTimeRate = 94;
  const avgSpeed = 28;

  return (
    <div className="overview-page">
      {/* Hero greeting bar */}
      <div className="ov-hero">
        <div className="ov-hero-left">
          <div className="ov-hero-greeting">Good {getGreeting()}, Shahrukh 👋</div>
          <div className="ov-hero-sub">
            Here's your ElevateX Jaipur fleet at a glance —
            <strong> {activeVehicles.length} vehicles</strong> active,
            <strong> {parcels.length} parcels</strong> in system
          </div>
        </div>
        <div className="ov-hero-actions">
          <button className="ov-cta-btn ov-cta-btn--primary" onClick={() => onNavigate("track")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
            </svg>
            Open Live Map
          </button>
          {activeIncidents.length > 0 && (
            <button className="ov-cta-btn ov-cta-btn--danger" onClick={() => onNavigate("disruptions")}>
              🚨 {activeIncidents.length} Active Incident{activeIncidents.length > 1 ? "s" : ""}
            </button>
          )}
        </div>
      </div>

      {/* Live Fleet Weather & Road Impact Alert */}
      <OverviewWeatherCard />

      {/* Main KPI Row */}
      <div className="ov-kpi-row">
        <div className="ov-kpi-card ov-kpi-card--blue" onClick={() => onNavigate("track")}>
          <div className="ov-kpi-top">
            <div className="ov-kpi-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
              </svg>
            </div>
            <span className="ov-kpi-trend ov-kpi-trend--up">↑ Live</span>
          </div>
          <div className="ov-kpi-value">{activeVehicles.length}<span className="ov-kpi-unit">/{vehicles.length}</span></div>
          <div className="ov-kpi-label">Vehicles Active</div>
          <div className="ov-kpi-bar-track">
            <div className="ov-kpi-bar-fill ov-kpi-bar-fill--blue" style={{ width: vehicles.length > 0 ? `${(activeVehicles.length / vehicles.length) * 100}%` : "0%" }} />
          </div>
        </div>

        <div className="ov-kpi-card ov-kpi-card--emerald" onClick={() => onNavigate("orders")}>
          <div className="ov-kpi-top">
            <div className="ov-kpi-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="3" width="15" height="13"/>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                <circle cx="5.5" cy="18.5" r="2.5"/>
                <circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
            <span className="ov-kpi-trend ov-kpi-trend--up">↑ Fleet</span>
          </div>
          <div className="ov-kpi-value">{inTransit}<span className="ov-kpi-unit"> pkgs</span></div>
          <div className="ov-kpi-label">In Transit Now</div>
          <div className="ov-kpi-bar-track">
            <div className="ov-kpi-bar-fill ov-kpi-bar-fill--emerald" style={{ width: parcels.length > 0 ? `${(inTransit / parcels.length) * 100}%` : "70%" }} />
          </div>
        </div>

        <div className="ov-kpi-card ov-kpi-card--violet">
          <div className="ov-kpi-top">
            <div className="ov-kpi-icon">✅</div>
            <span className="ov-kpi-trend ov-kpi-trend--up">+{deliveryRate}%</span>
          </div>
          <div className="ov-kpi-value">{delivered}<span className="ov-kpi-unit"> done</span></div>
          <div className="ov-kpi-label">Delivered Today</div>
          <div className="ov-kpi-bar-track">
            <div className="ov-kpi-bar-fill ov-kpi-bar-fill--violet" style={{ width: `${deliveryRate}%` }} />
          </div>
        </div>

        <div className="ov-kpi-card ov-kpi-card--amber" onClick={() => onNavigate("disruptions")}>
          <div className="ov-kpi-top">
            <div className="ov-kpi-icon">🚨</div>
            {activeIncidents.length > 0 ? (
              <span className="ov-kpi-trend ov-kpi-trend--danger">● LIVE</span>
            ) : (
              <span className="ov-kpi-trend ov-kpi-trend--up">✓ Clear</span>
            )}
          </div>
          <div className="ov-kpi-value">{activeIncidents.length}<span className="ov-kpi-unit"> active</span></div>
          <div className="ov-kpi-label">Incidents</div>
          <div className="ov-kpi-bar-track">
            <div className="ov-kpi-bar-fill ov-kpi-bar-fill--amber" style={{ width: `${Math.min(100, activeIncidents.length * 25)}%` }} />
          </div>
        </div>

        <div className="ov-kpi-card ov-kpi-card--slate">
          <div className="ov-kpi-top">
            <div className="ov-kpi-icon">🔄</div>
            <span className="ov-kpi-trend ov-kpi-trend--purple">Auto</span>
          </div>
          <div className="ov-kpi-value">{reassigned}<span className="ov-kpi-unit"> pkgs</span></div>
          <div className="ov-kpi-label">Auto-Reassigned</div>
          <div className="ov-kpi-bar-track">
            <div className="ov-kpi-bar-fill ov-kpi-bar-fill--purple" style={{ width: parcels.length > 0 ? `${(reassigned / Math.max(parcels.length, 1)) * 100}%` : "0%" }} />
          </div>
        </div>
      </div>

      {/* Middle Section: Metrics + Fleet Cards + Activity */}
      <div className="ov-middle-row">
        {/* Left: Performance Metrics */}
        <div className="ov-metric-panel">
          <div className="ov-panel-header">
            <span className="ov-panel-title">Performance Today</span>
            <span className="ov-panel-badge">Jaipur Fleet</span>
          </div>

          {/* Circular Stats */}
          <div className="ov-circle-stats">
            <div className="ov-circle-stat">
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="32" fill="none" stroke="#e2e8f0" strokeWidth="8"/>
                <circle
                  cx="40" cy="40" r="32" fill="none"
                  stroke="#10b981" strokeWidth="8"
                  strokeDasharray={`${(onTimeRate / 100) * 201} 201`}
                  strokeDashoffset="50.3" strokeLinecap="round"
                />
                <text x="40" y="45" textAnchor="middle" fontSize="14" fontWeight="800" fill="#0f172a">{onTimeRate}%</text>
              </svg>
              <div className="ov-circle-label">On-Time Rate</div>
            </div>

            <div className="ov-circle-stat">
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="32" fill="none" stroke="#e2e8f0" strokeWidth="8"/>
                <circle
                  cx="40" cy="40" r="32" fill="none"
                  stroke="#3b82f6" strokeWidth="8"
                  strokeDasharray={`${(avgSpeed / 60) * 201} 201`}
                  strokeDashoffset="50.3" strokeLinecap="round"
                />
                <text x="40" y="45" textAnchor="middle" fontSize="14" fontWeight="800" fill="#0f172a">{avgSpeed}</text>
              </svg>
              <div className="ov-circle-label">Avg Speed (km/h)</div>
            </div>

            <div className="ov-circle-stat">
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="32" fill="none" stroke="#e2e8f0" strokeWidth="8"/>
                <circle
                  cx="40" cy="40" r="32" fill="none"
                  stroke="#8b5cf6" strokeWidth="8"
                  strokeDasharray={`${(deliveryRate / 100) * 201} 201`}
                  strokeDashoffset="50.3" strokeLinecap="round"
                />
                <text x="40" y="45" textAnchor="middle" fontSize="14" fontWeight="800" fill="#0f172a">{deliveryRate}%</text>
              </svg>
              <div className="ov-circle-label">Delivery Rate</div>
            </div>
          </div>

          {/* Zone Delivery Heatmap */}
          <div className="ov-zone-section">
            <div className="ov-zone-title">Jaipur Delivery Zones</div>
            <div className="ov-zone-list">
              {zoneStats.map((z) => (
                <div key={z.zone} className="ov-zone-row">
                  <div className="ov-zone-dot" style={{ background: z.active ? "#10b981" : "#94a3b8" }} />
                  <span className="ov-zone-name">{z.zone}</span>
                  <div className="ov-zone-bar-track">
                    <div className="ov-zone-bar-fill" style={{ width: `${(z.count / 8) * 100}%`, background: z.active ? "#10b981" : "#94a3b8" }} />
                  </div>
                  <span className="ov-zone-count">{z.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Active Fleet Cards */}
        <div className="ov-fleet-panel">
          <div className="ov-panel-header">
            <span className="ov-panel-title">Active Fleet</span>
            <button className="ov-panel-link" onClick={() => onNavigate("track")}>View all →</button>
          </div>
          <div className="ov-fleet-grid">
            {vehicles.slice(0, 6).map((vehicle) => {
              const profile = getDriverProfile(vehicle.id);
              const hasAccident = accidentEvents.some((e) => e.vehicleId === vehicle.id && e.status !== "resolved");
              const vParcels = parcels.filter((p) => p.vehicleId === vehicle.id);
              return (
                <div
                  key={vehicle.id}
                  className={`ov-fleet-card ${hasAccident ? "ov-fleet-card--accident" : ""}`}
                  onClick={() => onNavigate("track")}
                >
                  <div className="ov-fleet-card-top">
                    <div className="ov-fc-avatar-wrap">
                      <img src={profile.avatar} alt={profile.name} className="ov-fc-avatar" />
                      <span className={`ov-fc-dot ${hasAccident ? "ov-fc-dot--danger" : vehicle.status === "active" ? "ov-fc-dot--live" : "ov-fc-dot--idle"}`} />
                    </div>
                    <div className="ov-fc-info">
                      <div className="ov-fc-name">{profile.name.split(" ")[0]}</div>
                      <div className="ov-fc-id">{vehicle.id}</div>
                    </div>
                    {hasAccident && <span className="ov-fc-incident-badge">🚨</span>}
                  </div>
                  <div className="ov-fc-stats">
                    <div className="ov-fc-stat">
                      <span className="ov-fc-stat-val">{vParcels.length}</span>
                      <span className="ov-fc-stat-lbl">pkgs</span>
                    </div>
                    <div className="ov-fc-stat">
                      <span className="ov-fc-stat-val">{profile.vehicleType === "Motorbike" ? "2W" : "4W"}</span>
                      <span className="ov-fc-stat-lbl">type</span>
                    </div>
                    <div className="ov-fc-stat">
                      <span className="ov-fc-stat-val">⭐{profile.rating}</span>
                      <span className="ov-fc-stat-lbl">rating</span>
                    </div>
                  </div>
                  <div className="ov-fc-route">
                    <span className="ov-fc-hub">{profile.originHub}</span>
                    <span className="ov-fc-arrow">→</span>
                    <span className="ov-fc-hub">{profile.destHub}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Incident Log + Pending */}
        <div className="ov-activity-panel">
          <div className="ov-panel-header">
            <span className="ov-panel-title">Recent Activity</span>
            <button className="ov-panel-link" onClick={() => onNavigate("disruptions")}>See all →</button>
          </div>

          {/* Pending / Reassigned summary */}
          <div className="ov-status-summary">
            <div className="ov-ss-item ov-ss-item--blue">
              <span className="ov-ss-val">{inTransit}</span>
              <span className="ov-ss-lbl">In Transit</span>
            </div>
            <div className="ov-ss-item ov-ss-item--amber">
              <span className="ov-ss-val">{pending}</span>
              <span className="ov-ss-lbl">Pending</span>
            </div>
            <div className="ov-ss-item ov-ss-item--purple">
              <span className="ov-ss-val">{reassigned}</span>
              <span className="ov-ss-lbl">Reassigned</span>
            </div>
          </div>

          {/* Incident feed */}
          <div className="ov-activity-feed">
            {recentEvents.length === 0 ? (
              <div className="ov-empty-feed">
                <div className="ov-empty-icon">✅</div>
                <div className="ov-empty-text">All systems nominal</div>
                <div className="ov-empty-sub">No disruptions detected in the Jaipur fleet</div>
              </div>
            ) : (
              recentEvents.map((evt) => (
                <div key={evt.id} className={`ov-activity-item ${evt.status === "resolved" ? "ov-activity-item--resolved" : "ov-activity-item--active"}`}>
                  <div className="ov-ai-icon">{evt.status === "resolved" ? "✓" : "🚨"}</div>
                  <div className="ov-ai-body">
                    <div className="ov-ai-title">{evt.vehicleId} Breakdown</div>
                    <div className="ov-ai-desc">
                      {evt.parcelsCount} parcel{evt.parcelsCount !== 1 ? "s" : ""} → {evt.reassignedTo}
                    </div>
                    <div className="ov-ai-time">{new Date(evt.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                  <span className={`ov-ai-badge ${evt.status === "resolved" ? "ov-ai-badge--resolved" : "ov-ai-badge--active"}`}>
                    {evt.status}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Quick Actions */}
          <div className="ov-quick-actions">
            <div className="ov-qa-title">Quick Actions</div>
            <div className="ov-qa-grid">
              <button className="ov-qa-btn" onClick={() => onNavigate("track")}>
                🗺️ Open Map
              </button>
              <button className="ov-qa-btn" onClick={() => onNavigate("orders")}>
                📦 Manifest
              </button>
              <button className="ov-qa-btn ov-qa-btn--danger" onClick={() => onNavigate("disruptions")}>
                🚨 Simulate
              </button>
              <button className="ov-qa-btn" onClick={() => onNavigate("orders")}>
                📊 Reports
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
