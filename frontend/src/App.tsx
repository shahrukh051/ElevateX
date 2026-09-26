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
  overview: "Fleet Overview",
  track: "Live Dispatch Map",
  orders: "Fleet Manifest",
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
  const syncedBaseRef = useRef<number | null>(null); // server epoch ms at sync time
  const syncedAtRef = useRef<number | null>(null);   // local performance.now() at sync time

  const activeIncidentCount = accidentEvents.filter((e) => e.status !== "resolved").length;

  // TimeAPI-synced live clock
  useEffect(() => {
    function formatIST(epochMs: number): string {
      // IST = UTC + 5h30m
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
          // fallback: local time
          setLiveTime(
            new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " IST"
          );
        }
      }, 1000);
    }

    // Fetch accurate time from TimeAPI
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
        // API failed — fall back to local clock
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
      {/* ── Left Slim Dark Rail (Image 4) ── */}
      <aside className="saas-dark-rail">
        {/* Top Logo */}
        <div className="rail-logo" title="ElevateX Logistics Platform">
          <div className="rail-logo-box">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="2" width="9" height="9" rx="2.5" fill="#10b981" />
              <rect x="13" y="2" width="9" height="9" rx="2.5" fill="#3b82f6" />
              <rect x="2" y="13" width="9" height="9" rx="2.5" fill="#8b5cf6" />
              <rect x="13" y="13" width="9" height="9" rx="2.5" fill="#f59e0b" />
            </svg>
          </div>
          <span className="rail-brand-label">EX</span>
        </div>

        {/* Navigation Rail Buttons */}
        <nav className="rail-nav">
          {/* 0. Overview / Dashboard */}
          <button
            className={`rail-nav-btn ${activePage === "overview" ? "rail-nav-btn--active" : ""}`}
            onClick={() => setActivePage("overview")}
            title="Fleet Overview Dashboard"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
            <span className="rail-tooltip">Overview</span>
          </button>

          {/* 1. Track / Live Map */}
          <button
            className={`rail-nav-btn ${activePage === "track" ? "rail-nav-btn--active" : ""}`}
            onClick={() => setActivePage("track")}
            title="Live Dispatch & Map"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
              <line x1="8" y1="2" x2="8" y2="18"/>
              <line x1="16" y1="6" x2="16" y2="22"/>
            </svg>
            <span className="rail-tooltip">Dispatch Map</span>
          </button>

          {/* 2. Orders & Parcels */}
          <button
            className={`rail-nav-btn ${activePage === "orders" ? "rail-nav-btn--active" : ""}`}
            onClick={() => setActivePage("orders")}
            title="Orders & Parcel Manifest"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13"/>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
            {parcels.length > 0 && <span className="rail-badge">{parcels.length}</span>}
            <span className="rail-tooltip">Orders</span>
          </button>

          {/* 3. Incidents / Disruptions */}
          <button
            className={`rail-nav-btn ${activePage === "disruptions" ? "rail-nav-btn--active" : ""}`}
            onClick={() => setActivePage("disruptions")}
            title="Breakdowns & Accident Center"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            {activeIncidentCount > 0 && (
              <span className="rail-badge rail-badge--danger">{activeIncidentCount}</span>
            )}
            <span className="rail-tooltip">Disruptions</span>
          </button>
        </nav>

        {/* Bottom Rail Profile & Settings */}
        <div className="rail-bottom">
          <div className="rail-avatar-wrap" title="Admin: Shahrukh">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=faces"
              alt="Admin"
              className="rail-avatar"
            />
            <span className="rail-avatar-dot" />
          </div>
          <button className="rail-settings-btn" title="Platform Settings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* ── Main App Content Area ── */}
      <div className="saas-main-area">
        {/* Top Header Bar (Image 1 & 4) */}
        <header className="saas-top-header">
          {/* Page Title */}
          <div className="sth-page-title">
            <span className="sth-page-icon">
              {activePage === "overview" && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
              )}
              {activePage === "track" && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                </svg>
              )}
              {activePage === "orders" && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <rect x="1" y="3" width="15" height="13"/>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                </svg>
              )}
              {activePage === "disruptions" && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                </svg>
              )}
            </span>
            <h1 className="sth-page-name">{PAGE_TITLES[activePage]}</h1>
          </div>

          {/* Search Box */}
          <div className="sth-search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search trips, orders, couriers, Jaipur destinations…"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="sth-search-input"
            />
          </div>

          {/* Right Status & Actions */}
          <div className="sth-right-group">
            {/* Live Connection & Fleet Status */}
            <div className="sth-status-chip">
              <span className={`sth-status-dot ${connectionStatus === "open" ? "sth-status-dot--live" : ""}`} />
              <span className="sth-status-label">
                {connectionStatus === "open" ? "Live Telemetry" : "Connecting…"}
              </span>
              <span className="sth-status-divider">·</span>
              <span className="sth-status-fleet">{vehicles.length} Vehicles Online</span>
            </div>

            {/* Current Time — synced from timeapi.io */}
            <div className="sth-clock-chip" title={clockSynced ? "Synced from timeapi.io" : "Local clock (API unavailable)"}>
              <span className={`sth-clock-sync-dot ${clockSynced ? "sth-clock-sync-dot--synced" : "sth-clock-sync-dot--local"}`} />
              {liveTime}
            </div>

            {/* Live Weather Pill from OpenWeatherMap */}
            <HeaderWeatherPill />

            {/* Add Order Button */}
            <button
              id="open-add-order-btn"
              className="sth-add-order-btn"
              onClick={() => setOrderModalOpen(true)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span>New Order</span>
            </button>

            {/* User Profile Pill (Image 1) */}
            <div className="sth-profile-pill">
              <span className="sth-avatar-circle">SK</span>
              <span className="sth-user-name">Shahrukh</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </div>
          </div>
        </header>

        {/* Dynamic Page Component */}
        <main className="saas-body-view">
          {activePage === "overview" && <OverviewPage onNavigate={setActivePage} sendMessage={sendMessage} />}
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
