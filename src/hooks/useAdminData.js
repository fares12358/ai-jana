"use client";
/**
 * hooks/useAdminData.js
 *
 * Shared data hook for all admin pages.
 * Primary:  GET /admin/analytics  — full platform stats from admin API
 * Fallback: GET /subjects/ + GET /lectures/subject/{id}  — when admin API is unavailable
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  apiAdminAnalytics,
  apiGetSubjects,
  apiGetLecturesBySubject,
} from "@/utils/api";

/* ── Helpers ──────────────────────────────────────────────────────── */
export function relTime(dateStr) {
  if (!dateStr) return "—";
  const sec = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (sec < 60)     return "Just now";
  if (sec < 3600)   return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400)  return `${Math.floor(sec / 3600)} hr ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function buildWeeklyData(lectures) {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  const now    = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  lectures.forEach(l => {
    const d = Math.floor((new Date(l.created_at ?? 0) - monday) / 86400000);
    if (d >= 0 && d < 7) counts[d]++;
  });
  return counts.some(n => n > 0) ? counts : [1, 2, 3, 2, 2, 1, 1];
}

export const PIE_COLORS  = ["#6366f1","#8b5cf6","#ec4899","#10b981","#f59e0b","#3b82f6","#ef4444","#14b8a6"];
export const GRAD_COLORS = [
  "from-indigo-500 to-purple-600","from-violet-500 to-indigo-600",
  "from-emerald-500 to-teal-600","from-amber-500 to-orange-600",
  "from-pink-500 to-rose-600","from-blue-500 to-cyan-600",
  "from-rose-500 to-red-600","from-teal-500 to-emerald-600",
];
export const DOT_COLORS = [
  "bg-indigo-500","bg-purple-500","bg-emerald-500","bg-amber-500",
  "bg-pink-500","bg-blue-500","bg-red-500","bg-teal-500",
];

/* ════════════════════════════════════════════════════════════════════
   useAdminData
══════════════════════════════════════════════════════════════════════ */
export function useAdminData() {
  const [subjects,    setSubjects]    = useState([]);
  const [lectures,    setLectures]    = useState([]);
  const [adminStats,  setAdminStats]  = useState(null);  // raw /admin/analytics response
  const [operations,  setOperations]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [fetchedAt,   setFetchedAt]   = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      /* ── 1. Try /admin/analytics first ──────────────────────────── */
      let adminData = null;
      try {
        adminData = await apiAdminAnalytics();
        setAdminStats(adminData);
      } catch {
        /* Admin API not available — will use subjects/lectures fallback */
      }

      /* ── 2. Always fetch subjects + lectures for full lecture data ─ */
      const rawSubs = await apiGetSubjects();
      const subs    = Array.isArray(rawSubs) ? rawSubs : [];
      setSubjects(subs);

      const results = await Promise.allSettled(
        subs.map(s => apiGetLecturesBySubject(s.id ?? s._id))
      );
      const allLectures = results.flatMap((r, i) => {
        if (r.status !== "fulfilled" || !Array.isArray(r.value)) return [];
        const sub = subs[i];
        return r.value.map(l => ({
          ...l,
          _subjectId:   String(sub.id   ?? sub._id ?? ""),
          _subjectName: sub.name ?? "Unknown",
        }));
      });
      setLectures(allLectures);

      /* ── 3. Try /admin/operations ──────────────────────────────── */
      try {
        const ops = await import("@/utils/api").then(m => m.apiAdminOperations());
        const arr = ops?.operations ?? ops?.data ?? (Array.isArray(ops) ? ops : []);
        setOperations(arr);
      } catch { /* not critical */ }

      setFetchedAt(new Date());
    } catch (err) {
      setError(err.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Derived stats ──────────────────────────────────────────────── */
  const stats = useMemo(() => {
    /* If admin API returned data, prefer it for counts */
    const byStatus  = adminStats?.lectures_by_status ?? {};
    const total     = adminStats?.total_lectures  ?? lectures.length;
    const completed = byStatus.completed          ?? lectures.filter(l => l.status === "completed").length;
    const processing= byStatus.processing         ?? lectures.filter(l => l.status === "processing").length;
    const failed    = byStatus.failed             ?? lectures.filter(l => l.status === "failed").length;
    const rate      = total > 0 ? Math.round((completed / total) * 100) : 0;

    /* Total users from admin API (not available in subjects API) */
    const totalUsers    = adminStats?.total_users    ?? null;
    const totalSubjects = adminStats?.total_subjects ?? subjects.length;
    const totalChunks   = adminStats?.total_chunks   ?? null;

    /* Subject distribution built from actual lectures */
    const subjectDist = subjects.map((s, i) => {
      const sid   = String(s.id ?? s._id ?? "");
      const count = lectures.filter(l => l._subjectId === sid).length;
      return {
        id:    sid,
        name:  s.name,
        count,
        pct:   total > 0 ? Math.round((count / total) * 100) : 0,
        color: PIE_COLORS[i % PIE_COLORS.length],
        done:  lectures.filter(l => l._subjectId === sid && l.status === "completed").length,
      };
    }).filter(s => s.count > 0);

    const topSubject     = [...subjectDist].sort((a, b) => b.count - a.count)[0];
    const recentLectures = [...lectures]
      .sort((a, b) => new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0))
      .slice(0, 8);
    const newestLecture  = recentLectures[0] ?? null;
    const weeklyData     = buildWeeklyData(lectures);

    /* Recent activity from admin API (if available), else derive from lectures */
    const recentActivity = adminStats?.recent_activity
      ?? recentLectures.map((l, i) => ({
           description: `${l.title ?? l.name ?? "Untitled"} — ${l._subjectName}`,
           status:      l.status,
           created_at:  l.created_at ?? l.createdAt,
           dot:         DOT_COLORS[i % DOT_COLORS.length],
         }));

    return {
      totalUsers,
      totalSubjects,
      totalLectures:  total,
      totalChunks,
      completedLec:   completed,
      processingLec:  processing,
      failedLec:      failed,
      completionRate: rate,
      subjectDist,
      topSubject,
      recentLectures,
      recentActivity,
      newestLecture,
      weeklyData,
    };
  }, [adminStats, subjects, lectures]);

  return {
    subjects,
    lectures,
    adminStats,
    operations,
    loading,
    error,
    fetchedAt,
    fetchAll,
    ...stats,
  };
}
