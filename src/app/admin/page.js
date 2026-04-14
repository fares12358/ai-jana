"use client";
import { useEffect, useRef } from "react";
import {
  FaFolderOpen, FaBookOpen, FaCheckCircle, FaClock,
  FaBolt, FaBrain, FaBook, FaSync,
} from "react-icons/fa";
import { useAdminData, relTime, DOT_COLORS } from "@/hooks/useAdminData";

/* ── Chart: Weekly lectures created ──────────────────────────────── */
function WeeklyChart({ data }) {
  const ref = useRef(null);
  useEffect(() => {
    let chart;
    (async () => {
      const { Chart, registerables } = await import("chart.js");
      Chart.register(...registerables);
      if (!ref.current) return;
      const dark = document.documentElement.classList.contains("dark");
      const gc   = dark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";
      const lc   = dark ? "#94a3b8" : "#64748b";
      chart = new Chart(ref.current, {
        type: "line",
        data: {
          labels:   ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
          datasets: [{
            data,
            borderColor:          "#10b981",
            backgroundColor:      "rgba(16,185,129,0.08)",
            borderWidth:          2.5,
            tension:              0.45,
            fill:                 true,
            pointBackgroundColor: "#10b981",
            pointRadius:          4,
            pointHoverRadius:     6,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gc }, ticks: { color: lc, font: { size: 11 } } },
            y: { grid: { color: gc }, ticks: { color: lc, font: { size: 11 } }, beginAtZero: true },
          },
        },
      });
    })();
    return () => chart?.destroy();
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={ref} />;
}

/* ── Skeleton loader ──────────────────────────────────────────────── */
function Skeleton({ className = "" }) {
  return <div className={`rounded-lg bg-slate-100 dark:bg-white/8 animate-pulse ${className}`} />;
}

/* ════════════════════════════════════════════════════════════════════
   ADMIN DASHBOARD
══════════════════════════════════════════════════════════════════════ */
export default function AdminDashboardPage() {
  const {
    subjects, loading, error, fetchAll, fetchedAt,
    totalSubjects, totalLectures, completedLec, processingLec, failedLec,
    completionRate, topSubject, newestLecture, recentLectures, weeklyData,
    subjectDist,
  } = useAdminData();

  const STATS = [
    { label: "Total Subjects",    value: String(totalSubjects), sub: `${totalLectures} lectures total`,        Icon: FaFolderOpen,  bg: "bg-indigo-50 dark:bg-indigo-500/15",   ic: "text-indigo-600 dark:text-indigo-400"   },
    { label: "Total Lectures",    value: String(totalLectures), sub: `${completedLec} completed`,              Icon: FaBookOpen,    bg: "bg-purple-50 dark:bg-purple-500/15",   ic: "text-purple-600 dark:text-purple-400"   },
    { label: "Completion Rate",   value: `${completionRate}%`,  sub: "lectures ready for AI",                  Icon: FaCheckCircle, bg: "bg-emerald-50 dark:bg-emerald-500/15", ic: "text-emerald-600 dark:text-emerald-400" },
    { label: "Processing / Failed",value:`${processingLec} / ${failedLec}`, sub: "in queue / errors",         Icon: FaClock,       bg: "bg-amber-50 dark:bg-amber-500/15",    ic: "text-amber-600 dark:text-amber-400"     },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 sm:space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-black tracking-tight text-slate-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-[13px] sm:text-[14px] text-slate-500 dark:text-slate-400 mt-0.5">
            Live overview of all Lecture Brain content
            {fetchedAt && !loading && (
              <span className="ml-2 text-[11px] text-slate-400 dark:text-slate-600">
                · updated {relTime(fetchedAt.toISOString())}
              </span>
            )}
          </p>
        </div>
        <button onClick={fetchAll} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-bold cursor-pointer border-0 bg-slate-100 dark:bg-white/8 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/14 transition-colors disabled:opacity-50">
          <FaSync className={`text-[11px] ${loading ? "animate-spin" : ""}`} />
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* Error */}
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
              <p className="text-[11px] sm:text-[12px] font-semibold text-slate-500 dark:text-slate-400 leading-tight">{s.label}</p>
              <span className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>
                <s.Icon className={`text-[15px] sm:text-[17px] ${s.ic}`} />
              </span>
            </div>
            {loading
              ? <Skeleton className="h-8 w-16 mb-1.5" />
              : <p className="text-[22px] sm:text-[26px] font-black text-slate-900 dark:text-white leading-none">{s.value}</p>
            }
            <p className="text-[11px] sm:text-[12px] text-slate-400 dark:text-slate-500 mt-1.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Weekly chart — full width */}
      <div className="bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl p-4 sm:p-6 shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none">
        <div className="mb-4 sm:mb-5">
          <h2 className="text-[14px] sm:text-[15px] font-black text-slate-900 dark:text-white">Weekly Lecture Activity</h2>
          <p className="text-[12px] text-slate-400 mt-0.5">Lectures created this week by day</p>
        </div>
        <div className="h-[200px] sm:h-[240px]">
          <WeeklyChart data={weeklyData} />
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">

        {/* Insight cards */}
        <div className="flex flex-col gap-3 sm:gap-4">
          {[
            {
              Icon:  FaBolt,
              label: "Top Subject",
              value: loading ? "…" : (topSubject?.name ?? "No data yet"),
              sub:   loading ? "" : topSubject ? `${topSubject.count} lectures · ${topSubject.pct}% of total` : "",
              bg:    "bg-indigo-50 dark:bg-indigo-500/12",
              ic:    "text-indigo-600 dark:text-indigo-400",
            },
            {
              Icon:  FaBrain,
              label: "Latest Lecture",
              value: loading ? "…" : (newestLecture?.title ?? newestLecture?.name ?? "None yet"),
              sub:   loading ? "" : newestLecture ? `${newestLecture._subjectName} · ${relTime(newestLecture.created_at)}` : "",
              bg:    "bg-emerald-50 dark:bg-emerald-500/12",
              ic:    "text-emerald-600 dark:text-emerald-400",
            },
            {
              Icon:  FaBook,
              label: "Content Summary",
              value: loading ? "…" : `${totalSubjects} subjects`,
              sub:   `${totalLectures} lectures · ${completedLec} ready`,
              bg:    "bg-purple-50 dark:bg-purple-500/12",
              ic:    "text-purple-600 dark:text-purple-400",
            },
          ].map(c => (
            <div key={c.label}
              className="bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none flex items-start gap-3 sm:gap-4">
              <span className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg}`}>
                <c.Icon className={`text-[14px] sm:text-[16px] ${c.ic}`} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-400 mb-0.5">{c.label}</p>
                <p className="text-[13px] sm:text-[14px] font-black text-slate-900 dark:text-white leading-tight truncate">{c.value}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">{c.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Recent lectures */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl p-4 sm:p-6 shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none">
          <h2 className="text-[14px] sm:text-[15px] font-black text-slate-900 dark:text-white mb-4 sm:mb-5">
            Recent Lectures
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-white/10 flex-shrink-0" />
                  <Skeleton className="flex-1 h-4" />
                  <Skeleton className="w-14 h-4" />
                </div>
              ))}
            </div>
          ) : recentLectures.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {recentLectures.map((l, i) => {
                const statusColors = {
                  completed:  "bg-emerald-500",
                  processing: "bg-amber-500",
                  failed:     "bg-red-500",
                };
                return (
                  <div key={l.id ?? l._id ?? i} className="flex items-start gap-3">
                    <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${statusColors[l.status] ?? DOT_COLORS[i % DOT_COLORS.length]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200 truncate">{l.title ?? l.name ?? "Untitled"}</p>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400 truncate">
                        {l._subjectName} · {l.status === "completed" ? "Ready for AI" : l.status === "processing" ? "Processing…" : l.status === "failed" ? "Failed" : "Pending"}
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 flex-shrink-0 whitespace-nowrap">
                      {relTime(l.created_at ?? l.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[13px] text-slate-400 dark:text-slate-500 text-center py-8">
              No lectures found. Add your first lecture to get started.
            </p>
          )}

          {/* Subjects tag cloud */}
          {!loading && subjects.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/8">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-3">All Subjects</p>
              <div className="flex flex-wrap gap-2">
                {subjects.map((s, i) => {
                  const dist = subjectDist.find(d => d.id === String(s.id ?? s._id));
                  return (
                    <span key={s.id ?? i}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-white/8 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                      <span className={`w-1.5 h-1.5 rounded-full ${DOT_COLORS[i % DOT_COLORS.length]}`} />
                      {s.name}
                      {dist && <span className="text-slate-400 dark:text-slate-500">({dist.count})</span>}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
