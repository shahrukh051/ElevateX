import { useState } from "react";

// Tiny module-level state so MapView can read layer visibility
// without a context provider. This is intentionally simple.
type LayerKey = "traffic" | "disruptions" | "heatmap";

const _listeners = new Set<() => void>();
const _state: Record<LayerKey, boolean> = { traffic: false, disruptions: true, heatmap: false };

export function getMapLayers() { return { ..._state }; }

export function setMapLayer(key: LayerKey, value: boolean) {
  _state[key] = value;
  _listeners.forEach((fn) => fn());
}

export function subscribeMapLayers(fn: () => void) {
  _listeners.add(fn);
  return () => {
    _listeners.delete(fn);
  };
}

export default function MapLayers() {
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({ ..._state });

  const toggle = (key: LayerKey) => {
    const next = !layers[key];
    setLayers((prev) => ({ ...prev, [key]: next }));
    setMapLayer(key, next);
  };

  const rows: { key: LayerKey; label: string; desc: string; icon: React.ReactNode }[] = [
    {
      key: "traffic",
      label: "Traffic",
      desc: "Show traffic conditions",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
    },
    {
      key: "disruptions",
      label: "Disruptions",
      desc: "Show active disruptions",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      ),
    },
    {
      key: "heatmap",
      label: "Heatmap",
      desc: "Show demand heatmap",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="map-layers">
      {rows.map(({ key, label, desc, icon }) => (
        <div key={key} className="ml-row">
          <span className="ml-row__icon">{icon}</span>
          <span className="ml-row__text">
            <span className="ml-row__name">{label}</span>
            <span className="ml-row__desc">{desc}</span>
          </span>
          <label className="toggle" aria-label={`Toggle ${label} layer`}>
            <input
              id={`layer-${key}`}
              type="checkbox"
              checked={layers[key]}
              onChange={() => toggle(key)}
            />
            <span className="toggle__slider" />
          </label>
        </div>
      ))}
    </div>
  );
}
