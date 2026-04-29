const DEFAULT_TRUST_PROXY_HOPS = 1;
const UPLOAD_CACHE_MAX_AGE_SECONDS = 31536000;
const UPLOAD_STALE_WHILE_REVALIDATE_SECONDS = 86400;

function getTrustProxySetting() {
  const rawValue = String(process.env.TRUST_PROXY_HOPS || "").trim();
  const parsedValue = Number.parseInt(rawValue, 10);
  if (Number.isInteger(parsedValue) && parsedValue >= 0) return parsedValue;
  return DEFAULT_TRUST_PROXY_HOPS;
}

export function applyProxySettings(app) {
  app.set("trust proxy", getTrustProxySetting());
}

export function setApiNoStoreHeaders(req, res, next) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("CDN-Cache-Control", "no-store");
  res.setHeader("Cloudflare-CDN-Cache-Control", "no-store");
  next();
}

export function setStaticUploadCacheHeaders(res) {
  const cacheValue = `public, max-age=${UPLOAD_CACHE_MAX_AGE_SECONDS}, immutable, stale-while-revalidate=${UPLOAD_STALE_WHILE_REVALIDATE_SECONDS}`;
  res.setHeader("Cache-Control", cacheValue);
  res.setHeader("CDN-Cache-Control", cacheValue);
  res.setHeader("Cloudflare-CDN-Cache-Control", cacheValue);
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("X-Content-Type-Options", "nosniff");
}

export const STATIC_UPLOAD_OPTIONS = {
  maxAge: "365d",
  immutable: true,
  setHeaders: setStaticUploadCacheHeaders,
};
