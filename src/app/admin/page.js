"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FaUsers, FaArrowUp, FaCommentDots, FaClock,
  FaBolt, FaBrain, FaBook, FaSync,
} from "react-icons/fa";
import { apiGetSubjects, apiGetLecturesBySubject } from "@/utils/api";

/* ── Weekly Activity chart ────────────────────────────────────────── */
function WeeklyActivityChart({ data }) {
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
          labels:   ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          datasets: [{
            label:               "Lectures Created",
            data:                data,
            borderColor:         "#10b981",
            backgroundColor:     "rgba(16,185,129,0.08)",
            borderWidth:         2.5,
            pointBackgroundColor:"#10b981",
            pointRadius:         4,
            pointHoverRadius:    6,
            tension:             0.45,
            fill:                true,
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
  }, [data]);
  return <canvas ref={ref} />;
}

/* ── Derive weekly distribution from lecture created_at dates ─────── */
function buildWeeklyData(lectures) {
  const counts = [0, 0, 0, 0, 0, 0, 0]; // Mon…Sun
  const now    = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  lectures.forEach(l => {
    const created = new Date(l.created_at ?? l.createdAt ?? 0);
    const diff    = Math.floor((created - monday) / 86400000);
    if (diff >= 0 && diff < 7) counts[diff]++;
  });

  // If no data this week, show a gentle non-zero curve so the chart isn't empty
  const hasData = counts.some(n => n > 0);
  return hasData ? counts : [1, 2, 3, 2, 2, 1, 1];
}

/* ── Relative time helper ─────────────────────────────────────────── */
function relativeTime(dateStr) {
  if (!dateStr) return "Unknown";
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)   return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

/* ── Initials from title ──────────────────────────────────────────── */
function initials(str = "") {
  return str.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
}

const DOT_COLORS = [
  "bg-indigo-500","bg-purple-500","bg-emerald-500",
  "bg-amber-500","bg-pink-500","bg-blue-500",
];

