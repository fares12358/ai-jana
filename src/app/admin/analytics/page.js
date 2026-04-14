"use client";
/**
 * Analytics Page — /admin/analytics
 *
 * Correctly consumes GET /admin/analytics which returns an array of
 * per-subject analytics objects (per ADMIN_INTEGRATION.md):
 *   [{ subject_id, subject_name, weak_topics, common_questions,
 *      confusing_concepts, engagement_count, ai_insight, last_analyzed_at }]
 *
 * Also pulls lecture pipeline data from GET /admin/operations for
 * the ingestion status chart.
 */
import { useEffect, useRef, useCallback, useState } from "react";
import {
  FaSync, FaBolt, FaBrain, FaQuestionCircle,
  FaExclamationTriangle, FaChartLine, FaFolderOpen,
} from "react-icons/fa";
import { useAdminData, relTime, PIE_COLORS, PIPELINE_STEPS } from "@/hooks/useAdminData";
import { apiAdminAnalyticsGenerate } from "@/utils/api";

/* ── Safe chart mount ─────────────────────────────────────────────── */
function useSafeChart(canvasRef, buildConfig, deps) {
  useEffect(() => {
    if (!canvasRef.current) return;
    let chart   = null;
    let mounted = true;

    (async () => {
      const { Chart, registerables } = await import("chart.js");
      Chart.register(...registerables);
      if (!mounted || !canvasRef.current) return;
      const existing = Chart.getChart(canvasRef.current);
      if (existing) existing.destroy();
      chart = new Chart(canvasRef.current, buildConfig());
    })();

    return () => { mounted = false; chart?.destroy(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

const dk       = () => typeof document !== "undefined" && document.documentElement.classList.contains("dark");
const gridClr  = () => dk() ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";
const labelClr = () => dk() ? "#94a3b8" : "#64748b";

/* ── Engagement chart — one bar per subject ───────────────────────── */
function EngagementChart({ subjects }) {
  const ref = useRef(null);
  const labels = subjects.map(s => s.subject_name ?? "?");
  const counts = subjects.map(s => s.engagement_count ?? 0);
  const colors = subjects.map((_, i) => PIE_COLORS[i % PIE_COLORS.length]);

  useSafeChart(ref, () => ({
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "AI Interactions",
        data:  counts,
        backgroundColor: colors.map(c => `${c}cc`),
        hoverBackgroundColor: colors,
        borderRadius: 6,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: labelClr(), font: { size: 11 } } },
        y: { grid: { color: gridClr() }, ticks: { color: labelClr(), font: { size: 11 } }, beginAtZero: true },
      },
    },
  }), [JSON.stringify(counts)]);

  return <canvas ref={ref} />;
}

/* ── Ingestion status bar ─────────────────────────────────────────── */
function StatusBar({ completed, processing, failed }) {
  const ref = useRef(null);
  useSafeChart(ref, () => ({
    type: "bar",
    data: {
      labels: ["Completed", "Processing", "Failed"],
      datasets: [{
        data: [completed, processing, failed],
        backgroundColor: ["rgba(16,185,129,0.8)", "rgba(245,158,11,0.8)", "rgba(239,68,68,0.8)"],
        hoverBackgroundColor: ["#10b981", "#f59e0b", "#ef4444"],
        borderRadius: 6,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: labelClr(), font: { size: 11 } } },
        y: { grid: { color: gridClr() }, ticks: { color: labelClr(), font: { size: 11 } }, beginAtZero: true },
      },
    },
  }), [completed, processing, failed]);
  return <canvas ref={ref} />;
}

