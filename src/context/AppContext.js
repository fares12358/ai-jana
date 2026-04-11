"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { axiosInstance, setAuthToken } from "@/utils/axios";
import { apiRegister, apiLogin, apiGetMe } from "@/utils/api";

// ─── Storage helpers ──────────────────────────────────────────────────────────
const STORAGE_TOKEN = "lb_token";
const STORAGE_USER  = "lb_user";

function saveSession(token, user) {
  try {
    localStorage.setItem(STORAGE_TOKEN, token);
    localStorage.setItem(STORAGE_USER, JSON.stringify(user));
  } catch { /* ignore quota errors */ }
}

function clearSession() {
  try {
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
  } catch { }
}

function loadSession() {
  try {
    const token = localStorage.getItem(STORAGE_TOKEN);
    const raw   = localStorage.getItem(STORAGE_USER);
    return { token, user: raw ? JSON.parse(raw) : null };
  } catch {
    return { token: null, user: null };
  }
}

// ─── Contexts ─────────────────────────────────────────────────────────────────
const AuthContext  = createContext(null);
const ThemeContext = createContext(null);

// ═════════════════════════════════════════════════════════════════════════════
// AuthProvider
// ═════════════════════════════════════════════════════════════════════════════
export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(false);
  /** true once localStorage has been read and the token validated */
  const [ready,   setReady]   = useState(false);

  // ── Internal persist helper ────────────────────────────────────────────────
  const _persist = useCallback((u, t) => {
    setUser(u);
    setToken(t);
    setAuthToken(t);            // inject / remove from Axios defaults
    if (u && t) saveSession(t, u);
    else        clearSession();
  }, []);

  // ── Hydrate session on mount ───────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { token: savedToken, user: savedUser } = loadSession();

      if (savedToken) {
        // Inject token so the /auth/me call is authenticated
        setAuthToken(savedToken);

        try {
          // Validate the token with the backend — refreshes user data too
          const me = await apiGetMe();
          const u  = {
            id:    me.id    ?? me._id  ?? savedUser?.id ?? savedToken,
            email: me.email ?? savedUser?.email ?? "",
            name:  me.name  ?? me.email ?? savedUser?.name ?? "",
          };
          setToken(savedToken);
          setUser(u);
          saveSession(savedToken, u);   // update stored user with fresh data
        } catch {
          // Token is expired or invalid → clear everything
          // (The 401 interceptor in axios.js will also do this, but we catch here
          //  to avoid a redirect during the initial hydration.)
          _persist(null, null);
        }
      }

      setReady(true);
    })();
  }, [_persist]);

  // ── signup / register → auto-login ────────────────────────────────────────
  const signup = useCallback(async ({ name, email, password }) => {
    setLoading(true);
    try {
      // 1. Register
      await apiRegister({ email, password });

      // 2. Auto-login to obtain the access token
      const loginRes = await apiLogin({ email, password });
      const tok      = loginRes.access_token;

      // 3. Inject token and fetch real user profile
      setAuthToken(tok);
      let u = { id: email, email, name: name || email };
      try {
        const me = await apiGetMe();
        u = { id: me.id ?? me._id ?? email, email: me.email ?? email, name: me.name ?? name ?? email };
      } catch { /* /auth/me not critical here */ }

      _persist(u, tok);
      return { user: u, token: tok };
    } finally {
      setLoading(false);
    }
  }, [_persist]);

  // ── login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async ({ email, password }) => {
    setLoading(true);
    try {
      // OAuth2 password flow → returns { access_token, token_type }
      const res = await apiLogin({ email, password });
      const tok = res.access_token;

      // Inject token then fetch real user data
      setAuthToken(tok);
      let u = { id: email, email, name: email };
      try {
        const me = await apiGetMe();
        u = { id: me.id ?? me._id ?? email, email: me.email ?? email, name: me.name ?? email };
      } catch { /* /auth/me not critical — use fallback user */ }

      _persist(u, tok);
      return { user: u, token: tok };
    } finally {
      setLoading(false);
    }
  }, [_persist]);

  // ── logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(() => _persist(null, null), [_persist]);

  return (
    <AuthContext.Provider value={{ user, token, loading, ready, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

// ═════════════════════════════════════════════════════════════════════════════
// ThemeProvider
// ═════════════════════════════════════════════════════════════════════════════
export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved       = localStorage.getItem("lb_theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark      = saved ? saved === "dark" : prefersDark;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleTheme = useCallback(() => {
    setDark((v) => {
      const next = !v;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("lb_theme", next ? "dark" : "light");
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ dark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
