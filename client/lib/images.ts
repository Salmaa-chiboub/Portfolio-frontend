export type ImageFormat = "webp" | "avif" | "jpg" | "png";

export {};

const toAbsoluteUrl = (u: string) => {
  try {
    return new URL(u, window.location.origin).toString();
  } catch {
    return u;
  }
};

export const buildNetlifyImageUrl = (
  url: string,
  opts?: { w?: number; h?: number; format?: ImageFormat; fit?: "cover" | "contain" | "fill" | "inside" | "outside" }
) => {
  const abs = toAbsoluteUrl(url);
  const params = new URLSearchParams();
  params.set("url", abs);
  if (opts?.w) params.set("w", String(opts.w));
  if (opts?.h) params.set("h", String(opts.h));
  if (opts?.format) params.set("fm", opts.format);
  if (opts?.fit) params.set("fit", opts.fit);
  return "/.netlify/images?" + params.toString();
};

export const makeSrcSet = (url: string, widths: number[], format: "webp" | "avif") => {
  return widths.map((w) => `${buildNetlifyImageUrl(url, { w, format })} ${w}w`).join(", ");
};

export const netlifyImagesEnabled = () => {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname || "";
  const isLocal = /^(localhost|127\.|0\.0\.0\.0)/.test(host);
  // Enable on production or when not on localhost
  const prod = (import.meta as any)?.env?.PROD === true;
  return !isLocal || prod;
};
