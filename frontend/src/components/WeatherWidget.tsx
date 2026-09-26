import { useState, useRef, useEffect } from "react";
import { useWeather, SUPPORTED_FLEET_HUBS } from "../hooks/useWeather";
import type { WeatherData } from "../services/weatherService";

export function HeaderWeatherPill() {
  const { weather, loading, error, selectedCity, changeCity, refresh } = useWeather("Jaipur");
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  if (error && !weather) {
    return (
      <div className="sth-weather-chip sth-weather-chip--error" title={`Weather API: ${error}`}>
        <span className="sth-weather-icon">⚠️</span>
        <span className="sth-weather-temp">Weather Offline</span>
      </div>
    );
  }

  return (
    <div className="sth-weather-wrapper" ref={popoverRef}>
      <button
        type="button"
        id="header-weather-btn"
        className={`sth-weather-chip ${open ? "sth-weather-chip--active" : ""}`}
        onClick={() => setOpen(!open)}
        title="Click to view live fleet meteorological conditions and road safety"
      >
        {weather ? (
          <>
            <img
              src={weather.iconUrl}
              alt={weather.description}
              className="sth-weather-img"
              width="22"
              height="22"
            />
            <span className="sth-weather-temp">{Math.round(weather.temp)}°C</span>
            <span className="sth-weather-city">{weather.city}</span>
            <span className="sth-weather-cond-badge">{weather.condition}</span>
          </>
        ) : (
          <>
            <span className="sth-weather-spinner" />
            <span className="sth-weather-loading-text">Loading Weather…</span>
          </>
        )}
      </button>

      {/* Floating Detailed Weather & Dispatch Popover */}
      {open && weather && (
        <div className="sth-weather-popover">
          <div className="swp-header">
            <div className="swp-header-title">
              <span className="swp-title-dot" />
              <span>Fleet Weather Dispatch Monitor</span>
            </div>
            <button className="swp-refresh-btn" onClick={refresh} title="Refresh live weather">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                className={loading ? "spin-icon" : ""}
              >
                <path d="M23 4v6h-6"/>
                <path d="M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            </button>
          </div>

          {/* City / Hub Selector */}
          <div className="swp-hub-selector">
            {SUPPORTED_FLEET_HUBS.map((hub) => (
              <button
                key={hub.city}
                className={`swp-hub-btn ${selectedCity === hub.city ? "swp-hub-btn--active" : ""}`}
                onClick={() => changeCity(hub.city)}
              >
                {hub.city}
              </button>
            ))}
          </div>

          {/* Hero Conditions */}
          <div className="swp-hero">
            <div className="swp-hero-left">
              <img src={weather.iconUrl} alt={weather.description} className="swp-hero-icon" />
              <div>
                <div className="swp-hero-temp">{Math.round(weather.temp)}°C</div>
                <div className="swp-hero-sub">Feels like {Math.round(weather.feelsLike)}°C</div>
              </div>
            </div>
            <div className="swp-hero-right">
              <div className="swp-condition-text">{weather.description}</div>
              <div className="swp-hub-label">{weather.city}, {weather.country}</div>
              <div className="swp-updated-label">Synced: {weather.updatedAt}</div>
            </div>
          </div>

          {/* Meteorological Metrics Grid */}
          <div className="swp-grid">
            <div className="swp-cell">
              <span className="swp-cell-icon">💧</span>
              <div className="swp-cell-info">
                <span className="swp-cell-val">{weather.humidity}%</span>
                <span className="swp-cell-lbl">Humidity</span>
              </div>
            </div>
            <div className="swp-cell">
              <span className="swp-cell-icon">💨</span>
              <div className="swp-cell-info">
                <span className="swp-cell-val">{weather.windSpeed} km/h</span>
                <span className="swp-cell-lbl">Wind</span>
              </div>
            </div>
            <div className="swp-cell">
              <span className="swp-cell-icon">👁️</span>
              <div className="swp-cell-info">
                <span className="swp-cell-val">{weather.visibility} km</span>
                <span className="swp-cell-lbl">Visibility</span>
              </div>
            </div>
            <div className="swp-cell">
              <span className="swp-cell-icon">☁️</span>
              <div className="swp-cell-info">
                <span className="swp-cell-val">{weather.clouds}%</span>
                <span className="swp-cell-lbl">Cloud Cover</span>
              </div>
            </div>
          </div>

          {/* Logistics Road Friction & Courier Safety Assessment */}
          <div className={`swp-safety-card swp-safety-card--${weather.roadConditionClass}`}>
            <div className="swp-safety-header">
              <span className="swp-safety-badge">
                {weather.roadConditionClass === "optimal" ? "🟢" : weather.roadConditionClass === "warning" ? "🟡" : "🔴"}{" "}
                {weather.roadCondition}
              </span>
              <span className="swp-safety-score">Safety: {weather.impactScore}/100</span>
            </div>
            <p className="swp-safety-desc">{weather.fleetAdvisory}</p>
            <div className="swp-courier-tag">
              {weather.twoWheelerSafe ? "🛵 2-Wheeler Couriers: SAFE" : "⚠️ 2-Wheeler Couriers: CAUTION"}
            </div>
          </div>

          <div className="swp-footer">
            <span>Powered by OpenWeatherMap API</span>
            <span>Jaipur Hub</span>
          </div>
        </div>
      )}
    </div>
  );
}

