import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKm(value: number) {
  return `${value.toFixed(value >= 100 ? 0 : 1)} km`;
}

export function formatHours(value: number) {
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  if (hours <= 0) {
    return `${minutes} min`;
  }
  return `${hours} h ${minutes.toString().padStart(2, "0")} min`;
}
