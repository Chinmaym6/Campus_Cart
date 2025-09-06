// frontend/src/shared/utils/url.js
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:4000/api";
export const API_ORIGIN = API_BASE.replace(/\/api\/?$/, "");

/**
 * Turn a server relative path like "/uploads/xyz.jpg" into a full backend URL.
 * - Leaves absolute http/https URLs unchanged.
 */
export function assetUrl(p = "") {
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  if (!p.startsWith("/")) p = `/${p}`;
  return `${API_ORIGIN}${p}`;
}