/* ── UI helpers ───────────────────────────────────────────────────── */
function Card({ title, subtitle, children }) {
  return (
    <div className="bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl p-4 sm:p-6 shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none">
      {(title || subtitle) && (
        <div className="mb-4 sm:mb-5">
          {title    && <h2 className="text-[14px] sm:text-[15px] font-black text-slate-900 dark:text-white">{title}</h2>}
          {subtitle && <p className="text-[12px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

const Spinner = () => (
  <div className="flex items-center justify-center min-h-[180px]">
    <span className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
  </div>
);

const Sk = ({ cls = "" }) => (
  <div className={`rounded-lg bg-slate-100 dark:bg-white/8 animate-pulse ${cls}`} />
);

/* ════════════════════════════════════════════════════════════════════
   ANALYTICS PAGE
══════════════════════════════════════════════════════════════════════ */
export default function AnalyticsPage() {
  const {
    analyticsArr,
    operations,
    loading,
    error,
    fetchAll,
    totalSubjects,
    totalLectures,
    completedLec,
    processingLec,
    failedLec,
    completionRate,
    totalEngagement,
    subjectDist,
  } = useAdminData();

  const [genMsg,     setGenMsg]     = useState("");
  const [genLoading, setGenLoading] = useState(false);

  /* Filter to subjects that have analytics data */
  const subjectsWithAnalytics = analyticsArr.filter(
    s => (s.weak_topics?.length ?? 0) > 0 ||
         (s.common_questions?.length ?? 0) > 0 ||
         (s.engagement_count ?? 0) > 0
  );

  const generate = useCallback(async () => {
    setGenMsg("");
    setGenLoading(true);
    try {
      const res = await apiAdminAnalyticsGenerate();
      setGenMsg(res?.message ?? "Analytics refreshed successfully.");
      fetchAll();
    } catch (e) {
      setGenMsg(e?.response?.data?.detail ?? e.message ?? "Failed to generate analytics.");
    } finally {
      setGenLoading(false);
    }
  }, [fetchAll]);

  /* KPI cards */
  const STATS = [
    {
      label: "Subjects Tracked",
      value: String(analyticsArr.length),
      sub:   `${totalSubjects} total subjects`,
      color: "text-indigo-600 dark:text-indigo-400",
      bg:    "bg-indigo-50 dark:bg-indigo-500/15",
    },
    {
      label: "Total Interactions",
      value: String(totalEngagement),
      sub:   "across all subjects",
      color: "text-purple-600 dark:text-purple-400",
      bg:    "bg-purple-50 dark:bg-purple-500/15",
    },
    {
      label: "Completion Rate",
      value: `${completionRate}%`,
      sub:   `${completedLec} of ${totalLectures} lectures`,
      color: "text-emerald-600 dark:text-emerald-400",
      bg:    "bg-emerald-50 dark:bg-emerald-500/15",
    },
    {
      label: "Pipeline Issues",
      value: String(failedLec),
      sub:   "failed lectures",
      color: failedLec > 0 ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400",
      bg:    failedLec > 0 ? "bg-red-50 dark:bg-red-500/15"   : "bg-slate-50 dark:bg-white/6",
    },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 sm:space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-black tracking-tight text-slate-900 dark:text-white">
            Analytics Dashboard
          </h1>
          <p className="text-[13px] sm:text-[14px] text-slate-500 dark:text-slate-400 mt-0.5">
            Per-subject AI insights from{" "}
            <code className="text-[11px] bg-slate-100 dark:bg-white/8 px-1.5 py-0.5 rounded">
              GET /admin/analytics
            </code>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={generate} disabled={genLoading || loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold cursor-pointer border-0
                       bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300
                       hover:bg-indigo-200 dark:hover:bg-indigo-500/25 transition-colors disabled:opacity-50">
            <FaBolt className={`text-[10px] ${genLoading ? "animate-pulse" : ""}`} />
            {genLoading ? "Generating…" : "Regenerate"}
          </button>
          <button onClick={fetchAll} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-bold cursor-pointer border-0
                       bg-slate-100 dark:bg-white/8 text-slate-600 dark:text-slate-300
                       hover:bg-slate-200 dark:hover:bg-white/14 transition-colors disabled:opacity-50">
            <FaSync className={`text-[11px] ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{loading ? "Loading…" : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Feedback */}
      {genMsg && (
        <div className={`px-4 py-2.5 rounded-xl text-[13px] font-semibold border
          ${genMsg.toLowerCase().includes("fail") || genMsg.toLowerCase().includes("error")
            ? "bg-red-50 dark:bg-red-500/12 border-red-200 dark:border-red-500/25 text-red-600 dark:text-red-400"
            : "bg-emerald-50 dark:bg-emerald-500/12 border-emerald-200 dark:border-emerald-500/25 text-emerald-600 dark:text-emerald-400"
          }`}>
          {genMsg}
        </div>
      )}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/12 border border-red-200 dark:border-red-500/25 text-red-600 dark:text-red-400 text-[13px] font-semibold">
          ⚠️ {error}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {STATS.map(s => (
          <div key={s.label}
            className="bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none">
            <p className="text-[11px] sm:text-[12px] font-semibold text-slate-500 dark:text-slate-400 mb-2">
              {s.label}
            </p>
            {loading
              ? <Sk cls="h-8 w-16 mb-1.5" />
              : <p className={`text-[22px] sm:text-[26px] font-black leading-none ${s.color}`}>{s.value}</p>
            }
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">

        {/* Engagement per subject */}
        <Card
          title="Student Engagement by Subject"
          subtitle="Total AI chat interactions per subject">
          <div className="h-[200px] sm:h-[230px]">
            {loading ? <Spinner /> : analyticsArr.length === 0
              ? <div className="flex items-center justify-center h-full text-[13px] text-slate-400">No data yet</div>
              : <EngagementChart subjects={analyticsArr} />
            }
          </div>
        </Card>

        {/* Ingestion status */}
        <Card
          title="Lecture Ingestion Status"
          subtitle="Completed vs Processing vs Failed">
          <div className="h-[200px] sm:h-[230px]">
            {loading
              ? <Spinner />
              : <StatusBar completed={completedLec} processing={processingLec} failed={failedLec} />
            }
          </div>
        </Card>
      </div>

      {/* Per-subject deep dive */}
      {!loading && analyticsArr.length > 0 ? (
        <div>
          <h2 className="text-[15px] font-black text-slate-900 dark:text-white mb-3">
            Per-Subject Breakdown
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {analyticsArr.map((s, i) => (
              <div key={s.subject_id ?? i}
                className="bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl p-4 sm:p-6 shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none space-y-4">

                {/* Subject header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-[12px] font-black"
                      style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}>
                      <FaFolderOpen />
                    </span>
                    <p className="text-[14px] font-black text-slate-900 dark:text-white truncate">
                      {s.subject_name ?? `Subject ${i + 1}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <FaChartLine className="text-indigo-400 text-[12px]" />
                    <span className="text-[12px] font-bold text-indigo-600 dark:text-indigo-400">
                      {s.engagement_count ?? 0} chats
                    </span>
                  </div>
                </div>

                {/* AI insight */}
                {s.ai_insight && (
                  <div className="px-3 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20">
                    <div className="flex items-start gap-2">
                      <FaBrain className="text-indigo-500 text-[12px] mt-0.5 flex-shrink-0" />
                      <p className="text-[12px] text-indigo-700 dark:text-indigo-300 leading-relaxed">
                        {s.ai_insight}
                      </p>
                    </div>
                  </div>
                )}

                {/* Weak topics */}
                {s.weak_topics?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 mb-2">
                      Weak Topics
                    </p>
                    <div className="space-y-1.5">
                      {s.weak_topics.map((t, j) => (
                        <div key={j} className="flex items-center justify-between gap-2">
                          <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                            {t.topic}
                          </span>
                          {t.frequency_score != null && (
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-red-400"
                                  style={{ width: `${Math.min(100, (t.frequency_score / 20) * 100)}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-bold text-red-500 dark:text-red-400 w-6 text-right">
                                {t.frequency_score}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Common questions */}
                {s.common_questions?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 mb-2">
                      Common Questions
                    </p>
                    <div className="space-y-1.5">
                      {s.common_questions.slice(0, 3).map((q, j) => (
                        <div key={j} className="flex items-start gap-2">
                          <FaQuestionCircle className="text-amber-400 text-[11px] mt-0.5 flex-shrink-0" />
                          <p className="text-[12px] text-slate-600 dark:text-slate-400 leading-snug">{q}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confusing concepts */}
                {s.confusing_concepts?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 mb-2">
                      Confusing Concepts
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {s.confusing_concepts.slice(0, 4).map((c, j) => (
                        <span key={j}
                          className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-500/12 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/25">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Last analyzed {relTime(s.last_analyzed_at)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : !loading && (
        <div className="bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl p-10 text-center shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none">
          <FaBrain className="text-[32px] text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-[14px] font-bold text-slate-500 dark:text-slate-400">No analytics generated yet.</p>
          <p className="text-[13px] text-slate-400 dark:text-slate-500 mt-1 mb-5">
            Run a batch analysis to see per-subject student insights, weak topics, and AI recommendations.
          </p>
          <button onClick={generate} disabled={genLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold cursor-pointer border-0
                       bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50">
            <FaBolt className="text-[11px]" /> Generate Analytics Now
          </button>
        </div>
      )}
    </div>
  );
}