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

export const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;

export function getApiUrl(path: string) {
  const cleanedPath = `/${String(path || "").replace(/^\//, "")}`;
  const raw = (API_BASE_URL || "").trim();
  if (!raw) return cleanedPath;
  let base = raw.replace(/\/$/, "");
  if (!/^https?:\/\//i.test(base)) {
    base = base.startsWith("//") ? `https:${base}` : `https://${base}`;
  }
  return `${base}${cleanedPath}`;
}