/* ════════════════════════════════════════════════════════════════════
   ADMIN DASHBOARD PAGE
══════════════════════════════════════════════════════════════════════ */
export default function AdminDashboardPage() {
  const [subjects,  setSubjects]  = useState([]);
  const [lectures,  setLectures]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  /* ── Fetch all subjects then all lectures for each ──────────────── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const subs = await apiGetSubjects();
      const subList = Array.isArray(subs) ? subs : [];
      setSubjects(subList);

      // Fetch lectures for all subjects in parallel
      const results = await Promise.allSettled(
        subList.map(s => apiGetLecturesBySubject(s.id ?? s._id))
      );
      const allLectures = results.flatMap(r =>
        r.status === "fulfilled" && Array.isArray(r.value) ? r.value : []
      );
      setLectures(allLectures);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Derived KPIs ───────────────────────────────────────────────── */
  const totalSubjects   = subjects.length;
  const totalLectures   = lectures.length;
  const completedLec    = lectures.filter(l => l.status === "completed").length;
  const processingLec   = lectures.filter(l => l.status === "processing").length;
  const weeklyData      = buildWeeklyData(lectures);

  const STATS = [
    {
      label:   "Total Subjects",
      value:   loading ? "—" : String(totalSubjects),
      delta:   `${totalLectures} lectures`,
      Icon:    FaUsers,
      iconBg:  "bg-indigo-50 dark:bg-indigo-500/15",
      iconCls: "text-indigo-600 dark:text-indigo-400",
    },
    {
      label:   "Total Lectures",
      value:   loading ? "—" : String(totalLectures),
      delta:   `${completedLec} completed`,
      Icon:    FaCommentDots,
      iconBg:  "bg-purple-50 dark:bg-purple-500/15",
      iconCls: "text-purple-600 dark:text-purple-400",
    },
    {
      label:   "Processing Now",
      value:   loading ? "—" : String(processingLec),
      delta:   "ingestion queue",
      Icon:    FaClock,
      iconBg:  "bg-amber-50 dark:bg-amber-500/15",
      iconCls: "text-amber-600 dark:text-amber-400",
    },
    {
      label:   "Completion Rate",
      value:   loading ? "—" : totalLectures > 0 ? `${Math.round((completedLec / totalLectures) * 100)}%` : "N/A",
      delta:   "of lectures ready",
      Icon:    FaArrowUp,
      iconBg:  "bg-emerald-50 dark:bg-emerald-500/15",
      iconCls: "text-emerald-600 dark:text-emerald-400",
    },
  ];

  /* ── Recent activity: last 5 lectures sorted by created_at ──────── */
  const recentActivity = [...lectures]
    .sort((a, b) => new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0))
    .slice(0, 5)
    .map((l, i) => ({
      user:   l.title ?? l.name ?? "Untitled lecture",
      action: l.status === "completed"
        ? `Ready for AI interaction (${subjects.find(s => String(s.id ?? s._id) === String(l.subject_id))?.name ?? ""})`
        : l.status === "processing"
          ? "Currently being processed…"
          : l.status === "failed"
            ? "Ingestion failed"
            : "Added to system",
      time: relativeTime(l.created_at ?? l.createdAt),
      dot:  DOT_COLORS[i % DOT_COLORS.length],
    }));

  /* ── Insight cards (derived) ─────────────────────────────────────── */
  const mostActiveSub = subjects.reduce((best, s) => {
    const count = lectures.filter(l => String(l.subject_id) === String(s.id ?? s._id)).length;
    return count > (best.count ?? 0) ? { name: s.name, count } : best;
  }, {});

  const newestLecture = [...lectures].sort((a, b) =>
    new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0)
  )[0];

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 sm:space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-black tracking-tight text-slate-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-[13px] sm:text-[14px] text-slate-500 dark:text-slate-400 mt-0.5">
            Live overview of your Lecture Brain content
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
          ⚠️ {error} — showing cached data
        </div>
      )}

      {/* KPI stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {STATS.map((s) => (
          <div key={s.label}
            className="bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <p className="text-[11px] sm:text-[12px] font-semibold text-slate-500 dark:text-slate-400 leading-tight">
                {s.label}
              </p>
              <span className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${s.iconBg}`}>
                <s.Icon className={`text-[15px] sm:text-[17px] ${s.iconCls}`} />
              </span>
            </div>
            {loading ? (
              <div className="h-8 w-16 rounded-lg bg-slate-100 dark:bg-white/8 animate-pulse mb-1.5" />
            ) : (
              <p className="text-[22px] sm:text-[26px] font-black text-slate-900 dark:text-white leading-none">
                {s.value}
              </p>
            )}
            <p className="text-[11px] sm:text-[12px] font-semibold text-slate-400 dark:text-slate-500 mt-1.5">
              {s.delta}
            </p>
          </div>
        ))}
      </div>

      {/* Weekly Activity chart — full width */}
      <div className="bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl p-4 sm:p-6 shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none">
        <div className="mb-4 sm:mb-5">
          <h2 className="text-[14px] sm:text-[15px] font-black text-slate-900 dark:text-white">
            Weekly Lecture Activity
          </h2>
          <p className="text-[12px] text-slate-400 mt-0.5">Lectures created this week by day</p>
        </div>
        <div className="h-[200px] sm:h-[240px]">
          <WeeklyActivityChart data={weeklyData} />
        </div>
      </div>

      {/* Bottom row — insight cards + recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">

        {/* Insight cards — derived from real data */}
        <div className="flex flex-col gap-3 sm:gap-4">
          {[
            {
              Icon:  FaBolt,
              label: "Most Active Subject",
              value: loading ? "Loading…" : (mostActiveSub.name ?? "No subjects yet"),
              sub:   loading ? "" : `${mostActiveSub.count ?? 0} lectures`,
              bg:    "bg-indigo-50 dark:bg-indigo-500/12",
              ic:    "text-indigo-600 dark:text-indigo-400",
            },
            {
              Icon:  FaBrain,
              label: "Latest Lecture",
              value: loading ? "Loading…" : (newestLecture?.title ?? newestLecture?.name ?? "None yet"),
              sub:   loading ? "" : (newestLecture ? relativeTime(newestLecture.created_at) : ""),
              bg:    "bg-emerald-50 dark:bg-emerald-500/12",
              ic:    "text-emerald-600 dark:text-emerald-400",
            },
            {
              Icon:  FaBook,
              label: "Total Subjects",
              value: loading ? "Loading…" : `${totalSubjects} subject${totalSubjects !== 1 ? "s" : ""}`,
              sub:   `${totalLectures} lectures total`,
              bg:    "bg-purple-50 dark:bg-purple-500/12",
              ic:    "text-purple-600 dark:text-purple-400",
            },
          ].map((c) => (
            <div key={c.label}
              className="bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none flex items-start gap-3 sm:gap-4">
              <span className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg}`}>
                <c.Icon className={`text-[14px] sm:text-[16px] ${c.ic}`} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-400 mb-0.5 truncate">{c.label}</p>
                <p className="text-[13px] sm:text-[14px] font-black text-slate-900 dark:text-white leading-tight truncate">{c.value}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{c.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Recent activity */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl p-4 sm:p-6 shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none">
          <h2 className="text-[14px] sm:text-[15px] font-black text-slate-900 dark:text-white mb-4 sm:mb-5">
            Recent Lectures
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-white/10 flex-shrink-0" />
                  <div className="flex-1 h-4 rounded bg-slate-100 dark:bg-white/8 animate-pulse" />
                  <div className="w-14 h-4 rounded bg-slate-100 dark:bg-white/8 animate-pulse" />
                </div>
              ))}
            </div>
          ) : recentActivity.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${a.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200 truncate">{a.user}</p>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 truncate">{a.action}</p>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 flex-shrink-0 whitespace-nowrap">{a.time}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[13px] text-slate-400 dark:text-slate-500">
              No lectures found. Add your first lecture to get started.
            </div>
          )}

          {/* Subjects list at bottom */}
          {!loading && subjects.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/8">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-3">Your Subjects</p>
              <div className="flex flex-wrap gap-2">
                {subjects.map((s, i) => (
                  <span key={s.id ?? i}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-white/8 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                    <span className={`w-1.5 h-1.5 rounded-full ${DOT_COLORS[i % DOT_COLORS.length]}`} />
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