export interface OverviewWeatherCardProps {
  weather?: WeatherData | null;
  loading?: boolean;
  onRefresh?: () => void;
}

export function OverviewWeatherCard({ weather: propWeather, loading: propLoading, onRefresh }: OverviewWeatherCardProps) {
  const hookResult = useWeather("Jaipur");
  const weather = propWeather ?? hookResult.weather;
  const loading = propLoading ?? hookResult.loading;
  const refresh = onRefresh ?? hookResult.refresh;

  if (!weather) {
    return (
      <div className="ov-weather-card ov-weather-card--loading">
        <div className="sth-weather-spinner" />
        <span>Loading live Jaipur weather…</span>
      </div>
    );
  }

  return (
    <div className={`ov-weather-card ov-weather-card--${weather.roadConditionClass}`}>
      <div className="ov-wc-header">
        <div className="ov-wc-title-row">
          <span className="ov-wc-pulse-dot" />
          <span className="ov-wc-title">Jaipur Fleet Weather & Road Impact</span>
        </div>
        <button className="ov-wc-refresh" onClick={refresh} title="Refresh weather">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            className={loading ? "spin-icon" : ""}
          >
            <path d="M23 4v6h-6"/>
            <path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
        </button>
      </div>

      <div className="ov-wc-body">
        {/* Left: Temp and Icon */}
        <div className="ov-wc-hero">
          <img src={weather.iconUrl} alt={weather.description} className="ov-wc-icon" />
          <div className="ov-wc-temp-wrap">
            <span className="ov-wc-temp">{Math.round(weather.temp)}°C</span>
            <span className="ov-wc-feels">Feels {Math.round(weather.feelsLike)}°C</span>
          </div>
        </div>

        {/* Condition + Stats */}
        <div className="ov-wc-condition-info">
          <div className="ov-wc-desc">{weather.description}</div>
          <div className="ov-wc-chips">
            <span className="ov-wc-chip">💧 {weather.humidity}% Humidity</span>
            <span className="ov-wc-chip">💨 {weather.windSpeed} km/h Wind</span>
            <span className="ov-wc-chip">👁️ {weather.visibility} km Vis</span>
          </div>
        </div>
      </div>

      {/* Advisory Bar */}
      <div className="ov-wc-advisory-bar">
        <span className={`ov-wc-status-pill ov-wc-status-pill--${weather.roadConditionClass}`}>
          {weather.roadCondition}
        </span>
        <span className="ov-wc-advisory-text">{weather.fleetAdvisory}</span>
      </div>
    </div>
  );
}

export function MapWeatherOverlay() {
  const { weather, loading, refresh } = useWeather("Jaipur");

  if (!weather) return null;

  return (
    <div className="map-weather-overlay" title="Live Jaipur delivery area meteorological condition">
      <img src={weather.iconUrl} alt={weather.description} className="map-wo-icon" />
      <div className="map-wo-info">
        <div className="map-wo-top">
          <span className="map-wo-temp">{Math.round(weather.temp)}°C</span>
          <span className="map-wo-city">Jaipur</span>
          <span className="map-wo-condition">{weather.condition}</span>
        </div>
        <div className="map-wo-details">
          <span>💧 {weather.humidity}%</span>
          <span>·</span>
          <span>💨 {weather.windSpeed} km/h</span>
          <span>·</span>
          <span className={`map-wo-tag map-wo-tag--${weather.roadConditionClass}`}>
            {weather.roadConditionClass === "optimal" ? "Dry Roads" : "Caution"}
          </span>
        </div>
      </div>
      <button className="map-wo-refresh" onClick={refresh} title="Refresh weather">
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={loading ? "spin-icon" : ""}
        >
          <path d="M23 4v6h-6"/>
          <path d="M1 20v-6h6"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
      </button>
    </div>
  );
}
