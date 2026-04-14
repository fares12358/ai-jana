"use client";
/**
 * Admin Dashboard — /admin
 *
 * Data sources (per ADMIN_INTEGRATION.md):
 *   GET /admin/analytics  → array of per-subject analytics objects
 *   GET /admin/operations → array of lecture pipeline statuses
 *   POST /admin/analytics/generate → trigger re-index
 */
import { useEffect, useRef, useCallback, useState } from "react";
import {
  FaBookOpen, FaCheckCircle, FaClock,
  FaBolt, FaSync, FaBrain, FaExclamationCircle,
} from "react-icons/fa";
import { useAdminData, relTime, DOT_COLORS, PIPELINE_STEPS, trackerProgress, trackerColor } from "@/hooks/useAdminData";
import { apiAdminAnalyticsGenerate } from "@/utils/api";

/* ── Safe Chart hook ─────────────────────────────────────────────── */
function useLineChart(canvasRef, labels, data, color = "#10b981") {
  useEffect(() => {
    if (!canvasRef.current || !data?.length) return;
    let chart = null;
    let mounted = true;

    (async () => {
      const { Chart, registerables } = await import("chart.js");
      Chart.register(...registerables);
      if (!mounted || !canvasRef.current) return;

      const existing = Chart.getChart(canvasRef.current);
      if (existing) existing.destroy();

      const dark = document.documentElement.classList.contains("dark");
      const gc   = dark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";
      const lc   = dark ? "#94a3b8" : "#64748b";

      chart = new Chart(canvasRef.current, {
        type: "line",
        data: {
          labels,
          datasets: [{
            data,
            borderColor:          color,
            backgroundColor:      `${color}18`,
            borderWidth:          2.5,
            tension:              0.45,
            fill:                 true,
            pointBackgroundColor: color,
            pointRadius:          4,
            pointHoverRadius:     6,
          }],
        },
        options: {
          responsive:          true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gc }, ticks: { color: lc, font: { size: 11 } } },
            y: { grid: { color: gc }, ticks: { color: lc, font: { size: 11 } }, beginAtZero: true },
          },
        },
      });
    })();

    return () => { mounted = false; chart?.destroy(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data)]);
}

/* ── Skeleton ─────────────────────────────────────────────────────── */
const Sk = ({ cls = "" }) => (
  <div className={`rounded-lg bg-slate-100 dark:bg-white/8 animate-pulse ${cls}`} />
);

/* ── Pipeline dots ────────────────────────────────────────────────── */
const STEP_COLORS = {
  completed:   "bg-emerald-500",
  in_progress: "bg-amber-400",
  pending:     "bg-slate-200 dark:bg-white/15",
  failed:      "bg-red-500",
};

