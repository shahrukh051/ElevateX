import { useEffect, useState, useRef } from "react";
import { useLiveSolution } from "./hooks/useLiveSolution";
import { useRouteStore } from "./store/useRouteStore";
import { useLogisticsStore, seedParcels } from "./store/useLogisticsStore";
import TrackPage from "./components/TrackPage";
import OrdersPage from "./components/OrdersPage";
import DisruptionsPage from "./components/DisruptionsPage";
import OverviewPage from "./components/OverviewPage";
import AddOrderModal from "./components/AddOrderModal";
import { HeaderWeatherPill } from "./components/WeatherWidget";
import "./App.css";

type Page = "overview" | "track" | "orders" | "disruptions";

const PAGE_TITLES: Record<Page, string> = {
  overview: "CRM Dashboard",
  track: "Shipments & Live Dispatch",
  orders: "Orders & Manifest",
  disruptions: "Disruption Control",
};

export default function App() {
  const { sendMessage } = useLiveSolution();
  const connectionStatus = useRouteStore((s) => s.connectionStatus);
  const vehicles = useRouteStore((s) => s.vehicles);
  const parcels = useLogisticsStore((s) => s.parcels);
  const accidentEvents = useLogisticsStore((s) => s.accidentEvents);
  const [activePage, setActivePage] = useState<Page>("overview");
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [liveTime, setLiveTime] = useState("--:--:-- IST");
  const [clockSynced, setClockSynced] = useState(false);
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncedBaseRef = useRef<number | null>(null);
  const syncedAtRef = useRef<number | null>(null);

  const activeIncidentCount = accidentEvents.filter((e) => e.status !== "resolved").length;

  // TimeAPI-synced live clock
  useEffect(() => {
    function formatIST(epochMs: number): string {
      const istMs = epochMs + 5.5 * 60 * 60 * 1000;
      const d = new Date(istMs);
      const hh = String(d.getUTCHours()).padStart(2, "0");
      const mm = String(d.getUTCMinutes()).padStart(2, "0");
      const ss = String(d.getUTCSeconds()).padStart(2, "0");
      return `${hh}:${mm}:${ss} IST`;
    }

    function startTicking() {
      if (clockRef.current) clearInterval(clockRef.current);
      clockRef.current = setInterval(() => {
        if (syncedBaseRef.current !== null && syncedAtRef.current !== null) {
          const elapsed = performance.now() - syncedAtRef.current;
          setLiveTime(formatIST(syncedBaseRef.current + elapsed));
        } else {
          setLiveTime(
            new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " IST"
          );
        }
      }, 1000);
    }

    fetch("https://timeapi.io/api/v1/time/current/utc")
      .then((res) => res.json())
      .then((data: { utc_time: string }) => {
        const serverEpoch = new Date(data.utc_time).getTime();
        syncedBaseRef.current = serverEpoch;
        syncedAtRef.current = performance.now();
        setLiveTime(formatIST(serverEpoch));
        setClockSynced(true);
        startTicking();
      })
      .catch(() => {
        setClockSynced(false);
        startTicking();
      });

    return () => { if (clockRef.current) clearInterval(clockRef.current); };
  }, []);

  // Seed parcels when vehicles load
  useEffect(() => {
    if (vehicles.length > 0 && parcels.length === 0) {
      seedParcels(vehicles.map((v) => v.id));
    }
  }, [vehicles.length]);

  return (
    <div className="saas-app-container">
      {/* ── Left Modern Light Sidebar (Parclgo style) ── */}
      <aside className="parcl-sidebar">
        {/* Brand Header */}
        <div className="parcl-logo-wrap" onClick={() => setActivePage("overview")} role="button" tabIndex={0}>
          <div className="parcl-logo-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#ff5a22"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="#ff5a22" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="parcl-brand-text">
            <span className="parcl-brand-name">Elevate<strong>X</strong></span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="parcl-nav">
          <button
            className={`parcl-nav-item ${activePage === "overview" ? "parcl-nav-item--active" : ""}`}
            onClick={() => setActivePage("overview")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            <span>Dashboard</span>
          </button>

          <button
            className={`parcl-nav-item ${activePage === "orders" ? "parcl-nav-item--active" : ""}`}
            onClick={() => setActivePage("orders")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
            <span>Orders</span>
            {parcels.length > 0 && <span className="parcl-nav-badge">{parcels.length}</span>}
          </button>

          <button
            className={`parcl-nav-item ${activePage === "track" ? "parcl-nav-item--active" : ""}`}
            onClick={() => setActivePage("track")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
              <line x1="8" y1="2" x2="8" y2="18"/>
              <line x1="16" y1="6" x2="16" y2="22"/>
            </svg>
            <span>Shipments</span>
          </button>

          <button
            className={`parcl-nav-item ${activePage === "disruptions" ? "parcl-nav-item--active" : ""}`}
            onClick={() => setActivePage("disruptions")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>Disruptions</span>
            {activeIncidentCount > 0 && (
              <span className="parcl-nav-badge parcl-nav-badge--danger">{activeIncidentCount}</span>
            )}
          </button>
        </nav>

        {/* Promo / Fleet Assistant card matching parclgo reference */}
        <div className="parcl-promo-card">
          <div className="parcl-promo-icon-wrap">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff5a22" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </div>
          <h4 className="parcl-promo-title">Deliver smarter, Grow Faster</h4>
          <p className="parcl-promo-sub">Track every delivery easily.</p>
          <button className="parcl-promo-btn" onClick={() => setActivePage("track")}>
            Live Map
          </button>
        </div>

        {/* Bottom User Profile */}
        <div className="parcl-user-row">
          <div className="parcl-user-avatar">EX</div>
          <div className="parcl-user-meta">
            <span className="parcl-user-name">ElevateX</span>
            <span className="parcl-user-role">Jaipur Fleet Ops</span>
          </div>
        </div>
      </aside>

      {/* ── Main App Content Area ── */}
      <div className="saas-main-area">
        {/* Top Header Bar */}
        <header className="parcl-top-header">
          {/* Page Title */}
          <div className="pth-left">
            <h1 className="pth-title">{PAGE_TITLES[activePage]}</h1>
          </div>

          {/* Search Box */}
          <div className="pth-search-box">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search order ID, customer, phone…"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="pth-search-input"
            />
          </div>

          {/* Right Status & Actions */}
          <div className="pth-right">
            {/* Live Connection & Fleet Status */}
            <div className="pth-telemetry">
              <span className={`pth-dot ${connectionStatus === "open" ? "pth-dot--live" : ""}`} />
              <span className="pth-telemetry-text">
                {connectionStatus === "open" ? "Live" : "Connecting"} · {vehicles.length} Vehicles
              </span>
            </div>

            {/* Current Time — synced from timeapi.io */}
            <div className="pth-clock" title={clockSynced ? "Synced from timeapi.io" : "Local clock"}>
              {liveTime}
            </div>

            {/* Live Weather Pill from OpenWeatherMap */}
            <HeaderWeatherPill />

            {/* Add Order Button — Vibrant Orange Button */}
            <button
              id="open-add-order-btn"
              className="pth-add-btn"
              onClick={() => setOrderModalOpen(true)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span>New Order</span>
            </button>
          </div>
        </header>

        {/* Dynamic Page Component */}
        <main className="saas-body-view">
          {activePage === "overview" && (
            <OverviewPage
              onNavigate={setActivePage}
              sendMessage={sendMessage}
              onOpenOrderModal={() => setOrderModalOpen(true)}
            />
          )}
          {activePage === "track" && <TrackPage sendMessage={sendMessage} />}
          {activePage === "orders" && <OrdersPage />}
          {activePage === "disruptions" && <DisruptionsPage sendMessage={sendMessage} />}
        </main>
      </div>

      {/* Add Order Modal */}
      <AddOrderModal
        isOpen={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        sendMessage={sendMessage}
      />
    </div>
  );
}
