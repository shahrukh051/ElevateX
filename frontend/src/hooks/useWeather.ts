import { useState, useEffect, useCallback, useRef } from "react";
import {
  WeatherData,
  fetchWeatherByCity,
  fetchWeatherByCoords,
} from "../services/weatherService";

export const SUPPORTED_FLEET_HUBS = [
  { city: "Jaipur", label: "Jaipur Hub (HQ)", lat: 26.9124, lon: 75.7873 },
  { city: "Delhi", label: "Delhi NCR Depot", lat: 28.6139, lon: 77.2090 },
  { city: "Mumbai", label: "Mumbai Hub", lat: 19.0760, lon: 72.8777 },
  { city: "Bengaluru", label: "Bengaluru Tech Hub", lat: 12.9716, lon: 77.5946 },
];

export function useWeather(initialCity: string = "Jaipur") {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>(initialCity);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadWeather = useCallback(async (city: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchWeatherByCity(city);
      setWeather(data);
    } catch (err) {
      console.warn("Weather fetch failed:", err);
      setError((err as Error).message || "Failed to load weather data");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWeatherByCoords = useCallback(async (lat: number, lon: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchWeatherByCoords(lat, lon);
      setWeather(data);
      setSelectedCity(data.city);
    } catch (err) {
      console.warn("Coords weather fetch failed:", err);
      setError((err as Error).message || "Failed to load weather for coordinates");
    } finally {
      setLoading(false);
    }
  }, []);

  const changeCity = useCallback((city: string) => {
    setSelectedCity(city);
    loadWeather(city);
  }, [loadWeather]);

  const refresh = useCallback(() => {
    loadWeather(selectedCity);
  }, [loadWeather, selectedCity]);

  // Initial load and periodic refresh every 5 minutes
  useEffect(() => {
    loadWeather(selectedCity);

    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(() => {
      loadWeather(selectedCity);
    }, 5 * 60 * 1000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [selectedCity, loadWeather]);

  return {
    weather,
    loading,
    error,
    selectedCity,
    changeCity,
    refresh,
    loadWeatherByCoords,
  };
}
