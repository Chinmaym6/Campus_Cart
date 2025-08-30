// Figures out the backend origin from REACT_APP_API_BASE (e.g., http://localhost:4000/api)
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:4000/api";
export const API_ORIGIN = API_BASE.replace(/\/api\/?$/, "");

/**
 * Convert a server path like "/uploads/xyz.jpg" into a full URL to the backend.
 * - Keeps absolute URLs as-is (http/https)
 * - Ensures exactly one slash
 */
export function assetUrl(p = "") {
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  if (!p.startsWith("/")) p = `/${p}`;
  return `${API_ORIGIN}${p}`;
}
