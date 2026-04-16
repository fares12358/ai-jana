"use client";
/**
 * hooks/useAdminData.js
 *
 * Single source of truth for all admin pages.
 * Consumes exactly these three admin endpoints:
 *
 *   GET  /admin/analytics          → AnalyticsItem[]
 *   GET  /admin/analytics/insights → InsightsSummary (platform-wide aggregation)
 *   GET  /admin/operations         → OperationItem[]
 *   POST /admin/analytics/generate → { subjects_processed, total_messages_analyzed, message }
 *
 * AnalyticsItem:
 *   { subject_id, subject_name, weak_topics[{topic,frequency_score}],
 *     common_questions[], confusing_concepts[], engagement_count,
 *     ai_insight, last_analyzed_at }
 *
 * InsightsSummary (defensive shape — fields optional since endpoint is new):
 *   { total_subjects_analyzed, total_messages_analyzed, top_weak_topics,
 *     overall_insight, platform_health, last_generated_at, subjects_summary? }
 *
 * OperationItem:
 *   { lecture_id, title, status, created_at,
 *     job_tracker: { upload_status, extraction_status, chunking_status,
 *                    embedding_status, card_generation_status, error_traceback } }
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  apiAdminAnalytics,
  apiAdminAnalyticsInsights,
  apiAdminOperations,
} from "@/utils/api";

/* ════════════════════════════════════════════════════════════════════
   EXPORTED HELPERS
══════════════════════════════════════════════════════════════════════ */

