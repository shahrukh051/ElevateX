import { useState } from "react";
import { useLiveSolution } from "./hooks/useLiveSolution";
import { useRouteStore } from "./store/useRouteStore";
import MapView from "./components/MapView";
import VehicleList from "./components/VehicleList";
import EventControls from "./components/EventControls";
import ExplanationPanel from "./components/ExplanationPanel";
import QuickActions from "./components/QuickActions";
import MapLayers from "./components/MapLayers";
import AddOrderModal from "./components/AddOrderModal";
import "./App.css";

export default function App() {
  const { sendMessage } = useLiveSolution();
  const connectionStatus = useRouteStore((s) => s.connectionStatus);
  const [orderModalOpen, setOrderModalOpen] = useState(false);

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="app__header">
        <div className="app__header-left">
          {/* Logo icon */}
          <div className="app__logo-icon">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>

          <h1>Last-Mile Route Control</h1>

          <div className="app__header-badges">
            <span className={`app__status-badge app__status-badge--${connectionStatus}`}>
              <span className="dot-pulse" />
              {connectionStatus === "open"
                ? "Live"
                : connectionStatus === "connecting"
                ? "Connecting…"
                : "Disconnected"}
            </span>
            {connectionStatus === "open" && (
              <span className="app__system-badge">System operational</span>
            )}
          </div>
        </div>

        {/* ── Add Order button ── */}
        <button
          id="open-add-order-btn"
          type="button"
          className="add-order-btn"
          onClick={() => setOrderModalOpen(true)}
          title="Place a new delivery order on the map"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          Add Order
        </button>
      </header>

      {/* ── Body ── */}
      <div className="app__body">

        {/* ── Left sidebar ── */}
        <aside className="app__sidebar app__sidebar--left">
          <div className="sb-section">
            <div className="sb-section__header">Fleet Overview</div>
            <VehicleList />
          </div>
          <div className="sb-section">
            <div className="sb-section__header">Disruptions</div>
            <EventControls sendMessage={sendMessage} />
          </div>
        </aside>

        {/* ── Map ── */}
        <main className="app__map">
          <MapView />
        </main>

        {/* ── Right sidebar ── */}
        <aside className="app__sidebar app__sidebar--right">
          <div className="sb-section">
            <div className="sb-section__header">
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent-info)" }}>
                  <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                </svg>
                Re-optimization
              </span>
            </div>
            <ExplanationPanel />
          </div>

          <div className="sb-section">
            <div className="sb-section__header">Quick Actions</div>
            <QuickActions sendMessage={sendMessage} />
          </div>

          <div className="sb-section">
            <div className="sb-section__header">Map Layers</div>
            <MapLayers />
          </div>
        </aside>
      </div>

      {/* ── Add Order Modal ── */}
      <AddOrderModal
        isOpen={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        sendMessage={sendMessage}
      />
    </div>
  );
}
