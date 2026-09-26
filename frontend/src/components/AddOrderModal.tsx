import { useState, useCallback } from "react";
import type { ClientMessage, Stop } from "../types";

interface AddOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  sendMessage: (msg: ClientMessage) => void;
}

// Jaipur city center — default location
const DEFAULT_LAT = "26.9157";
const DEFAULT_LNG = "75.8189";

function nowPlusHours(h: number): string {
  const d = new Date(Date.now() + h * 3600 * 1000);
  // datetime-local format: YYYY-MM-DDTHH:MM
  return d.toISOString().slice(0, 16);
}

export default function AddOrderModal({ isOpen, onClose, sendMessage }: AddOrderModalProps) {
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lng, setLng] = useState(DEFAULT_LNG);
  const [windowStart, setWindowStart] = useState(() => nowPlusHours(0.5));
  const [windowEnd, setWindowEnd] = useState(() => nowPlusHours(4));
  const [priority, setPriority] = useState<"high" | "normal">("high");
  const [demand, setDemand] = useState("1");
  const [submitted, setSubmitted] = useState(false);

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  const isValidLat = !isNaN(latNum) && latNum >= -90 && latNum <= 90;
  const isValidLng = !isNaN(lngNum) && lngNum >= -180 && lngNum <= 180;
  const isValid = isValidLat && isValidLng && windowStart && windowEnd;

  const handleSubmit = useCallback(() => {
    if (!isValid) return;
    const stop: Omit<Stop, "id"> = {
      lat: latNum,
      lng: lngNum,
      timeWindowStart: new Date(windowStart).toISOString(),
      timeWindowEnd: new Date(windowEnd).toISOString(),
      priority,
      demand: parseInt(demand, 10) || 1,
    };
    sendMessage({ type: "trigger_new_order", stop });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
      // reset for next use
      setLat(DEFAULT_LAT);
      setLng(DEFAULT_LNG);
      setWindowStart(nowPlusHours(0.5));
      setWindowEnd(nowPlusHours(4));
      setPriority("high");
      setDemand("1");
    }, 1200);
  }, [isValid, latNum, lngNum, windowStart, windowEnd, priority, demand, sendMessage, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Add new order">
      <div className="modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="modal__header">
          <div className="modal__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
          </div>
          <div>
            <h2 className="modal__title">Add New Order (Jaipur)</h2>
            <p className="modal__subtitle">Select a landmark or set coordinates — the system will re-optimize routes automatically.</p>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="modal__body">

          {/* Location section */}
          <div className="modal__section">
            <div className="modal__section-label">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              Delivery Location in Jaipur
            </div>
            <div className="modal__hint">
              Quick presets for key Jaipur destinations:
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {[
                { name: "NIMS University", lat: "27.1855", lng: "75.9870" },
                { name: "Sindhi Camp", lat: "26.9248", lng: "75.8016" },
                { name: "Railway Station", lat: "26.9200", lng: "75.7878" },
                { name: "GT Mall", lat: "26.8536", lng: "75.8055" },
                { name: "WTP Jaipur", lat: "26.8530", lng: "75.8050" },
                { name: "Hawa Mahal", lat: "26.9239", lng: "75.8267" },
                { name: "Mansarovar", lat: "26.8550", lng: "75.7650" },
              ].map((p) => (
                <button
                  key={p.name}
                  type="button"
                  style={{
                    background: lat === p.lat && lng === p.lng ? "#2563eb" : "rgba(255,255,255,0.06)",
                    border: lat === p.lat && lng === p.lng ? "1px solid #3b82f6" : "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 6,
                    color: lat === p.lat && lng === p.lng ? "#ffffff" : "#94a3b8",
                    padding: "5px 10px",
                    fontSize: 11,
                    cursor: "pointer",
                    fontWeight: 600,
                    transition: "all 0.15s ease",
                  }}
                  onClick={() => { setLat(p.lat); setLng(p.lng); }}
                >
                  📍 {p.name}
                </button>
              ))}
            </div>
            <div className="modal__coord-row">
              <div className="modal__field">
                <label htmlFor="modal-lat" className="modal__field-label">Latitude</label>
                <input
                  id="modal-lat"
                  type="number"
                  step="0.0001"
                  placeholder="e.g. 26.9248"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className={`modal__input ${lat && !isValidLat ? "modal__input--error" : ""}`}
                />
              </div>
              <div className="modal__field">
                <label htmlFor="modal-lng" className="modal__field-label">Longitude</label>
                <input
                  id="modal-lng"
                  type="number"
                  step="0.0001"
                  placeholder="e.g. 75.8016"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className={`modal__input ${lng && !isValidLng ? "modal__input--error" : ""}`}
                />
              </div>
            </div>

            {/* Live preview badge */}
            {isValidLat && isValidLng && (
              <div className="modal__preview">
                <span className="modal__preview-dot" />
                Pin will be placed at {latNum.toFixed(4)}°N, {lngNum.toFixed(4)}°E
              </div>
            )}
          </div>

          {/* Time window section */}
          <div className="modal__section">
            <div className="modal__section-label">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              Delivery Window
            </div>
            <div className="modal__time-row">
              <div className="modal__field">
                <label htmlFor="modal-start" className="modal__field-label">Earliest</label>
                <input
                  id="modal-start"
                  type="datetime-local"
                  value={windowStart}
                  onChange={(e) => setWindowStart(e.target.value)}
                  className="modal__input"
                />
              </div>
              <div className="modal__field">
                <label htmlFor="modal-end" className="modal__field-label">Latest</label>
                <input
                  id="modal-end"
                  type="datetime-local"
                  value={windowEnd}
                  onChange={(e) => setWindowEnd(e.target.value)}
                  className="modal__input"
                />
              </div>
            </div>
          </div>

          {/* Priority & Demand */}
          <div className="modal__section">
            <div className="modal__section-label">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              Order Details
            </div>
            <div className="modal__details-row">
              <div className="modal__field">
                <label htmlFor="modal-priority" className="modal__field-label">Priority</label>
                <select
                  id="modal-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as "high" | "normal")}
                  className="modal__input"
                >
                  <option value="high">🔴 High priority</option>
                  <option value="normal">🔵 Normal</option>
                </select>
              </div>
              <div className="modal__field">
                <label htmlFor="modal-demand" className="modal__field-label">Demand (units)</label>
                <input
                  id="modal-demand"
                  type="number"
                  min="1"
                  max="8"
                  value={demand}
                  onChange={(e) => setDemand(e.target.value)}
                  className="modal__input"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="modal__footer">
          <button id="modal-cancel-btn" type="button" className="modal__btn modal__btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            id="modal-submit-btn"
            type="button"
            className={`modal__btn modal__btn--primary ${submitted ? "modal__btn--success" : ""}`}
            disabled={!isValid || submitted}
            onClick={handleSubmit}
          >
            {submitted ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Order submitted!
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
                Add order & re-optimize
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
