"use client";
import { useEffect, useRef } from "react";
import {
  FaFolderOpen, FaBookOpen, FaCheckCircle, FaClock,
  FaArrowUp, FaBrain, FaQuestion, FaSync,
} from "react-icons/fa";
import { useAdminData, relTime, PIE_COLORS } from "@/hooks/useAdminData";

/* ── Chart theme helpers ──────────────────────────────────────────── */
const dk        = () => typeof document !== "undefined" && document.documentElement.classList.contains("dark");
const gridClr   = () => dk() ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";
const labelClr  = () => dk() ? "#94a3b8" : "#64748b";

/* ── Generic chart hook ───────────────────────────────────────────── */
function useChart(factory, deps = []) {
  const ref = useRef(null);
  useEffect(() => {
    let chart;
    (async () => {
      const { Chart, registerables } = await import("chart.js");
      Chart.register(...registerables);
      if (!ref.current) return;
      chart = factory(ref.current, Chart);
    })();
    return () => chart?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

/* ── Weekly line chart (lectures created this week) ──────────────── */
function WeeklyChart({ data }) {
  const ref = useChart((canvas, Chart) => new Chart(canvas, {
    type: "line",
    data: {
      labels: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
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
        x: { grid: { color: gridClr() }, ticks: { color: labelClr(), font: { size: 11 } } },
        y: { grid: { color: gridClr() }, ticks: { color: labelClr(), font: { size: 11 } }, beginAtZero: true },
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [JSON.stringify(data)]);
  return <canvas ref={ref} />;
}

/* ── Subject distribution pie (no labels inside, custom legend below) */
function SubjectPieChart({ dist }) {
  const ref = useChart((canvas, Chart) => new Chart(canvas, {
    type: "pie",
    data: {
      labels: new Array(dist.length).fill(""),
      datasets: [{
        data:            dist.map(d => d.count),
        backgroundColor: dist.map(d => d.color),
        borderWidth:     2,
        borderColor:     dk() ? "#0f1117" : "#ffffff",
        hoverOffset:     12,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${dist[ctx.dataIndex]?.name ?? ""}: ${ctx.parsed} lectures`,
          },
        },
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [JSON.stringify(dist)]);
  return <canvas ref={ref} />;
}

/* ── Ingestion status bar chart ───────────────────────────────────── */
function StatusBarChart({ completed, processing, failed }) {
  const ref = useChart((canvas, Chart) => new Chart(canvas, {
    type: "bar",
    data: {
      labels: ["Completed","Processing","Failed"],
      datasets: [{
        data:                [completed, processing, failed],
        backgroundColor:     ["rgba(16,185,129,0.80)","rgba(245,158,11,0.80)","rgba(239,68,68,0.80)"],
        hoverBackgroundColor:["#10b981","#f59e0b","#ef4444"],
        borderRadius:        6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: labelClr(), font: { size: 11 } } },
        y: { grid: { color: gridClr() }, ticks: { color: labelClr(), font: { size: 11 } }, beginAtZero: true },
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [completed, processing, failed]);
  return <canvas ref={ref} />;
}

/* ── Card wrapper ─────────────────────────────────────────────────── */
function Card({ title, subtitle, children, className = "" }) {
  return (
    <div className={`bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl p-4 sm:p-6 shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none ${className}`}>
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

/* ── Spinner ──────────────────────────────────────────────────────── */
function Spinner() {
  return (
    <div className="flex items-center justify-center h-full min-h-[180px]">
      <span className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   ANALYTICS PAGE
══════════════════════════════════════════════════════════════════════ */
export default function AnalyticsPage() {
  const {
    subjects,
    lectures,
    loading,
    error,
    fetchAll,
    totalSubjects,
    totalLectures,
    completedLec,
    processingLec,
    failedLec,
    completionRate,
    subjectDist,
    topSubject,
    newestLecture,
    weeklyData,
  } = useAdminData();

  /* ── KPI cards ─────────────────────────────────────────────────── */
  const STATS = [
    {
      label: "Total Subjects",
      value: loading ? "—" : String(totalSubjects),
      delta: `${totalLectures} total lectures`,
      Icon:  FaFolderOpen,
      bg:    "bg-indigo-50 dark:bg-indigo-500/15",
      ic:    "text-indigo-600 dark:text-indigo-400",
    },
    {
      label: "Total Lectures",
      value: loading ? "—" : String(totalLectures),
      delta: `${completedLec} completed`,
      Icon:  FaBookOpen,
      bg:    "bg-purple-50 dark:bg-purple-500/15",
      ic:    "text-purple-600 dark:text-purple-400",
    },
    {
      label: "Completion Rate",
      value: loading ? "—" : `${completionRate}%`,
      delta: "lectures ready for AI",
      Icon:  FaCheckCircle,
      bg:    "bg-emerald-50 dark:bg-emerald-500/15",
      ic:    "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Processing / Failed",
      value: loading ? "—" : `${processingLec} / ${failedLec}`,
      delta: "in queue / errored",
      Icon:  FaClock,
      bg:    "bg-amber-50 dark:bg-amber-500/15",
      ic:    "text-amber-600 dark:text-amber-400",
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
            Live insights derived from all subjects and lectures
          </p>
        </div>
        <button onClick={fetchAll} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-bold cursor-pointer border-0
                     bg-slate-100 dark:bg-white/8 text-slate-600 dark:text-slate-300
                     hover:bg-slate-200 dark:hover:bg-white/14 transition-colors disabled:opacity-50">
          <FaSync className={`text-[11px] ${loading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">{loading ? "Loading…" : "Refresh"}</span>
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
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] sm:text-[12px] font-semibold text-slate-500 dark:text-slate-400 leading-tight pr-1">{s.label}</p>
              <span className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>
                <s.Icon className={`text-[14px] sm:text-[16px] ${s.ic}`} />
              </span>
            </div>
            {loading
              ? <div className="h-8 w-14 rounded-lg bg-slate-100 dark:bg-white/8 animate-pulse mb-1" />
              : <p className="text-[22px] sm:text-[26px] font-black text-slate-900 dark:text-white leading-none">{s.value}</p>
            }
            <p className="text-[11px] sm:text-[12px] text-slate-400 dark:text-slate-500 mt-1.5 flex items-center gap-1">
              <FaArrowUp className="text-[9px] text-emerald-500" /> {s.delta}
            </p>
          </div>
        ))}
      </div>

      {/* Weekly activity + Subject distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">

        <Card title="Weekly Lecture Activity" subtitle="Lectures created this week by day">
          <div className="h-[200px] sm:h-[230px]">
            {loading ? <Spinner /> : <WeeklyChart data={weeklyData} />}
          </div>
        </Card>

        {/* Subject Distribution — real subjects from API */}
        <Card title="Subject Distribution" subtitle="Lecture count per subject">
          {loading ? <Spinner /> : subjectDist.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-[13px] text-slate-400 dark:text-slate-500">
              No subject data yet
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              {/* Pie chart — blank labels, custom legend below */}
              <div className="w-full sm:w-[180px] flex-shrink-0 h-[180px] sm:h-[200px]">
                <SubjectPieChart dist={subjectDist} />
              </div>
              {/* Custom legend: dot + name + count + pct */}
              <div className="flex flex-col gap-2.5 w-full">
                {subjectDist.map(t => (
                  <div key={t.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                      <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 truncate">{t.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[12px] text-slate-400 dark:text-slate-500">{t.count} lec</span>
                      <span className="text-[13px] font-bold text-slate-500 dark:text-slate-400">{t.pct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Status breakdown + Per-subject table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">

        <Card title="Ingestion Status Breakdown" subtitle="Completed vs Processing vs Failed">
          <div className="h-[200px] sm:h-[230px]">
            {loading ? <Spinner /> : (
              <StatusBarChart
                completed={completedLec}
                processing={processingLec}
                failed={failedLec}
              />
            )}
          </div>
        </Card>

        <Card title="Per-Subject Completion" subtitle="Ingestion completion rate per subject">
          {loading ? <Spinner /> : subjects.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-slate-400 dark:text-slate-500">No data yet</div>
          ) : (
            <div className="flex flex-col gap-3 py-2">
              {subjects.map((s, i) => {
                const sid  = String(s.id ?? s._id ?? "");
                const dist = subjectDist.find(d => d.id === sid);
                const pct  = dist?.pct ?? 0;
                const done = dist?.done ?? 0;
                const tot  = dist?.count ?? 0;
                return (
                  <div key={sid || i} className="flex items-center gap-3">
                    <span className="text-[12px] sm:text-[13px] font-semibold text-slate-700 dark:text-slate-300 min-w-[80px] sm:min-w-[100px] truncate">{s.name}</span>
                    <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400 w-10 text-right flex-shrink-0">{pct}%</span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 flex-shrink-0 w-16 text-right">{done}/{tot} done</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Bottom insight cards — all derived from real API data */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          {
            Icon:  FaBrain,
            label: "Top Subject",
            value: loading ? "Loading…" : (topSubject?.name ?? "No data yet"),
            sub:   loading ? "" : topSubject ? `${topSubject.count} lectures · ${topSubject.pct}% of total` : "",
            bg:    "bg-indigo-50 dark:bg-indigo-500/12",
            ic:    "text-indigo-600 dark:text-indigo-400",
          },
          {
            Icon:  FaCheckCircle,
            label: "Completion Rate",
            value: loading ? "Loading…" : `${completionRate}%`,
            sub:   `${completedLec} of ${totalLectures} lectures ready`,
            bg:    "bg-emerald-50 dark:bg-emerald-500/12",
            ic:    "text-emerald-600 dark:text-emerald-400",
          },
          {
            Icon:  FaQuestion,
            label: "Latest Lecture",
            value: loading ? "Loading…" : (newestLecture?.title ?? newestLecture?.name ?? "None yet"),
            sub:   newestLecture
              ? `${newestLecture._subjectName ?? ""} · ${relTime(newestLecture.created_at)}`
              : "No lectures found",
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
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{c.label}</p>
              <p className="text-[14px] sm:text-[15px] font-black text-slate-900 dark:text-white mt-0.5 leading-tight truncate">{c.value}</p>
              <p className="text-[11px] sm:text-[12px] text-slate-400 mt-0.5 truncate">{c.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
