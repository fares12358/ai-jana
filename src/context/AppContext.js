"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { setAuthToken } from "@/utils/axios";
import { apiLogin, apiRegister } from "@/utils/api";

/* ── Admin role check ────────────────────────────────────────────── */
export const isAdminRole = (role) => role === "admin";
export const ADMIN_EMAIL = "admin@lecturebrain.com";

/* ── Storage ─────────────────────────────────────────────────────── */
const STORAGE_TOKEN = "lb_token";
const STORAGE_USER = "lb_user";

function saveSession(token, user) {
  try { localStorage.setItem(STORAGE_TOKEN, token); localStorage.setItem(STORAGE_USER, JSON.stringify(user)); } catch { }
}
function clearSession() {
  try { localStorage.removeItem(STORAGE_TOKEN); localStorage.removeItem(STORAGE_USER); } catch { }
}
function loadSession() {
  try {
    const token = localStorage.getItem(STORAGE_TOKEN);
    const raw = localStorage.getItem(STORAGE_USER);
    return { token, user: raw ? JSON.parse(raw) : null };
  } catch { return { token: null, user: null }; }
}

/* ── Contexts ────────────────────────────────────────────────────── */
const AuthContext = createContext(null);
const ThemeContext = createContext(null);

/* ════════════════════════════════════════════════════════════════════
   AuthProvider
   Login response shape from backend:
   {
     access_token: "...",
     token_type:   "bearer",
     user: { id, email, role, is_active }
   }
══════════════════════════════════════════════════════════════════════ */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const _persist = useCallback((u, t) => {
    setUser(u);
    setToken(t);
    setAuthToken(t);
    if (u && t) saveSession(t, u);
    else clearSession();
  }, []);

  /* ── Build normalised user from login response ───────────────────
     Supports both shapes:
       A) { access_token, token_type, user: {...} }   ← new backend
       B) { access_token, token_type }                ← old backend (no user field)
  ─────────────────────────────────────────────────────────────────── */
  const _buildUser = useCallback((res, emailFallback = "") => {
    const ru = res.user ?? {};
    return {
      id: ru.id ?? ru._id ?? emailFallback,
      email: ru.email ?? emailFallback,
      name: ru.name ?? ru.email ?? emailFallback,
      role: ru.role ?? "user",
      isAdmin: isAdminRole(ru.role ?? ""),
      isActive: ru.is_active ?? true,
    };
  }, []);

  /* Hydrate from localStorage on mount */
  useEffect(() => {
    (async () => {
      const { token: savedToken, user: savedUser } = loadSession();
      if (savedToken && savedUser) {
        // Trust the stored session — no /auth/me call needed since
        // login response already contains the full user object
        setAuthToken(savedToken);
        setToken(savedToken);
        setUser(savedUser);
      }
      setReady(true);
    })();
  }, []);

  /* signup */
  const signup = useCallback(async ({ name, email, password }) => {
    setLoading(true);
    try {
      await apiRegister({ email, password });
      const res = await apiLogin({ email, password });
      const tok = res.access_token;
      setAuthToken(tok);
      const u = _buildUser(res, email);
      if (name && !u.name) u.name = name;
      _persist(u, tok);
      return { user: u, token: tok };
    } finally { setLoading(false); }
  }, [_persist, _buildUser]);

  /* login — reads user from login response directly */
  const login = useCallback(async ({ email, password }) => {
    setLoading(true);
    try {
      const res = await apiLogin({ email, password });
      const tok = res.access_token;
      setAuthToken(tok);
      const u = _buildUser(res, email);
      _persist(u, tok);
      return { user: u, token: tok };
    } finally { setLoading(false); }
  }, [_persist, _buildUser]);

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

/* ════════════════════════════════════════════════════════════════════
   ThemeProvider
══════════════════════════════════════════════════════════════════════ */
export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("lb_theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved ? saved === "dark" : prefersDark;
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
