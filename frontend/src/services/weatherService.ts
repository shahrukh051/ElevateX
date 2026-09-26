// OpenWeatherMap Current Weather Data Service
// API Documentation: https://openweathermap.org/current

export const OPENWEATHER_API_KEY =
  (import.meta as any).env?.VITE_OPENWEATHER_API_KEY ||
  (typeof atob !== "undefined" ? atob("YmQ1ZTM3ODUwMzkzOWRkYWVlNzZmMTJhZDdhOTc2MDg=") : "");
const BASE_URL = "https://api.openweathermap.org/data/2.5/weather";

export interface WeatherData {
  city: string;
  country: string;
  coord: { lat: number; lon: number };
  temp: number;          // Celsius
  feelsLike: number;     // Celsius
  tempMin: number;       // Celsius
  tempMax: number;       // Celsius
  humidity: number;      // %
  pressure: number;      // hPa
  windSpeed: number;     // km/h (converted from m/s)
  windDeg: number;       // meteorological degrees
  clouds: number;        // %
  visibility: number;    // km
  condition: string;     // e.g. "Clouds", "Rain", "Clear", "Mist", "Fog"
  description: string;   // e.g. "broken clouds"
  icon: string;          // e.g. "04n"
  iconUrl: string;       // e.g. "https://openweathermap.org/img/wn/04n@2x.png"
  sunrise: string;       // formatted HH:MM
  sunset: string;        // formatted HH:MM
  updatedAt: string;     // formatted HH:MM:SS
  roadCondition: string; // "Optimal Dry Roads" | "Wet / Hydroplaning Risk" | "Low Visibility Fog" | "High Winds"
  roadConditionClass: "optimal" | "warning" | "danger";
  impactScore: number;   // 0 - 100 delivery safety score
  fleetAdvisory: string; // guidance for dispatch manager
  twoWheelerSafe: boolean; // safety for 2-wheeler couriers
}

export interface RawOpenWeatherResponse {
  coord: { lon: number; lat: number };
  weather: Array<{ id: number; main: string; description: string; icon: string }>;
  base: string;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  visibility?: number;
  wind: { speed: number; deg?: number; gust?: number };
  clouds: { all: number };
  dt: number;
  sys: { country: string; sunrise: number; sunset: number };
  timezone: number;
  id: number;
  name: string;
  cod: number;
}

export function formatTimeFromUtc(epochSec: number, timezoneOffsetSec: number): string {
  const d = new Date((epochSec + timezoneOffsetSec) * 1000);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function assessRoadCondition(
  mainCondition: string,
  windKmH: number,
  visibilityKm: number,
  _clouds: number
): {
  roadCondition: string;
  roadConditionClass: "optimal" | "warning" | "danger";
  impactScore: number;
  fleetAdvisory: string;
  twoWheelerSafe: boolean;
} {
  const cond = mainCondition.toLowerCase();

  if (cond.includes("thunderstorm") || cond.includes("tornado") || cond.includes("squall")) {
    return {
      roadCondition: "Severe Weather / Hazardous",
      roadConditionClass: "danger",
      impactScore: 35,
      fleetAdvisory: "Severe storm alert. Hold 2-wheeler dispatches and advise 4-wheeler vans to reduce speed by 40%.",
      twoWheelerSafe: false,
    };
  }

  if (cond.includes("rain") || cond.includes("drizzle")) {
    return {
      roadCondition: "Wet Tarmac / Braking Caution",
      roadConditionClass: "warning",
      impactScore: 68,
      fleetAdvisory: "Wet road surface. Recommend speed cap of 35 km/h for two-wheelers and +15% delivery ETA buffer.",
      twoWheelerSafe: true,
    };
  }

  if (cond.includes("fog") || cond.includes("mist") || cond.includes("smoke") || cond.includes("haze") || visibilityKm < 2.5) {
    return {
      roadCondition: "Reduced Visibility",
      roadConditionClass: "warning",
      impactScore: 72,
      fleetAdvisory: `Visibility restricted (${visibilityKm} km). Ensure headlights active and caution on Jaipur elevated flyovers.`,
      twoWheelerSafe: true,
    };
  }

  if (windKmH > 35) {
    return {
      roadCondition: "High Crosswinds",
      roadConditionClass: "warning",
      impactScore: 76,
      fleetAdvisory: `Crosswinds reaching ${Math.round(windKmH)} km/h. Advise caution on open highways and bypass roads.`,
      twoWheelerSafe: false,
    };
  }

  return {
    roadCondition: "Optimal Driving Conditions",
    roadConditionClass: "optimal",
    impactScore: 98,
    fleetAdvisory: "Clear road friction and optimal visibility. Nominal dispatch speeds and standard delivery windows active.",
    twoWheelerSafe: true,
  };
}

export function transformWeatherData(data: RawOpenWeatherResponse): WeatherData {
  const mainWeather = data.weather?.[0] ?? { main: "Clear", description: "clear sky", icon: "01d" };
  const windKmH = Math.round((data.wind?.speed ?? 0) * 3.6 * 10) / 10;
  const visibilityKm = Math.round(((data.visibility ?? 10000) / 1000) * 10) / 10;
  const clouds = data.clouds?.all ?? 0;

  const assessment = assessRoadCondition(mainWeather.main, windKmH, visibilityKm, clouds);

  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  return {
    city: data.name || "Jaipur",
    country: data.sys?.country || "IN",
    coord: { lat: data.coord.lat, lon: data.coord.lon },
    temp: Math.round(data.main.temp * 10) / 10,
    feelsLike: Math.round(data.main.feels_like * 10) / 10,
    tempMin: Math.round(data.main.temp_min * 10) / 10,
    tempMax: Math.round(data.main.temp_max * 10) / 10,
    humidity: data.main.humidity,
    pressure: data.main.pressure,
    windSpeed: windKmH,
    windDeg: data.wind?.deg ?? 0,
    clouds,
    visibility: visibilityKm,
    condition: mainWeather.main,
    description: mainWeather.description,
    icon: mainWeather.icon,
    iconUrl: `https://openweathermap.org/img/wn/${mainWeather.icon}@2x.png`,
    sunrise: data.sys?.sunrise ? formatTimeFromUtc(data.sys.sunrise, data.timezone) : "--:--",
    sunset: data.sys?.sunset ? formatTimeFromUtc(data.sys.sunset, data.timezone) : "--:--",
    updatedAt: `${hh}:${mm}:${ss}`,
    ...assessment,
  };
}

export async function fetchWeatherByCity(city: string = "Jaipur"): Promise<WeatherData> {
  const url = `${BASE_URL}?q=${encodeURIComponent(city)}&units=metric&appid=${OPENWEATHER_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OpenWeatherMap error: ${res.status} ${res.statusText}`);
  }
  const data: RawOpenWeatherResponse = await res.json();
  return transformWeatherData(data);
}

export async function fetchWeatherByCoords(lat: number, lon: number): Promise<WeatherData> {
  const url = `${BASE_URL}?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OpenWeatherMap error: ${res.status} ${res.statusText}`);
  }
  const data: RawOpenWeatherResponse = await res.json();
  return transformWeatherData(data);
}
