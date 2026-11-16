import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function relativeTime(value?: string | null) {
  if (!value) return "Never";
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Names people know, written the way they're usually written; anything else in sentence case.
const METRIC_NAMES: Record<string, string> = { co2: "CO₂", pm2_5: "PM2.5", pm10: "PM10", tvoc: "TVOC", rssi: "RSSI", snr: "SNR", do_ppm: "Dissolved oxygen" };
export function formatMetric(name: string) {
  const known = METRIC_NAMES[name.toLowerCase()];
  if (known) return known;
  const words = name.replaceAll("_", " ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export const units: Record<string, string> = { temperature: "°C", co2: "ppm", humidity: "%", pm2_5: "µg/m³", current: "A" };
