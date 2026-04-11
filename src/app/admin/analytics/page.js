"use client";
import { useEffect, useRef } from "react";
import {
  FaBolt, FaCheckCircle, FaStar, FaUsers, FaArrowUp,
  FaClock, FaBrain, FaQuestion,
} from "react-icons/fa";

/* ── KPI cards ───────────────────────────────────────────────────── */
const STATS = [
  { label: "Response Time",     value: "1.2s",   delta: "-0.3s",  Icon: FaBolt,        bg: "bg-indigo-50 dark:bg-indigo-500/15",   ic: "text-indigo-600 dark:text-indigo-400"   },
  { label: "Success Rate",      value: "97.6%",  delta: "+1.2%",  Icon: FaCheckCircle, bg: "bg-emerald-50 dark:bg-emerald-500/15", ic: "text-emerald-600 dark:text-emerald-400" },
  { label: "Student Satisf.",   value: "4.8/5",  delta: "+0.2",   Icon: FaStar,        bg: "bg-amber-50 dark:bg-amber-500/15",     ic: "text-amber-600 dark:text-amber-400"     },
  { label: "Daily Active Users",value: "1,847",  delta: "+234",   Icon: FaUsers,       bg: "bg-purple-50 dark:bg-purple-500/15",   ic: "text-purple-600 dark:text-purple-400"   },
];

/* ── Topic distribution legend (rendered in React, not Chart.js) ── */
const TOPICS = [
  { label: "Machine Learning", pct: 35, color: "#6366f1" },
  { label: "Neural Networks",  pct: 28, color: "#8b5cf6" },
  { label: "Deep Learning",    pct: 22, color: "#ec4899" },
  { label: "Computer Vision",  pct: 15, color: "#10b981" },
];

/* ── helpers ─────────────────────────────────────────────────────── */
const isDark      = () => document.documentElement.classList.contains("dark");
const gridColor   = () => isDark() ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";
const labelColor  = () => isDark() ? "#94a3b8" : "#64748b";

function useChart(factory) {
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
  }, []);
  return ref;
}

/* ── Weekly Activity ─────────────────────────────────────────────── */
function WeeklyChart() {
  const ref = useChart((canvas, Chart) => new Chart(canvas, {
    type: "line",
    data: {
      labels: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
      datasets: [{
        data: [1240,1450,1820,1650,1380,980,720],
        borderColor: "#10b981",
        backgroundColor: "rgba(16,185,129,0.08)",
        borderWidth: 2.5, tension: 0.45, fill: true,
        pointBackgroundColor: "#10b981", pointRadius: 0, pointHoverRadius: 5,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: gridColor() }, ticks: { color: labelColor(), font: { size: 11 } } },
        y: { grid: { color: gridColor() }, ticks: { color: labelColor(), font: { size: 11 } }, beginAtZero: false },
      },
    },
  }));
  return <canvas ref={ref} />;
}

