import { useQuery } from "@tanstack/react-query";
import {
  Sun,
  Cloud,
  CloudSun,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  CloudSnow,
  CloudFog,
  Droplets,
  Wind,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api/client";
import type { WeatherData } from "@/lib/api/weather";

const WEATHER_ICONS: Record<WeatherData["icon"], LucideIcon> = {
  sun: Sun,
  cloud: Cloud,
  "cloud-sun": CloudSun,
  rain: CloudRain,
  drizzle: CloudDrizzle,
  storm: CloudLightning,
  snow: CloudSnow,
  fog: CloudFog,
};

export function WeatherCard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["weather"],
    queryFn: api.getWeather,
    staleTime: 10 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  if (isLoading || isError || !data) {
    return (
      <div className="flex h-[62px] items-center rounded-lg border border-brand-blue/[0.06] bg-white px-4 shadow-card">
        <span className="text-[13px] text-brand-gray">
          {isError ? "Météo indisponible" : "Météo…"}
        </span>
      </div>
    );
  }

  const Icon = WEATHER_ICONS[data.icon];

  return (
    <div className="flex items-center gap-3 rounded-lg border border-brand-blue/[0.06] bg-white px-4 py-2.5 shadow-card">
      <Icon size={26} className="flex-shrink-0 text-brand-blue" strokeWidth={1.5} />
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-[19px] font-bold leading-none text-brand-blue-dark">
            {data.temperature}°C
          </span>
          <span className="text-[12px] text-brand-gray">{data.condition}</span>
        </div>
        <div className="mt-1 flex items-center gap-2.5 text-[11px] text-brand-gray">
          <span className="flex items-center gap-0.5">
            <MapPin size={11} />
            {data.location}
          </span>
          <span className="flex items-center gap-0.5">
            <Droplets size={11} />
            {data.humidity}%
          </span>
          <span className="flex items-center gap-0.5">
            <Wind size={11} />
            {data.windSpeed} km/h
          </span>
        </div>
      </div>
    </div>
  );
}