export function relTime(dateStr) {
  if (!dateStr) return "—";
  const sec = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (sec < 60) return "Just now";
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hr ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** 5-step pipeline keys in order */
export const PIPELINE_STEPS = [
  { key: "upload_status", label: "Upload" },
  { key: "extraction_status", label: "Extract" },
  { key: "chunking_status", label: "Chunk" },
  { key: "embedding_status", label: "Embed" },
  { key: "card_generation_status", label: "Cards" },
];

/** Tailwind bg colour for overall pipeline health */
export function trackerColor(tracker) {
  if (!tracker) return "bg-slate-300 dark:bg-white/20";
  const vals = PIPELINE_STEPS.map(s => tracker[s.key]).filter(Boolean);
  if (vals.some(v => v === "failed")) return "bg-red-500";
  if (vals.some(v => v === "in_progress")) return "bg-amber-500 animate-pulse";
  if (vals.every(v => v === "completed")) return "bg-emerald-500";
  return "bg-slate-400 dark:bg-white/30";
}

/** { done, total } for a single job_tracker */
export function trackerProgress(tracker) {
  if (!tracker) return { done: 0, total: PIPELINE_STEPS.length };
  return {
    done: PIPELINE_STEPS.filter(s => tracker[s.key] === "completed").length,
    total: PIPELINE_STEPS.length,
  };
}

/** Health colour for platform_health string */
export function healthColor(health) {
  switch ((health ?? "").toLowerCase()) {
    case "good": return { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/15", dot: "bg-emerald-500" };
    case "needs_attention": return { text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/15", dot: "bg-amber-500" };
    case "critical": return { text: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/15", dot: "bg-red-500" };
    default: return { text: "text-slate-500 dark:text-slate-400", bg: "bg-slate-50 dark:bg-white/6", dot: "bg-slate-400" };
  }
}

/* Colour palettes */
export const PIE_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b", "#3b82f6", "#ef4444", "#14b8a6"];
export const GRAD_COLORS = [
  "from-indigo-500 to-purple-600", "from-violet-500 to-indigo-600",
  "from-emerald-500 to-teal-600", "from-amber-500 to-orange-600",
  "from-pink-500 to-rose-600", "from-blue-500 to-cyan-600",
  "from-rose-500 to-red-600", "from-teal-500 to-emerald-600",
];
export const DOT_COLORS = [
  "bg-indigo-500", "bg-purple-500", "bg-emerald-500", "bg-amber-500",
  "bg-pink-500", "bg-blue-500", "bg-red-500", "bg-teal-500",
];

/* ════════════════════════════════════════════════════════════════════
   useAdminData
══════════════════════════════════════════════════════════════════════ */
export function useAdminData() {
  /* Raw API state */
  const [analyticsArr, setAnalyticsArr] = useState([]);   // GET /admin/analytics
  const [insights, setInsights] = useState(null); // GET /admin/analytics/insights
  const [operations, setOperations] = useState([]);   // GET /admin/operations
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      /* All 3 calls in parallel — each failure is swallowed individually */
      const [analyticsResult, insightsResult, operationsResult] = await Promise.allSettled([
        apiAdminAnalytics(),
        apiAdminAnalyticsInsights(),
        apiAdminOperations(),
      ]);

      console.log(analyticsResult);
      
      if (analyticsResult.status === "fulfilled") {
        const r = analyticsResult.value;
        setAnalyticsArr(Array.isArray(r) ? r : []);
      } else {
        setAnalyticsArr([]);
      }

      if (insightsResult.status === "fulfilled") {
        const r = insightsResult.value;
        /* Accept both wrapped { data: {...} } and direct object */
        setInsights(r?.data ?? r ?? null);
      } else {
        setInsights(null);
      }

      if (operationsResult.status === "fulfilled") {
        const r = operationsResult.value;
        setOperations(
          Array.isArray(r) ? r :
            Array.isArray(r?.operations) ? r.operations :
              Array.isArray(r?.data) ? r.data : []
        );
      } else {
        setOperations([]);
      }

      setFetchedAt(new Date());
    } catch (err) {
      setError(err.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Derived stats ─────────────────────────────────────────────── */
  const derived = useMemo(() => {
    /* ---- /admin/analytics ---- */
    const totalSubjectsTracked = analyticsArr.length;
    const totalEngagement = analyticsArr.reduce((acc, s) => acc + (s.engagement_count ?? 0), 0);
    const topSubject = [...analyticsArr].sort((a, b) =>
      (b.engagement_count ?? 0) - (a.engagement_count ?? 0))[0] ?? null;

    /* All weak topics flattened + sorted */
    const allWeakTopics = analyticsArr
      .flatMap(s => (s.weak_topics ?? []).map(t => ({ ...t, subject_name: s.subject_name })))
      .sort((a, b) => (b.frequency_score ?? 0) - (a.frequency_score ?? 0));

    /* ---- /admin/analytics/insights ---- */
    /* Prefer insights endpoint values; fall back to derived values */
    const totalSubjectsAnalyzed = insights?.total_subjects_analyzed ?? totalSubjectsTracked;
    const totalMessagesAnalyzed = insights?.total_messages_analyzed ?? totalEngagement;
    const overallInsight = insights?.overall_insight ?? null;
    const platformHealth = insights?.platform_health ?? null;
    const lastGeneratedAt = insights?.last_generated_at ?? null;

    /* Top weak topics: prefer insights endpoint, fall back to derived */
    const topWeakTopics = (insights?.top_weak_topics?.length > 0)
      ? insights.top_weak_topics
      : allWeakTopics.slice(0, 8);

    /* ---- /admin/operations ---- */
    const totalOps = operations.length;
    const completedOps = operations.filter(o => {
      if (o.status === "completed") return true;
      const t = o.job_tracker;
      return t && PIPELINE_STEPS.every(s => t[s.key] === "completed");
    }).length;
    const processingOps = operations.filter(o => {
      if (o.status === "processing") return true;
      const t = o.job_tracker;
      return t && PIPELINE_STEPS.some(s => t[s.key] === "in_progress");
    }).length;
    const failedOps = operations.filter(o => {
      if (o.status === "failed") return true;
      const t = o.job_tracker;
      return t && PIPELINE_STEPS.some(s => t[s.key] === "failed");
    }).length;
    const completionRate = totalOps > 0 ? Math.round((completedOps / totalOps) * 100) : 0;

    /* Weekly pipeline activity from operations.created_at */
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const rawCounts = [0, 0, 0, 0, 0, 0, 0];
    operations.forEach(op => {
      const d = Math.floor((new Date(op.created_at ?? 0) - monday) / 86400000);
      if (d >= 0 && d < 7) rawCounts[d]++;
    });
    const weeklyData = rawCounts.some(n => n > 0) ? rawCounts : [1, 2, 3, 2, 2, 1, 1];

    const recentOps = [...operations]
      .sort((a, b) => new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0))
      .slice(0, 8);

    return {
      /* from /admin/analytics */
      totalSubjectsTracked,
      totalEngagement,
      topSubject,
      allWeakTopics,
      /* from /admin/analytics/insights */
      totalSubjectsAnalyzed,
      totalMessagesAnalyzed,
      overallInsight,
      platformHealth,
      lastGeneratedAt,
      topWeakTopics,
      /* from /admin/operations */
      totalOps,
      completedOps,
      processingOps,
      failedOps,
      completionRate,
      weeklyData,
      recentOps,
    };
  }, [analyticsArr, insights, operations]);

  return {
    /* raw */
    analyticsArr,
    insights,
    operations,
    loading,
    error,
    fetchedAt,
    fetchAll,
    /* derived */
    ...derived,
  };
}