/* ── Topic Pie — NO labels/text in chart, clean pie only ─────────── */
function TopicPieChart() {
  const ref = useChart((canvas, Chart) => new Chart(canvas, {
    type: "pie",
    data: {
      // labels intentionally blank — legend rendered in React below
      labels: ["", "", "", ""],
      datasets: [{
        data: TOPICS.map(t => t.pct),
        backgroundColor: TOPICS.map(t => t.color),
        borderWidth: 2,
        borderColor: isDark() ? "#0f1117" : "#ffffff",
        hoverOffset: 12,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },        // hide built-in legend
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${TOPICS[ctx.dataIndex].label}: ${ctx.parsed}%`,
          },
        },
      },
    },
  }));
  return <canvas ref={ref} />;
}

/* ── AI Accuracy Trend ───────────────────────────────────────────── */
function AccuracyChart() {
  const ref = useChart((canvas, Chart) => new Chart(canvas, {
    type: "line",
    data: {
      labels: ["Week 1","Week 2","Week 3","Week 4","Week 5","Week 6"],
      datasets: [{
        data: [87.2,88.5,91.0,92.4,93.8,94.6],
        borderColor: "#10b981", backgroundColor: "transparent",
        borderWidth: 2.5, tension: 0.35,
        pointBackgroundColor: "#10b981", pointRadius: 5, pointHoverRadius: 7,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: gridColor() }, ticks: { color: labelColor(), font: { size: 11 } } },
        y: { grid: { color: gridColor() }, ticks: { color: labelColor(), font: { size: 11 } }, min: 85, max: 96 },
      },
    },
  }));
  return <canvas ref={ref} />;
}

/* ── Student Engagement Bar ──────────────────────────────────────── */
function EngagementChart() {
  const ref = useChart((canvas, Chart) => new Chart(canvas, {
    type: "bar",
    data: {
      labels: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
      datasets: [{
        data: [450,480,595,530,465,305,245],
        backgroundColor: "rgba(109,94,252,0.75)",
        borderRadius: 6,
        hoverBackgroundColor: "rgba(109,94,252,1)",
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: labelColor(), font: { size: 11 } } },
        y: { grid: { color: gridColor() }, ticks: { color: labelColor(), font: { size: 11 } }, beginAtZero: true },
      },
    },
  }));
  return <canvas ref={ref} />;
}

/* ── Card wrapper ────────────────────────────────────────────────── */
function Card({ title, subtitle, children, className = "" }) {
  return (
    <div className={`bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl p-4 sm:p-6 shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none ${className}`}>
      {(title || subtitle) && (
        <div className="mb-4 sm:mb-5">
          {title   && <h2 className="text-[14px] sm:text-[15px] font-black text-slate-900 dark:text-white">{title}</h2>}
          {subtitle && <p className="text-[12px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   ANALYTICS PAGE
══════════════════════════════════════════════════════════════════════ */
export default function AnalyticsPage() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-5 sm:space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-[22px] sm:text-[26px] font-black tracking-tight text-slate-900 dark:text-white">
          Analytics Dashboard
        </h1>
        <p className="text-[13px] sm:text-[14px] text-slate-500 dark:text-slate-400 mt-0.5">
          Comprehensive insights into AI performance and usage
        </p>
      </div>

      {/* KPI cards — 2 cols xs, 4 cols md+ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {STATS.map(s => (
          <div key={s.label}
            className="bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] sm:text-[12px] font-semibold text-slate-500 dark:text-slate-400 leading-tight pr-1">
                {s.label}
              </p>
              <span className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>
                <s.Icon className={`text-[14px] sm:text-[16px] ${s.ic}`} />
              </span>
            </div>
            <p className="text-[22px] sm:text-[26px] font-black text-slate-900 dark:text-white leading-none">
              {s.value}
            </p>
            <p className="text-[11px] sm:text-[12px] font-bold text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1">
              <FaArrowUp className="text-[9px]" /> {s.delta}
            </p>
          </div>
        ))}
      </div>

      {/* Weekly + Topic Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">

        <Card title="Weekly Activity" subtitle="Questions per day this week">
          <div className="h-[200px] sm:h-[230px]"><WeeklyChart /></div>
        </Card>

        {/* Topic Distribution — pie + custom React legend */}
        <Card title="Topic Distribution" subtitle="Most queried lecture topics">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            {/* Pie — square, fixed size so it doesn't stretch */}
            <div className="w-full sm:w-[180px] flex-shrink-0 h-[180px] sm:h-[200px]">
              <TopicPieChart />
            </div>

            {/* Custom legend — dot + label + % */}
            <div className="flex flex-col gap-2.5 w-full">
              {TOPICS.map(t => (
                <div key={t.label} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Dot only — no % text inside chart */}
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                      {t.label}
                    </span>
                  </div>
                  <span className="text-[13px] font-bold text-slate-500 dark:text-slate-400 flex-shrink-0">
                    {t.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* AI Accuracy + Engagement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <Card title="AI Accuracy Trend" subtitle="Model accuracy improvement over 6 weeks">
          <div className="h-[200px] sm:h-[230px]"><AccuracyChart /></div>
        </Card>

        <Card title="Student Engagement" subtitle="Active sessions per day">
          <div className="h-[200px] sm:h-[230px]"><EngagementChart /></div>
        </Card>
      </div>

      {/* Bottom insight cards — 1 col xs, 3 cols sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          { Icon: FaClock,    label: "Peak Usage",            value: "Wednesday 2–4 PM",      sub: "Highest student activity",   bg: "bg-indigo-50 dark:bg-indigo-500/12",   ic: "text-indigo-600 dark:text-indigo-400"   },
          { Icon: FaBrain,    label: "Top Performing Topic",  value: "Machine Learning Basics",sub: "95% accuracy rate",          bg: "bg-emerald-50 dark:bg-emerald-500/12", ic: "text-emerald-600 dark:text-emerald-400" },
          { Icon: FaQuestion, label: "Most Asked Question",   value: "Gradient Descent",      sub: "1,234 questions this week",  bg: "bg-purple-50 dark:bg-purple-500/12",   ic: "text-purple-600 dark:text-purple-400"   },
        ].map(c => (
          <div key={c.label}
            className="bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none flex items-start gap-3 sm:gap-4">
            <span className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg}`}>
              <c.Icon className={`text-[14px] sm:text-[16px] ${c.ic}`} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{c.label}</p>
              <p className="text-[14px] sm:text-[15px] font-black text-slate-900 dark:text-white mt-0.5 leading-tight">{c.value}</p>
              <p className="text-[11px] sm:text-[12px] text-slate-400 mt-0.5">{c.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
