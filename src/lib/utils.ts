import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// "mounira.diallo@sonabel.bf" -> "Mounira Diallo"
export function prettifyUsername(username: string): string {
  const local = username.split("@")[0];
  const words = local.split(/[._-]+/).filter(Boolean);
  if (words.length === 0) return username;
  return words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

// "Mounira Diallo" -> "MD", "admin" -> "AD"
export function getInitials(displayName: string): string {
  const words = displayName.split(/[\s._-]+/).filter(Boolean);
  const initials = (words[0]?.[0] ?? "") + (words[1]?.[0] ?? words[0]?.[1] ?? "");
  return initials.toUpperCase() || "?";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  const units = ["Ko", "Mo", "Go"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  return new Date(iso).toLocaleDateString("fr-FR");
}
