export type ImageFormat = "webp" | "avif" | "jpg" | "png";

export {};

const toAbsoluteUrl = (u: string) => {
  try {
    if (!u) return u as any;
    // handle protocol relative URLs (//res.cloudinary.com/...)
    if (u.startsWith("//")) return "https:" + u;
    // if already absolute http/https return as-is
    if (/^https?:\/\//i.test(u)) return u;
    // otherwise try to resolve relative to origin
    return new URL(u, window.location.origin).toString();
  } catch {
    return u;
  }
};

export { toAbsoluteUrl };

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
  // Force disabled: do not route images through Netlify proxy. Use original image URLs.
  return false;
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

// Cloudinary helpers
export const CLOUDINARY_CLOUD_NAME = (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;

const isCloudinaryHost = (host: string) => /(^|\.)res\.cloudinary\.com$/i.test(host);
const getHost = (u: string) => {
  try { return new URL(u).host; } catch { return ""; }
};

export const isExternalIconHost = (u: string) => {
  const h = getHost(toAbsoluteUrl(u));
  return /(^|\.)skillicons\.dev$/i.test(h) || /icons8\.com$/i.test(h);
};

const buildTransformString = (opts?: { w?: number; h?: number; crop?: "fill" | "fit" | "limit" }) => {
  const parts: string[] = [];
  parts.push("f_auto", "q_auto", "dpr_auto");
  if (opts?.w) parts.push(`w_${opts.w}`);
  if (opts?.h) parts.push(`h_${opts.h}`);
  if (opts?.crop) parts.push(`c_${opts.crop}`);
  else if (opts?.w || opts?.h) parts.push("c_limit");
  return parts.join(",");
};

export const buildCloudinaryUrl = (url: string, opts?: { w?: number; h?: number; crop?: "fill" | "fit" | "limit" }) => {
  if (!url) return url;
  if (isExternalIconHost(url)) return url;
  const abs = toAbsoluteUrl(url);
  const cloud = CLOUDINARY_CLOUD_NAME;
  if (!cloud) return abs;
  const u = new URL(abs);
  const host = u.host;
  const t = buildTransformString(opts);

  if (isCloudinaryHost(host)) {
    // Inject transforms for existing Cloudinary URLs
    const path = u.pathname;
    if (path.includes("/image/upload/")) {
      u.pathname = path.replace("/image/upload/", `/image/upload/${t}/`);
      return u.toString();
    }
    if (path.includes("/image/fetch/")) {
      // If fetch already has transforms, keep existing. Otherwise inject.
      const afterFetch = path.split("/image/fetch/")[1] || "";
      const hasTransforms = afterFetch && !afterFetch.startsWith("http") && !afterFetch.startsWith("https");
      if (!hasTransforms) {
        u.pathname = path.replace("/image/fetch/", `/image/fetch/${t}/`);
      }
      return u.toString();
    }
    // Default: prepend as fetch of the same URL
    return `https://res.cloudinary.com/${cloud}/image/fetch/${t}/${encodeURIComponent(abs)}`;
  }

  // Not Cloudinary: use fetch delivery
  return `https://res.cloudinary.com/${cloud}/image/fetch/${t}/${encodeURIComponent(abs)}`;
};

export const makeCloudinarySrcSet = (url: string, widths: number[]) =>
  widths.map((w) => `${buildCloudinaryUrl(url, { w })} ${w}w`).join(", ");
