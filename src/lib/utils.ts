import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function journeyStage(dayNumber: number, totalDays = 111): "early" | "middle" | "late" {
  const ratio = dayNumber / totalDays;
  if (ratio < 0.33) return "early";
  if (ratio < 0.66) return "middle";
  return "late";
}
