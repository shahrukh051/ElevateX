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
  const hasUnavailable = vehicles.some((v) => v.status === "unavailable");

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
        className={`qa-btn qa-btn--primary ${resetting ? "qa-btn--active" : ""}`}
        style={{ background: "linear-gradient(135deg, #7c3aed, #8b5cf6)" }}
        onClick={handleReset}
        disabled={resetting}
        title="Restore all vehicles to active and reset routes"
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
          <span className="qa-btn__desc">Restore all vehicles to active.</span>
        </span>
      </button>

      {/* Re-optimize now */}
      <button
        id="reoptimize-btn"
        type="button"
        className="qa-btn qa-btn--primary"
        disabled={reoptimizing}
        onClick={handleReoptimize}
        title="Force a route re-optimization"
      >
        <span className="qa-btn__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ animation: reoptimizing ? "spin 1s linear infinite" : "none" }}>
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
        </span>
        <span className="qa-btn__text">
          <span className="qa-btn__title">{reoptimizing ? "Re-optimizing…" : "Re-optimize now"}</span>
          <span className="qa-btn__desc">Force route recalculation.</span>
        </span>
      </button>

      {/* Sync vehicle data */}
      <button
        id="sync-vehicles-btn"
        type="button"
        className="qa-btn"
        disabled={syncing}
        onClick={handleSync}
        title="Sync latest vehicle data from server"
      >
        <span className="qa-btn__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ color: syncing ? "var(--accent-live)" : "var(--text-dim)", animation: syncing ? "spin 1s linear infinite" : "none" }}>
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
        </span>
        <span className="qa-btn__text">
          <span className="qa-btn__title">{syncing ? "Syncing…" : "Sync vehicle data"}</span>
          <span className="qa-btn__desc">Fetch latest status from server.</span>
        </span>
      </button>

      {/* Clear disruptions */}
      <button
        id="clear-disruptions-btn"
        type="button"
        className="qa-btn"
        disabled={clearing}
        onClick={handleClear}
        title="Remove all priority orders and clear the re-optimization log"
      >
        <span className="qa-btn__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ color: clearing ? "var(--accent-alert)" : "var(--text-dim)" }}>
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4h6v2"/>
          </svg>
        </span>
        <span className="qa-btn__text">
          <span className="qa-btn__title">{clearing ? "Clearing…" : "Clear disruptions"}</span>
          <span className="qa-btn__desc">Remove priority orders & log.</span>
        </span>
      </button>

    </div>
  );
}
