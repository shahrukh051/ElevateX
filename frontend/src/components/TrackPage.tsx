import { useState, useMemo } from "react";
import { useRouteStore } from "../store/useRouteStore";
import { useLogisticsStore, seedParcels, getDriverProfile } from "../store/useLogisticsStore";
import MapView from "./MapView";
import { MapWeatherOverlay } from "./WeatherWidget";
import type { ClientMessage } from "../types";

interface TrackPageProps {
  sendMessage: (msg: ClientMessage) => void;
}

export default function TrackPage({ sendMessage }: TrackPageProps) {
  const vehicles = useRouteStore((s) => s.vehicles);
  const {
    selectedVehicleId,
    setSelectedVehicle,
    parcels,
    accidentEvents,
    triggerAccident,
    reassignToVehicle,
  } = useLogisticsStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "active" | "incidents">("all");
  const [rightPanelTab, setRightPanelTab] = useState<"activity" | "messages">("activity");
  const [finishedOnly, setFinishedOnly] = useState(false);

  const [accidentAlert, setAccidentAlert] = useState<{
    vehicleId: string;
    reassignedTo: string;
    parcelsCount: number;
    nearbyCount: number;
    nearestDist: number;
  } | null>(null);



  // Trigger accident logic
  function handleBreakdownTrigger(vehicleId: string) {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return;

    if (parcels.length === 0) {
      seedParcels(vehicles.map((v) => v.id));
    }

    const event = triggerAccident(vehicleId, vehicle.currentLat, vehicle.currentLng, vehicles);
    sendMessage({ type: "trigger_breakdown", vehicleId });

    if (event) {
      const nearest = event.nearbyCandidates[0];
      setAccidentAlert({
        vehicleId,
        reassignedTo: nearest ? nearest.id : "Nearest Partner",
        parcelsCount: event.parcelsCount,
        nearbyCount: event.nearbyCandidates.length,
        nearestDist: nearest ? nearest.distanceKm : 1.2,
      });
      setTimeout(() => setAccidentAlert(null), 9000);
    }
  }

  // Filtered vehicles list for left sidebar
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const profile = getDriverProfile(v.id);
      const matchesSearch =
        v.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        profile.destHub.toLowerCase().includes(searchQuery.toLowerCase());

      const hasAccident = accidentEvents.some(
        (e) => e.vehicleId === v.id && e.status !== "resolved"
      );

      if (!matchesSearch) return false;
      if (filterTab === "active") return v.status === "active" && !hasAccident;
      if (filterTab === "incidents") return hasAccident;
      return true;
    });
  }, [vehicles, searchQuery, filterTab, accidentEvents]);

  // Selected vehicle & manifest
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
  const selectedProfile = selectedVehicle ? getDriverProfile(selectedVehicle.id) : null;


  // Manifest parcels for the right Activity panel
  const displayParcels = useMemo(() => {
    let list = selectedVehicleId
      ? parcels.filter((p) => p.vehicleId === selectedVehicleId)
      : parcels;

    if (finishedOnly) {
      list = list.filter((p) => p.status === "delivered");
    }
    return list;
  }, [parcels, selectedVehicleId, finishedOnly]);

  const activeIncidentsTotal = accidentEvents.filter((e) => e.status !== "resolved").length;

  return (
    <div className="track-layout">
      {/* ── Top Floating Accident Notification ── */}
      {accidentAlert && (
        <div className="track-emergency-banner">
          <div className="teb-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div className="teb-body">
            <div className="teb-title">
              VEHICLE BREAKDOWN DETECTED &middot; {accidentAlert.vehicleId}
            </div>
            <div className="teb-desc">
              Nearest driver <strong>{accidentAlert.reassignedTo}</strong> ({accidentAlert.nearestDist} km away) identified from {accidentAlert.nearbyCount} nearby partners. {accidentAlert.parcelsCount} parcels ready for automatic pickup &amp; delivery.
            </div>
          </div>
          <button
            className="teb-action-btn"
            onClick={() => {
              if (accidentAlert.reassignedTo) {
                reassignToVehicle(accidentAlert.vehicleId, accidentAlert.reassignedTo);
                setAccidentAlert(null);
              }
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            Auto-Dispatch Now
          </button>
          <button className="teb-close" onClick={() => setAccidentAlert(null)}>&times;</button>
        </div>
      )}

      {/* ── Left Dispatch Column: Delivery Partners & Trips (Image 1 & 4) ── */}
      <aside className="track-sidebar">
        {/* Header */}
        <div className="ts-header">
          <div className="ts-header-title-row">
            <h2 className="ts-title">
              Tracking Delivery
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </h2>
            <span className="ts-count-pill">{vehicles.length} Vehicles</span>
          </div>

          {/* Filter Tabs (Trips, Active, Incidents) */}
          <div className="ts-filter-tabs">
            <button
              className={`ts-tab-btn ${filterTab === "all" ? "ts-tab-btn--active" : ""}`}
              onClick={() => setFilterTab("all")}
            >
              All Trips ({vehicles.length})
            </button>
            <button
              className={`ts-tab-btn ${filterTab === "active" ? "ts-tab-btn--active" : ""}`}
              onClick={() => setFilterTab("active")}
            >
              Active
            </button>
            <button
              className={`ts-tab-btn ${filterTab === "incidents" ? "ts-tab-btn--active" : ""}`}
              onClick={() => setFilterTab("incidents")}
            >
              Alerts {activeIncidentsTotal > 0 && <span className="ts-badge-red">{activeIncidentsTotal}</span>}
            </button>
          </div>

          {/* Search trips */}
          <div className="ts-search-box">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search driver, trip, destination…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ts-search-input"
            />
            {searchQuery && (
              <button className="ts-search-clear" onClick={() => setSearchQuery("")}>
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Vehicle Cards List */}
        <div className="ts-cards-list">
          {filteredVehicles.map((vehicle) => {
            const profile = getDriverProfile(vehicle.id);
            const isSelected = selectedVehicleId === vehicle.id;
            const vehicleParcels = parcels.filter((p) => p.vehicleId === vehicle.id);
            const hasAccident = accidentEvents.some(
              (e) => e.vehicleId === vehicle.id && e.status !== "resolved"
            );


            // Status label
            let statusBadge = (
              <span className="pill-badge pill-badge--green">
                <span className="dot-green" /> In transit
              </span>
            );
            if (hasAccident) {
              statusBadge = (
                <span className="pill-badge pill-badge--rose">
                  Breakdown
                </span>
              );
            } else if (vehicle.status !== "active") {
              statusBadge = (
                <span className="pill-badge pill-badge--slate">
                  Idle
                </span>
              );
            }

            return (
              <div
                key={vehicle.id}
                className={`ts-trip-card ${isSelected ? "ts-trip-card--selected" : ""} ${hasAccident ? "ts-trip-card--accident" : ""}`}
                onClick={() => setSelectedVehicle(isSelected ? null : vehicle.id)}
              >
                {/* Top Card Row: Trip ID, Status, Parcels & Fare */}
                <div className="ts-card-top">
                  <div className="ts-card-id-row">
                    <span className="ts-card-id">CR-JPR-0{vehicle.id.replace("V-", "")}</span>
                    {statusBadge}
                  </div>
                  <span className="ts-card-parcels-count">
                    {vehicleParcels.length} parcels
                  </span>
                </div>

                {/* Driver Row (Image 1 & 4) */}
                <div className="ts-card-driver-row">
                  <div className="ts-card-driver">
                    <div className="ts-card-avatar-wrap">
                      <img src={profile.avatar} alt={profile.name} className="ts-card-avatar" />
                      <span className={`ts-card-status-dot ${hasAccident ? "ts-card-status-dot--red" : ""}`} />
                    </div>
                    <div className="ts-card-driver-info">
                      <div className="ts-card-driver-name">{profile.name}</div>
                      <div className="ts-card-vehicle-type">{profile.vehicleType}</div>
                    </div>
                  </div>

                  {/* Target Focus Button */}
                  <button
                    className="ts-card-focus-btn"
                    title={`Center map on ${vehicle.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVehicle(vehicle.id);
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="22" y1="12" x2="18" y2="12"/>
                      <line x1="6" y1="12" x2="2" y2="12"/>
                      <line x1="12" y1="6" x2="12" y2="2"/>
                      <line x1="12" y1="22" x2="12" y2="18"/>
                    </svg>
                  </button>
                </div>

                {/* Vertical Route Stepper (Image 1 & 4) */}
                <div className="ts-card-route">
                  <div className="ts-route-step">
                    <div className="ts-step-marker ts-step-marker--departure" />
                    <div className="ts-step-text">
                      <span className="ts-step-type">DEPARTURE</span>
                      <span className="ts-step-addr">{profile.originHub}, Jaipur</span>
                    </div>
                  </div>
                  <div className="ts-route-connector" />
                  <div className="ts-route-step">
                    <div className="ts-step-marker ts-step-marker--arrival" />
                    <div className="ts-step-text">
                      <span className="ts-step-type">NEXT DROP</span>
                      <span className="ts-step-addr">{profile.destHub}, Jaipur</span>
                    </div>
                  </div>
                </div>

                {/* Footer Metric */}
                <div className="ts-card-footer">
                  <span className="ts-footer-eta">
                    ETD: 25 min &middot; 14.2 km
                  </span>
                  <span className="ts-footer-arrow">&rsaquo;</span>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── Center Column: Interactive Map with Floating Popover ── */}
      <section className="track-map-container">
        <MapWeatherOverlay />
        <MapView onSimulateAccident={handleBreakdownTrigger} />
      </section>

      {/* ── Right Column: Floating Activity & Orders Feed (only shown when a fleet vehicle is selected) ── */}
      {selectedVehicle && (
        <aside className="track-activity-panel">
          {/* Header Tabs */}
          <div className="tap-header">
            <div className="tap-tabs-row">
              <button
                className={`tap-tab-pill ${rightPanelTab === "activity" ? "tap-tab-pill--active" : ""}`}
                onClick={() => setRightPanelTab("activity")}
              >
                Activity
              </button>
              <button
                className={`tap-tab-pill ${rightPanelTab === "messages" ? "tap-tab-pill--active" : ""}`}
                onClick={() => setRightPanelTab("messages")}
              >
                Manifest
              </button>
            </div>

            <div className="tap-header-actions">
              <span className="tap-notif-bell" title="Live status updates">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              </span>
              <button
                className="tap-close-btn"
                onClick={() => setSelectedVehicle(null)}
                title="Close panel"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Selected context banner */}
          <div className="tap-context-bar">
            <div className="tap-context-text">
              <span className="tap-ctx-bold">{selectedVehicle.id}</span> · {selectedProfile?.name} (
              {displayParcels.length} parcels)
            </div>
            <button className="tap-clear-btn" onClick={() => setSelectedVehicle(null)}>
              Close
            </button>
          </div>

        {/* Chronological Parcel Feed */}
        <div className="tap-feed-list">
          {displayParcels.map((parcel, idx) => {
            let statusPill = (
              <span className="tap-status-badge tap-status-badge--transit">
                ON ITS WAY
              </span>
            );
            let statusIcon = (
              <div className="tap-feed-icon tap-feed-icon--truck">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="3" width="15" height="13"/>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                  <circle cx="5.5" cy="18.5" r="2.5"/>
                  <circle cx="18.5" cy="18.5" r="2.5"/>
                </svg>
              </div>
            );

            if (parcel.status === "delivered") {
              statusPill = (
                <span className="tap-status-badge tap-status-badge--delivered">
                  DELIVERED
                </span>
              );
              statusIcon = (
                <div className="tap-feed-icon tap-feed-icon--check">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              );
            } else if (parcel.status === "reassigned") {
              statusPill = (
                <span className="tap-status-badge tap-status-badge--reassigned">
                  REASSIGNED
                </span>
              );
              statusIcon = (
                <div className="tap-feed-icon tap-feed-icon--reassign">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <polyline points="23 4 23 10 17 10"/>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                  </svg>
                </div>
              );
            } else if (parcel.status === "pending") {
              statusPill = (
                <span className="tap-status-badge tap-status-badge--pending">
                  PENDING
                </span>
              );
              statusIcon = (
                <div className="tap-feed-icon tap-feed-icon--clock">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
              );
            }

            return (
              <div key={parcel.id} className="tap-feed-item">
                <div className="tap-feed-timeline">
                  {statusIcon}
                  {idx < displayParcels.length - 1 && <div className="tap-feed-line" />}
                </div>
                <div className="tap-feed-content">
                  <div className="tap-feed-top">
                    <span className="tap-order-id">#{parcel.orderId}</span>
                    <span className="tap-timestamp">{parcel.estimatedDelivery}</span>
                  </div>
                  <div className="tap-feed-badge-row">{statusPill}</div>
                  <div className="tap-customer-name">{parcel.customer}</div>
                  <div className="tap-destination">{parcel.destination}</div>
                  <div className="tap-pkg-desc">
                    {parcel.description} · <strong>{parcel.weight}</strong>
                    {parcel.originalVehicleId && (
                      <span className="tap-transferred-tag">
                        (Shifted from {parcel.originalVehicleId})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Toggle */}
        <div className="tap-footer">
          <label className="tap-toggle-label">
            <input
              type="checkbox"
              checked={finishedOnly}
              onChange={(e) => setFinishedOnly(e.target.checked)}
              className="tap-checkbox"
            />
            <span>Show delivered only</span>
          </label>

          {/* Quick Breakdown Simulation action if vehicle selected */}
          {selectedVehicle && (
            <button
              className="tap-breakdown-action"
              onClick={() => handleBreakdownTrigger(selectedVehicle.id)}
            >
              Simulate Incident
            </button>
          )}
        </div>
      </aside>
      )}
    </div>
  );
}
