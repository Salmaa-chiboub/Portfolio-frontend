export type ImageFormat = "webp" | "avif" | "jpg" | "png";

export {};

const toAbsoluteUrl = (u: string) => {
  try {
    // handle protocol relative URLs (//res.cloudinary.com/...)
    if (u.startsWith('//')) return 'https:' + u;
    // if already absolute http/https return as-is
    if (/^https?:\/\//i.test(u)) return u;
    // otherwise try to resolve relative to origin
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
  const onNetlify = /netlify\.app$/.test(host);
  const explicit = ((import.meta as any)?.env?.VITE_USE_NETLIFY_IMAGES as string) === '1';
  // Allow explicit enabling via env var locally during development or CI
  return explicit || onNetlify;
};

export const pingNetlifyImages = async (): Promise<boolean> => {
  if (typeof window === "undefined") return false;
  try {
    const testUrl = "/.netlify/images?url=" + encodeURIComponent("/robots.txt") + "&w=8&fm=webp";
    const res = await fetch(testUrl, { method: "GET", cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
};