function PipelineDots({ tracker }) {
  return (
    <div className="flex items-center gap-1">
      {PIPELINE_STEPS.map(({ key, label }) => {
        const val = tracker?.[key] ?? "pending";
        return (
          <div key={key} title={`${label}: ${val}`}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${STEP_COLORS[val] ?? "bg-slate-200 dark:bg-white/15"}`}
          />
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   ADMIN DASHBOARD
══════════════════════════════════════════════════════════════════════ */
export default function AdminDashboardPage() {
  const chartRef = useRef(null);

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
    weeklyData,
    recentLectures,
    totalEngagement,
  } = useAdminData();

  const [genMsg,     setGenMsg]     = useState("");
  const [genLoading, setGenLoading] = useState(false);

  useLineChart(
    chartRef,
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    weeklyData,
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
      label: "Total Subjects",
      value: String(totalSubjects),
      sub:   `${totalLectures} lectures total`,
      Icon:  FaBookOpen,
      bg:    "bg-indigo-50 dark:bg-indigo-500/15",
      ic:    "text-indigo-600 dark:text-indigo-400",
    },
    {
      label: "Completed",
      value: String(completedLec),
      sub:   `${completionRate}% completion rate`,
      Icon:  FaCheckCircle,
      bg:    "bg-emerald-50 dark:bg-emerald-500/15",
      ic:    "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Processing",
      value: String(processingLec),
      sub:   "lectures in pipeline",
      Icon:  FaClock,
      bg:    "bg-amber-50 dark:bg-amber-500/15",
      ic:    "text-amber-600 dark:text-amber-400",
    },
    {
      label: "AI Interactions",
      value: String(totalEngagement),
      sub:   "from analytics data",
      Icon:  FaBrain,
      bg:    "bg-purple-50 dark:bg-purple-500/15",
      ic:    "text-purple-600 dark:text-purple-400",
    },
  ];

  const recentOps = operations.slice(0, 6);
  const hasOps    = recentOps.length > 0;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 sm:space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-black tracking-tight text-slate-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-[13px] sm:text-[14px] text-slate-500 dark:text-slate-400 mt-0.5">
            Platform overview ·{" "}
            <code className="text-[11px] bg-slate-100 dark:bg-white/8 px-1.5 py-0.5 rounded">
              GET /admin/analytics
            </code>{" "}
            &{" "}
            <code className="text-[11px] bg-slate-100 dark:bg-white/8 px-1.5 py-0.5 rounded">
              GET /admin/operations
            </code>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={generate}
            disabled={genLoading || loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold cursor-pointer border-0
                       bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300
                       hover:bg-indigo-200 dark:hover:bg-indigo-500/25 transition-colors disabled:opacity-50">
            <FaBolt className={`text-[10px] ${genLoading ? "animate-pulse" : ""}`} />
            {genLoading ? "Generating…" : "Generate Analytics"}
          </button>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-bold cursor-pointer border-0
                       bg-slate-100 dark:bg-white/8 text-slate-600 dark:text-slate-300
                       hover:bg-slate-200 dark:hover:bg-white/14 transition-colors disabled:opacity-50">
            <FaSync className={`text-[11px] ${loading ? "animate-spin" : ""}`} />
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Feedback banners */}
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
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <p className="text-[11px] sm:text-[12px] font-semibold text-slate-500 dark:text-slate-400 leading-tight pr-1">
                {s.label}
              </p>
              <span className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>
                <s.Icon className={`text-[15px] sm:text-[17px] ${s.ic}`} />
              </span>
            </div>
            {loading
              ? <Sk cls="h-8 w-16 mb-1.5" />
              : <p className="text-[22px] sm:text-[26px] font-black text-slate-900 dark:text-white leading-none">{s.value}</p>
            }
            <p className="text-[11px] sm:text-[12px] text-slate-400 dark:text-slate-500 mt-1.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Lecture status breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Completed",  value: completedLec,  cls: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/12", border: "border-emerald-200 dark:border-emerald-500/20" },
          { label: "Processing", value: processingLec, cls: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-50 dark:bg-amber-500/12",     border: "border-amber-200 dark:border-amber-500/20"   },
          { label: "Failed",     value: failedLec,     cls: "text-red-600 dark:text-red-400",         bg: "bg-red-50 dark:bg-red-500/12",         border: "border-red-200 dark:border-red-500/20"       },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-4 sm:p-5`}>
            <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
              {s.label} Lectures
            </p>
            {loading
              ? <Sk cls="h-8 w-12" />
              : <p className={`text-[28px] font-black ${s.cls}`}>{s.value}</p>
            }
          </div>
        ))}
      </div>

      {/* Activity chart + Pipeline monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">

        {/* Weekly activity chart */}
        <div className="bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl p-4 sm:p-6 shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none">
          <div className="mb-4 sm:mb-5">
            <h2 className="text-[14px] sm:text-[15px] font-black text-slate-900 dark:text-white">
              Lecture Activity This Week
            </h2>
            <p className="text-[12px] text-slate-400 mt-0.5">
              Pipeline events from{" "}
              <code className="text-[11px] bg-slate-100 dark:bg-white/8 px-1 rounded">
                /admin/operations
              </code>
            </p>
          </div>
          <div className="h-[200px] sm:h-[240px]">
            {loading
              ? <div className="h-full rounded-xl bg-slate-100 dark:bg-white/6 animate-pulse" />
              : <canvas ref={chartRef} />
            }
          </div>
        </div>

        {/* Pipeline monitor */}
        <div className="bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl p-4 sm:p-6 shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none">
          <div className="mb-4 sm:mb-5">
            <h2 className="text-[14px] sm:text-[15px] font-black text-slate-900 dark:text-white">
              Pipeline Monitor
            </h2>
            <p className="text-[12px] text-slate-400 mt-0.5">
              <code className="text-[11px] bg-slate-100 dark:bg-white/8 px-1 rounded">
                GET /admin/operations
              </code>{" "}
              · upload → extract → chunk → embed → cards
            </p>
          </div>

          {loading ? (
            <div className="space-y-3.5">
              {[1,2,3,4].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <Sk cls="w-2 h-2 rounded-full flex-shrink-0" />
                  <Sk cls="flex-1 h-4" />
                  <Sk cls="w-20 h-3" />
                </div>
              ))}
            </div>
          ) : hasOps ? (
            <div className="space-y-3.5">
              {recentOps.map((op, i) => {
                const { done, total } = trackerProgress(op.job_tracker);
                const hasError = !!op.job_tracker?.error_traceback;
                return (
                  <div key={op.lecture_id ?? i} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${trackerColor(op.job_tracker)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200 truncate">
                        {op.title ?? "Untitled Lecture"}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <PipelineDots tracker={op.job_tracker} />
                        <span className="text-[11px] text-slate-400">{done}/{total} steps</span>
                        {hasError && (
                          <FaExclamationCircle
                            className="text-red-400 text-[11px]"
                            title={op.job_tracker.error_traceback}
                          />
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 flex-shrink-0 whitespace-nowrap">
                      {relTime(op.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : recentLectures.length > 0 ? (
            <div className="space-y-3.5">
              {recentLectures.slice(0, 6).map((l, i) => (
                <div key={l.id ?? l._id ?? i} className="flex items-start gap-3">
                  <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${DOT_COLORS[i % DOT_COLORS.length]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200 truncate">
                      {l.title ?? l.name ?? `Lecture ${i + 1}`}
                    </p>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 truncate">
                      {l._subjectName ?? ""}
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 flex-shrink-0 whitespace-nowrap">
                    {relTime(l.created_at ?? l.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-slate-400 dark:text-slate-500 text-center py-8">
              No operations data yet.
            </p>
          )}
        </div>
      </div>

      {/* Per-subject AI analytics cards */}
      {!loading && analyticsArr.length > 0 && (
        <div>
          <h2 className="text-[15px] font-black text-slate-900 dark:text-white mb-3">
            Subject Insights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {analyticsArr.slice(0, 6).map((s, i) => (
              <div key={s.subject_id ?? i}
                className="bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-black text-slate-900 dark:text-white truncate">
                    {s.subject_name ?? `Subject ${i + 1}`}
                  </p>
                  <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                    {s.engagement_count ?? 0} chats
                  </span>
                </div>

                {s.ai_insight && (
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                    {s.ai_insight}
                  </p>
                )}

                {s.weak_topics?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 mb-1.5">
                      Weak Topics
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {s.weak_topics.slice(0, 3).map((t, j) => (
                        <span key={j}
                          className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 dark:bg-red-500/12 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/25">
                          {t.topic}
                          {t.frequency_score != null && (
                            <span className="opacity-60 ml-1">· {t.frequency_score}</span>
                          )}
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
      )}

      {/* Empty state */}
      {!loading && analyticsArr.length === 0 && (
        <div className="bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl p-8 text-center shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none">
          <FaBrain className="text-[28px] text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-[14px] font-bold text-slate-500 dark:text-slate-400">No analytics data yet.</p>
          <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-1 mb-4">
            Click <strong>Generate Analytics</strong> to run the first AI analysis.
          </p>
          <button onClick={generate} disabled={genLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold cursor-pointer border-0
                       bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50">
            <FaBolt className="text-[11px]" /> Generate Now
          </button>
        </div>
      )}

    </div>
  );
}