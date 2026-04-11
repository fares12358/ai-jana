/**
 * utils/axios.js
 *
 * Single Axios instance for the entire app.
 * Base URL is read from NEXT_PUBLIC_API_BASE_URL (.env.local).
 *
 * Features:
 *  - Unwraps `res.data` on every successful response
 *  - Normalises FastAPI error shapes  { detail: string | ValidationError[] }
 *  - Auto-injects Bearer token via setAuthToken()
 *  - On 401 → clears localStorage session + redirects to /login (client only)
 */

import axios from "axios";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://lecture-brain-last-production.up.railway.app";

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

// ── Token helpers ─────────────────────────────────────────────────────────────

/**
 * Call after login / on mount to inject token into every request.
 * Call with null to remove it (logout).
 */
export function setAuthToken(token) {
  if (token) {
    axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete axiosInstance.defaults.headers.common["Authorization"];
  }
}

// ── Response interceptor ──────────────────────────────────────────────────────

axiosInstance.interceptors.response.use(
  // ✅ Success — unwrap .data so callers get the payload directly
  (response) => response.data,

  // ❌ Error — normalise FastAPI error shapes
  (error) => {
    // 401 Unauthorized → clear stored session and redirect to login (client-side only)
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      try {
        localStorage.removeItem("lb_token");
        localStorage.removeItem("lb_user");
      } catch { /* ignore */ }
      // Only redirect if not already on an auth page
      if (!window.location.pathname.startsWith("/login") &&
          !window.location.pathname.startsWith("/signup")) {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      }
    }

    // Normalise error message from FastAPI detail field
    const detail = error?.response?.data?.detail;
    let message = "Something went wrong";

    if (typeof detail === "string") {
      message = detail;
    } else if (Array.isArray(detail)) {
      // Pydantic validation errors: [{ loc, msg, type }]
      message = detail.map((d) => `${d.loc?.slice(-1)[0] ?? ""}: ${d.msg}`).join(", ");
    } else if (error?.response?.data?.message) {
      message = error.response.data.message;
    } else if (error?.message) {
      message = error.message;
    }

    return Promise.reject(new Error(message));
  }
);

export default axiosInstance;
