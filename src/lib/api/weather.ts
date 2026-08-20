// Intégration météo temps réel via Open-Meteo (https://open-meteo.com).
// Choisie parce que l'API est gratuite et n'exige aucune clé : il n'y a donc
// rien à exposer côté frontend. Un fournisseur à clé (OpenWeatherMap, etc.)
// exigerait de faire transiter l'appel par le backend pour ne pas divulguer
// le secret dans le bundle client — non nécessaire ici.

export interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  location: string;
  icon: "sun" | "cloud" | "cloud-sun" | "rain" | "drizzle" | "storm" | "snow" | "fog";
}

// Ouagadougou — zone d'opération SONABEL de référence utilisée ailleurs dans l'app.
const LATITUDE = 12.3714;
const LONGITUDE = -1.5197;
const LOCATION_LABEL = "Ouagadougou";

function mapWeatherCode(code: number): { condition: string; icon: WeatherData["icon"] } {
  if (code === 0) return { condition: "Ciel dégagé", icon: "sun" };
  if (code === 1 || code === 2) return { condition: "Peu nuageux", icon: "cloud-sun" };
  if (code === 3) return { condition: "Couvert", icon: "cloud" };
  if (code === 45 || code === 48) return { condition: "Brouillard", icon: "fog" };
  if ([51, 53, 55, 56, 57].includes(code)) return { condition: "Bruine", icon: "drizzle" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { condition: "Pluie", icon: "rain" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { condition: "Neige", icon: "snow" };
  if ([95, 96, 99].includes(code)) return { condition: "Orage", icon: "storm" };
  return { condition: "Variable", icon: "cloud" };
}

export async function fetchCurrentWeather(): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Erreur météo (${res.status})`);
  const data = await res.json();
  const { condition, icon } = mapWeatherCode(data.current.weather_code);

  return {
    temperature: Math.round(data.current.temperature_2m),
    humidity: Math.round(data.current.relative_humidity_2m),
    windSpeed: Math.round(data.current.wind_speed_10m),
    location: LOCATION_LABEL,
    condition,
    icon,
  };
}
