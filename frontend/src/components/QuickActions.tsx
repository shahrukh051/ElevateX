import { useState } from "react";
import { useRouteStore } from "../store/useRouteStore";
import type { ClientMessage } from "../types";

const BACKEND_URL =
  (import.meta.env.VITE_WS_URL as string | undefined)
    ?.replace("ws://", "http://")
    .replace("wss://", "https://")
    .replace("/ws", "") ?? "http://127.0.0.1:8000";

interface QuickActionsProps {
  sendMessage: (msg: ClientMessage) => void;
}

export default function QuickActions({ sendMessage }: QuickActionsProps) {
  const vehicles = useRouteStore((s) => s.vehicles);
  const currentSolution = useRouteStore((s) => s.currentSolution);
  const clearExplanations = useRouteStore((s) => s.clearExplanations);

  const [syncing, setSyncing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [reoptimizing, setReoptimizing] = useState(false);
  const [resetting, setResetting] = useState(false);

  const activeVehicles = vehicles.filter((v) => v.status === "active");

  const firstSegment = (currentSolution?.routes ?? [])
    .flatMap((route) => {
      if (!activeVehicles.some((v) => v.id === route.vehicleId)) return [];
      const chain = [route.vehicleId, ...route.stopIds];
      return chain.slice(0, -1).map((from, i) => ({ from, to: chain[i + 1] }));
    })[0];

  const api = (path: string) => fetch(`${BACKEND_URL}${path}`);

  const handleReset = async () => {
    setResetting(true);
    await api("/reset").catch(() => null);
    setTimeout(() => setResetting(false), 1000);
  };

  const handleReoptimize = async () => {
    setReoptimizing(true);
    if (firstSegment) {
      sendMessage({
        type: "trigger_traffic_delay",
        segmentFrom: firstSegment.from,
        segmentTo: firstSegment.to,
        multiplier: 2.5,
      });
    } else {
      await api("/sync").catch(() => null);
    }
    setTimeout(() => setReoptimizing(false), 1500);
  };

  const handleSync = async () => {
    setSyncing(true);
    await api("/sync").catch(() => null);
    setTimeout(() => setSyncing(false), 800);
  };

  const handleClear = async () => {
    setClearing(true);
    await api("/clear").catch(() => null);
    clearExplanations();
    setTimeout(() => setClearing(false), 800);
  };

  return (
    <div className="quick-actions">

      {/* Reset Fleet */}
      <button
        id="reset-fleet-btn"
        type="button"
        className="qa-btn"
        onClick={handleReset}
        disabled={resetting}
        title="Restore all vehicles to active and reset Jaipur live map state"
      >
        <span className="qa-btn__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ animation: resetting ? "spin 1s linear infinite" : "none" }}>
            <path d="M9 12l2 2 4-4"/>
            <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c2.39 0 4.56.93 6.16 2.43"/>
            <path d="M21 3v4h-4"/>
          </svg>
        </span>
        <span className="qa-btn__text">
          <span className="qa-btn__title">{resetting ? "Resetting…" : "Reset Fleet"}</span>
          <span className="qa-btn__desc">Restore Jaipur live map state</span>
        </span>
      </button>

      {/* Re-optimize Route — highlighted */}
      <button
        id="reoptimize-btn"
        type="button"
        className="qa-btn qa-btn--highlight"
        disabled={reoptimizing}
        onClick={handleReoptimize}
        title="Force re-optimization of active Jaipur delivery routes"
      >
        <span className="qa-btn__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ animation: reoptimizing ? "spin 1s linear infinite" : "none" }}>
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
        </span>
        <span className="qa-btn__text">
          <span className="qa-btn__title">{reoptimizing ? "Re-optimizing…" : "Re-optimize Route"}</span>
          <span className="qa-btn__desc">Recalculate active Jaipur delivery</span>
        </span>
      </button>

      {/* Sync vehicle data */}
      <button
        id="sync-vehicles-btn"
        type="button"
        className="qa-btn"
        disabled={syncing}
        onClick={handleSync}
        title="Refresh fleet telemetry from server"
      >
        <span className="qa-btn__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ animation: syncing ? "spin 1s linear infinite" : "none" }}>
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
        </span>
        <span className="qa-btn__text">
          <span className="qa-btn__title">{syncing ? "Syncing…" : "Sync Vehicle Data"}</span>
          <span className="qa-btn__desc">Refresh fleet telemetry</span>
        </span>
      </button>

      {/* Clear disruptions */}
      <button
        id="clear-disruptions-btn"
        type="button"
        className="qa-btn"
        disabled={clearing}
        onClick={handleClear}
        title="Remove resolved road alerts from Jaipur routes"
      >
        <span className="qa-btn__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
          </svg>
        </span>
        <span className="qa-btn__text">
          <span className="qa-btn__title">{clearing ? "Clearing…" : "Clear Disruptions"}</span>
          <span className="qa-btn__desc">Remove resolved road alerts</span>
        </span>
      </button>

    </div>
  );
}
