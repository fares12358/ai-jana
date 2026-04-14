"use client";
/**
 * hooks/useAdminData.js — FIXED VERSION
 *
 * API shapes (per ADMIN_INTEGRATION.md):
 * GET /admin/analytics → Array:
 *   [{ subject_id, subject_name, weak_topics, common_questions,
 *      confusing_concepts, engagement_count, ai_insight, last_analyzed_at }]
 * GET /admin/operations → Array:
 *   [{ lecture_id, title, status, job_tracker: { upload_status,
 *      extraction_status, chunking_status, embedding_status,
 *      card_generation_status, error_traceback }, created_at }]
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiAdminAnalytics, apiAdminOperations, apiGetSubjects, apiGetLecturesBySubject } from "@/utils/api";

export function relTime(dateStr) {
  if (!dateStr) return "—";
  const sec = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (sec < 60) return "Just now";
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hr ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export const PIE_COLORS  = ["#6366f1","#8b5cf6","#ec4899","#10b981","#f59e0b","#3b82f6","#ef4444","#14b8a6"];
export const GRAD_COLORS = ["from-indigo-500 to-purple-600","from-violet-500 to-indigo-600","from-emerald-500 to-teal-600","from-amber-500 to-orange-600","from-pink-500 to-rose-600","from-blue-500 to-cyan-600","from-rose-500 to-red-600","from-teal-500 to-emerald-600"];
export const DOT_COLORS  = ["bg-indigo-500","bg-purple-500","bg-emerald-500","bg-amber-500","bg-pink-500","bg-blue-500","bg-red-500","bg-teal-500"];

export const PIPELINE_STEPS = [
  { key: "upload_status",          label: "Upload"  },
  { key: "extraction_status",      label: "Extract" },
  { key: "chunking_status",        label: "Chunk"   },
  { key: "embedding_status",       label: "Embed"   },
  { key: "card_generation_status", label: "Cards"   },
];

export function trackerColor(tracker) {
  if (!tracker) return "bg-slate-300 dark:bg-white/20";
  const vals = PIPELINE_STEPS.map(s => tracker[s.key]).filter(Boolean);
  if (vals.some(v => v === "failed"))      return "bg-red-500";
  if (vals.some(v => v === "in_progress")) return "bg-amber-500";
  if (vals.every(v => v === "completed"))  return "bg-emerald-500";
  return "bg-slate-400";
}

export function trackerProgress(tracker) {
  if (!tracker) return { done: 0, total: PIPELINE_STEPS.length };
  return { done: PIPELINE_STEPS.filter(s => tracker[s.key] === "completed").length, total: PIPELINE_STEPS.length };
}

export function useAdminData() {
  const [analyticsArr, setAnalyticsArr] = useState([]);
  const [operations,   setOperations]   = useState([]);
  const [subjects,     setSubjects]     = useState([]);
  const [lectures,     setLectures]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [fetchedAt,    setFetchedAt]    = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      try { const r = await apiAdminAnalytics(); setAnalyticsArr(Array.isArray(r) ? r : []); } catch { setAnalyticsArr([]); }
      try {
        const ops = await apiAdminOperations();
        setOperations(Array.isArray(ops) ? ops : Array.isArray(ops?.operations) ? ops.operations : Array.isArray(ops?.data) ? ops.data : []);
      } catch { setOperations([]); }

      const rawSubs = await apiGetSubjects();
      const subs    = Array.isArray(rawSubs) ? rawSubs : [];
      setSubjects(subs);

      const results = await Promise.allSettled(subs.map(s => apiGetLecturesBySubject(s.id ?? s._id)));
      setLectures(results.flatMap((r, i) => {
        if (r.status !== "fulfilled" || !Array.isArray(r.value)) return [];
        const sub = subs[i];
        return r.value.map(l => ({ ...l, _subjectId: String(sub.id ?? sub._id ?? ""), _subjectName: sub.name ?? "Unknown" }));
      }));
      setFetchedAt(new Date());
    } catch (err) { setError(err.message || "Failed to load admin data"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const stats = useMemo(() => {
    const totalLectures  = lectures.length;
    const completedLec   = lectures.filter(l => l.status === "completed").length;
    const processingLec  = lectures.filter(l => l.status === "processing").length;
    const failedLec      = lectures.filter(l => l.status === "failed").length;
    const completionRate = totalLectures > 0 ? Math.round((completedLec / totalLectures) * 100) : 0;

    const subjectDist = subjects.map((s, i) => {
      const sid = String(s.id ?? s._id ?? "");
      return { id: sid, name: s.name, count: lectures.filter(l => l._subjectId === sid).length, done: lectures.filter(l => l._subjectId === sid && l.status === "completed").length, pct: totalLectures > 0 ? Math.round((lectures.filter(l => l._subjectId === sid).length / totalLectures) * 100) : 0, color: PIE_COLORS[i % PIE_COLORS.length] };
    }).filter(s => s.count > 0);

    const actSrc     = operations.length > 0 ? operations : lectures;
    const now        = new Date();
    const monday     = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7)); monday.setHours(0,0,0,0);
    const rawCounts  = [0,0,0,0,0,0,0];
    actSrc.forEach(item => { const d = Math.floor((new Date(item.created_at ?? item.createdAt ?? 0) - monday) / 86400000); if (d >= 0 && d < 7) rawCounts[d]++; });
    const weeklyData = rawCounts.some(n => n > 0) ? rawCounts : [1,2,3,2,2,1,1];

    return {
      totalSubjects: subjects.length, totalLectures, completedLec, processingLec, failedLec, completionRate, subjectDist, weeklyData,
      recentLectures: [...lectures].sort((a,b) => new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0)).slice(0,8),
      totalEngagement: analyticsArr.reduce((acc, s) => acc + (s.engagement_count ?? 0), 0),
    };
  }, [analyticsArr, subjects, lectures, operations]);

  return { analyticsArr, operations, subjects, lectures, loading, error, fetchedAt, fetchAll, ...stats };
}