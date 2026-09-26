import { useState, useCallback } from "react";
import type { ClientMessage, Stop } from "../types";
import { useLogisticsStore, type Parcel } from "../store/useLogisticsStore";
import { useRouteStore } from "../store/useRouteStore";

interface AddOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  sendMessage: (msg: ClientMessage) => void;
}

// Jaipur city center — default location
const DEFAULT_LAT = "26.9157";
const DEFAULT_LNG = "75.8189";

const JAIPUR_PRESETS = [
  { name: "NIMS University", lat: "27.1855", lng: "75.9870" },
  { name: "Sindhi Camp", lat: "26.9248", lng: "75.8016" },
  { name: "Railway Station", lat: "26.9200", lng: "75.7878" },
  { name: "GT Mall", lat: "26.8536", lng: "75.8055" },
  { name: "WTP Jaipur", lat: "26.8530", lng: "75.8050" },
  { name: "Hawa Mahal", lat: "26.9239", lng: "75.8267" },
  { name: "Mansarovar", lat: "26.8550", lng: "75.7650" },
  { name: "Malviya Nagar", lat: "26.8530", lng: "75.8135" },
];

function nowPlusHours(h: number): string {
  const d = new Date(Date.now() + h * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}

export default function AddOrderModal({ isOpen, onClose, sendMessage }: AddOrderModalProps) {
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lng, setLng] = useState(DEFAULT_LNG);
  const [selectedPreset, setSelectedPreset] = useState("Sindhi Camp");
  const [windowStart, setWindowStart] = useState(() => nowPlusHours(0.5));
  const [windowEnd, setWindowEnd] = useState(() => nowPlusHours(4));
  const [priority, setPriority] = useState<"high" | "normal">("high");
  const [demand, setDemand] = useState("1");
  const [customerName, setCustomerName] = useState("Aarav Singhania");
  const [itemDescription, setItemDescription] = useState("Urgent Express Delivery");
  const [submitted, setSubmitted] = useState(false);

  const addParcel = useLogisticsStore((s) => s.addParcel);
  const vehicles = useRouteStore((s) => s.vehicles);

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  const isValidLat = !isNaN(latNum) && latNum >= -90 && latNum <= 90;
  const isValidLng = !isNaN(lngNum) && lngNum >= -180 && lngNum <= 180;
  const isValid = isValidLat && isValidLng && windowStart && windowEnd;

  const handleSubmit = useCallback(() => {
    if (!isValid) return;

    // Send to backend routing solver
    const stop: Omit<Stop, "id"> = {
      lat: latNum,
      lng: lngNum,
      timeWindowStart: new Date(windowStart).toISOString(),
      timeWindowEnd: new Date(windowEnd).toISOString(),
      priority,
      demand: parseInt(demand, 10) || 1,
    };
    sendMessage({ type: "trigger_new_order", stop });

    // Pick first active vehicle or V-01 for immediate manifest assignment
    const targetVehicle = vehicles.find((v) => v.status === "active")?.id || "V-01";
    const newOrderId = `CR-JPR-${Math.floor(100 + Math.random() * 900)}`;

    const newParcel: Parcel = {
      id: `PKG-${Date.now().toString().slice(-4)}`,
      orderId: newOrderId,
      description: itemDescription || "Express Delivery Package",
      weight: `${(parseFloat(demand) * 1.2).toFixed(1)} kg`,
      destination: selectedPreset || `Jaipur (${latNum.toFixed(3)}, ${lngNum.toFixed(3)})`,
      destinationLat: latNum,
      destinationLng: lngNum,
      status: "in_transit",
      priority,
      estimatedDelivery: new Date(Date.now() + 30 * 60000).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      }) + " IST",
      customer: customerName || "Customer",
      vehicleId: targetVehicle,
    };

    addParcel(newParcel);
    setSubmitted(true);

    setTimeout(() => {
      setSubmitted(false);
      onClose();
      // Reset form
      setLat(DEFAULT_LAT);
      setLng(DEFAULT_LNG);
      setWindowStart(nowPlusHours(0.5));
      setWindowEnd(nowPlusHours(4));
      setPriority("high");
      setDemand("1");
    }, 1000);
  }, [
    isValid,
    latNum,
    lngNum,
    windowStart,
    windowEnd,
    priority,
    demand,
    itemDescription,
    selectedPreset,
    customerName,
    vehicles,
    sendMessage,
    addParcel,
    onClose,
  ]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Add new order">
      <div className="modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="modal__header">
          <div className="modal__icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
          </div>
          <div>
            <h2 className="modal__title">Create Priority Delivery Order</h2>
            <p className="modal__subtitle">Dispatch a new shipment across Jaipur with real-time route optimization</p>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Close modal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="modal__body">

          {/* Quick Jaipur Landmark Presets */}
          <div className="modal__section">
            <div className="modal__section-label">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              Select Jaipur Delivery Hub
            </div>
            <div className="modal__presets-grid">
              {JAIPUR_PRESETS.map((p) => {
                const isActive = lat === p.lat && lng === p.lng;
                return (
                  <button
                    key={p.name}
                    type="button"
                    className={`modal__preset-chip ${isActive ? "modal__preset-chip--active" : ""}`}
                    onClick={() => {
                      setLat(p.lat);
                      setLng(p.lng);
                      setSelectedPreset(p.name);
                    }}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Coordinates row */}
          <div className="modal__coord-row">
            <div className="modal__field">
              <label htmlFor="modal-lat" className="modal__field-label">Latitude</label>
              <input
                id="modal-lat"
                type="number"
                step="0.0001"
                placeholder="26.9157"
                value={lat}
                onChange={(e) => {
                  setLat(e.target.value);
                  setSelectedPreset("");
                }}
                className={`modal__input ${lat && !isValidLat ? "modal__input--error" : ""}`}
              />
            </div>
            <div className="modal__field">
              <label htmlFor="modal-lng" className="modal__field-label">Longitude</label>
              <input
                id="modal-lng"
                type="number"
                step="0.0001"
                placeholder="75.8189"
                value={lng}
                onChange={(e) => {
                  setLng(e.target.value);
                  setSelectedPreset("");
                }}
                className={`modal__input ${lng && !isValidLng ? "modal__input--error" : ""}`}
              />
            </div>
          </div>

          {/* Customer & Item */}
          <div className="modal__coord-row">
            <div className="modal__field">
              <label htmlFor="modal-customer" className="modal__field-label">Recipient Name</label>
              <input
                id="modal-customer"
                type="text"
                placeholder="Customer Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="modal__input"
              />
            </div>
            <div className="modal__field">
              <label htmlFor="modal-item" className="modal__field-label">Package Description</label>
              <input
                id="modal-item"
                type="text"
                placeholder="Electronics, Apparel, Medicine…"
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                className="modal__input"
              />
            </div>
          </div>

          {/* Priority & Demand */}
          <div className="modal__details-row">
            <div className="modal__field">
              <label htmlFor="modal-priority" className="modal__field-label">Delivery Priority</label>
              <select
                id="modal-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as "high" | "normal")}
                className="modal__input"
              >
                <option value="high">🔴 High Priority (Express Dispatch)</option>
                <option value="normal">🔵 Standard Delivery</option>
              </select>
            </div>
            <div className="modal__field">
              <label htmlFor="modal-demand" className="modal__field-label">Weight / Units (1-8)</label>
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

          {/* Time window section */}
          <div className="modal__time-row">
            <div className="modal__field">
              <label htmlFor="modal-start" className="modal__field-label">Earliest Delivery Time</label>
              <input
                id="modal-start"
                type="datetime-local"
                value={windowStart}
                onChange={(e) => setWindowStart(e.target.value)}
                className="modal__input"
              />
            </div>
            <div className="modal__field">
              <label htmlFor="modal-end" className="modal__field-label">Latest Deadline</label>
              <input
                id="modal-end"
                type="datetime-local"
                value={windowEnd}
                onChange={(e) => setWindowEnd(e.target.value)}
                className="modal__input"
              />
            </div>
          </div>

          {/* Live pin preview */}
          {isValidLat && isValidLng && (
            <div className="modal__preview">
              <span className="modal__preview-dot" />
              <span>
                Coordinates locked: <strong>{latNum.toFixed(4)}°N, {lngNum.toFixed(4)}°E</strong> (
                {selectedPreset || "Custom Location"})
              </span>
            </div>
          )}

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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>Order Created & Dispatched!</span>
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
                <span>Add Order & Optimize Route</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
