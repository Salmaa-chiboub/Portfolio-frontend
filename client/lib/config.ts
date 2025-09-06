export const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;

export const MAX_PROJECT_IMAGES = (() => {
  const raw = (import.meta as any).env?.VITE_MAX_PROJECT_IMAGES as string | undefined;
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 5;
})();

export const MAX_PROJECT_LINKS = (() => {
  const raw = (import.meta as any).env?.VITE_MAX_PROJECT_LINKS as string | undefined;
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 2;
})();

export function getApiUrl(path: string) {
  const cleanedPath = `/${String(path || "").replace(/^\//, "")}`;
  const base = API_BASE_URL && /^https?:\/\//i.test(API_BASE_URL) ? API_BASE_URL.replace(/\/$/, "") : "";
  if (base) return `${base}${cleanedPath}`;
  return cleanedPath; // same-origin relative by default (works in dev/prod with proxy)
}
