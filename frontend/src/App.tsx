import { useState } from "react";
import { useLiveSolution } from "./hooks/useLiveSolution";
import { useRouteStore } from "./store/useRouteStore";
import MapView from "./components/MapView";
import VehicleList from "./components/VehicleList";
import QuickActions from "./components/QuickActions";
import MapLayers from "./components/MapLayers";
import AddOrderModal from "./components/AddOrderModal";
import "./App.css";

export default function App() {
  const { sendMessage } = useLiveSolution();
  const connectionStatus = useRouteStore((s) => s.connectionStatus);
  const vehicles = useRouteStore((s) => s.vehicles);
  const currentSolution = useRouteStore((s) => s.currentSolution);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("fleet");

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) + " IST";

  // Pick first active route for the "Active Delivery" card
  const activeRoute = currentSolution?.routes?.[0];
  const activeVehicle = vehicles.find((v) => v.id === activeRoute?.vehicleId);

  return (
    <div className="app">

      {/* ── Narrow icon nav ── */}
      <nav className="app__nav">
        <div className="app__nav-logo">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#ff6b35" stroke="#ff6b35" strokeWidth="1" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="app__nav-items">
          {[
            { id: "fleet", icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>) },
            { id: "routes", icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>) },
            { id: "history", icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>) },
            { id: "vehicles", icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>) },
          ].map(({ id, icon }) => (
            <button
              key={id}
              className={`app__nav-btn ${activeNav === id ? "app__nav-btn--active" : ""}`}
              onClick={() => setActiveNav(id)}
              title={id}
            >
              {icon}
            </button>
          ))}
        </div>
        <button className="app__nav-btn app__nav-btn--settings" title="Settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        </button>
      </nav>

      {/* ── Vehicle panel ── */}
      <aside className="app__vehicle-panel">
        {/* Panel header */}
        <div className="vp__header">
          <div className="vp__breadcrumb">LIVE FLEET / JAIPUR</div>
          <div className="vp__title-row">
            <h2 className="vp__title">Vehicle overview</h2>
            <span className="vp__count">{vehicles.length} vehicles</span>
          </div>
          <div className="vp__status-row">
            <span className={`vp__status-dot vp__status-dot--${connectionStatus}`} />
            <span className="vp__status-text">
              {connectionStatus === "open" ? "Live" : connectionStatus === "connecting" ? "Connecting…" : "Disconnected"}
            </span>
            {connectionStatus === "open" && <span className="vp__sys-badge">System operational</span>}
          </div>
          <div className="vp__search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input type="text" placeholder="Search fleet" />
          </div>
        </div>
        {/* Vehicle list */}
        <div className="vp__list">
          <VehicleList />
        </div>
      </aside>

      {/* ── Map area ── */}
      <main className="app__map">
        {/* Top header bar */}
        <div className="map__topbar">
          <div className="map__topbar-left">
            <span className="map__breadcrumb">OPERATIONS / JAIPUR, INDIA</span>
            <h1 className="map__title">Last-Mile Route Control</h1>
          </div>
          <div className="map__topbar-right">
            <div className="map__search-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input type="text" placeholder="Search Jaipur route" />
            </div>
            <button
              id="open-add-order-btn"
              className="map__add-btn"
              onClick={() => setOrderModalOpen(true)}
              title="Add new delivery order"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Map itself */}
        <div className="map__canvas">
          <MapView />

          {/* Active Delivery overlay */}
          {activeRoute && activeVehicle && (
            <div className="map__active-card">
              <div className="mac__header">
                <span className="mac__label">ACTIVE DELIVERY / JAIPUR</span>
              </div>
              <div className="mac__order-id">{activeRoute.vehicleId}</div>
              <div className="mac__route">Jaipur → {activeRoute.stopIds?.[0] ?? "En Route"}</div>
              <div className="mac__stats">
                <div className="mac__stat">
                  <span className="mac__stat-label">Route state</span>
                  <span className="mac__stat-val mac__stat-val--active">ACTIVE</span>
                </div>
                <div className="mac__stat">
                  <span className="mac__stat-label">Stops</span>
                  <span className="mac__stat-val">{activeRoute.stopIds?.length ?? 0} / {activeRoute.stopIds?.length ?? 0}</span>
                </div>
                <div className="mac__stat">
                  <span className="mac__stat-label">ETA</span>
                  <span className="mac__stat-val">{timeStr}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom order info bar */}
        {activeRoute && (
          <div className="map__bottom-bar">
            <div className="mbb__id">
              <span className="mbb__order-id">{activeRoute.vehicleId}</span>
              <span className="mbb__status">EN ROUTE</span>
            </div>
            <div className="mbb__col">
              <span className="mbb__label">FROM</span>
              <span className="mbb__val">Jaipur International Airport</span>
            </div>
            <div className="mbb__col">
              <span className="mbb__label">TO</span>
              <span className="mbb__val">Vaishali Nagar, Jaipur</span>
            </div>
            <div className="mbb__col">
              <span className="mbb__label">CURRENT LOCATION</span>
              <span className="mbb__val">Malviya Nagar</span>
            </div>
            <div className="mbb__col">
              <span className="mbb__label">REMAINING / UPDATE</span>
              <span className="mbb__val">6.8 km · 4 min ago</span>
            </div>
          </div>
        )}
      </main>

      {/* ── Right operations panel ── */}
      <aside className="app__ops-panel">
        <div className="ops__header">
          <div className="ops__section-label">QUICK ACTIONS</div>
          <div className="ops__title">Operations</div>
          <div className="ops__subtitle">Keep Jaipur routes clear and fleet information synchronized.</div>
        </div>

        <div className="ops__actions">
          <QuickActions sendMessage={sendMessage} />
        </div>

        <div className="ops__last-synced">LAST SYNCED · {timeStr}</div>

        <div className="ops__layers-header">MAP LAYERS</div>
        <div className="ops__layers">
          <MapLayers />
        </div>
      </aside>

      {/* ── Modal ── */}
      <AddOrderModal
        isOpen={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        sendMessage={sendMessage}
      />
    </div>
  );
}
