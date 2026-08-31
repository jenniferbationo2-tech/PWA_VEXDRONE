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
import { Skeleton } from "@/components/ui/Skeleton";

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

  if (isLoading) {
    return (
      <div className="flex h-[62px] items-center gap-3 rounded-lg border border-brand-blue/[0.06] bg-white px-4 shadow-card dark:border-white/10 dark:bg-brand-blue-dark">
        <Skeleton className="h-[26px] w-[26px] rounded-full" />
        <div className="flex-1">
          <Skeleton className="mb-1.5 h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-[62px] items-center rounded-lg border border-brand-blue/[0.06] bg-white px-4 shadow-card dark:border-white/10 dark:bg-brand-blue-dark">
        <span className="text-[13px] text-brand-gray dark:text-white/60">Météo indisponible</span>
      </div>
    );
  }

  const Icon = WEATHER_ICONS[data.icon];

  return (
    <div className="flex items-center gap-3 rounded-lg border border-brand-blue/[0.06] bg-white px-4 py-2.5 shadow-card dark:border-white/10 dark:bg-brand-blue-dark">
      <Icon size={26} className="flex-shrink-0 text-brand-blue dark:text-white" strokeWidth={1.5} />
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-[19px] font-bold leading-none text-brand-blue-dark dark:text-white">
            {data.temperature}°C
          </span>
          <span className="text-[12px] text-brand-gray dark:text-white/60">{data.condition}</span>
        </div>
        <div className="mt-1 flex items-center gap-2.5 text-[11px] text-brand-gray dark:text-white/50">
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
