import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function stripHtml(input: string | undefined | null) {
  if (!input) return "";
  return String(input).replace(/<[^>]*>/g, "").trim();
}

export function isValidUrl(url: string) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return /^[a-zA-Z]+:/.test(u.protocol); // ensures protocol present
  } catch {
    return false;
  }
}
