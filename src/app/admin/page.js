"use client";
import { useEffect, useRef } from "react";
import {
  FaUsers, FaArrowUp, FaCommentDots, FaClock,
  FaBolt, FaBrain, FaBook,
} from "react-icons/fa";

/* ── stat cards ──────────────────────────────────────────────────── */
const STATS = [
  { label: "Total Students",    value: "2,345", delta: "+12%",  Icon: FaUsers,       iconBg: "bg-indigo-50 dark:bg-indigo-500/15",   iconCls: "text-indigo-600 dark:text-indigo-400"  },
  { label: "Active Today",      value: "1,847", delta: "+5.2%", Icon: FaArrowUp,     iconBg: "bg-emerald-50 dark:bg-emerald-500/15", iconCls: "text-emerald-600 dark:text-emerald-400"},
  { label: "Questions Asked",   value: "12.4k", delta: "+8.1%", Icon: FaCommentDots, iconBg: "bg-purple-50 dark:bg-purple-500/15",   iconCls: "text-purple-600 dark:text-purple-400"  },
  { label: "Avg Response Time", value: "1.2s",  delta: "-0.3s", Icon: FaClock,       iconBg: "bg-amber-50 dark:bg-amber-500/15",    iconCls: "text-amber-600 dark:text-amber-400"    },
];

/* ── recent activity ─────────────────────────────────────────────── */
const ACTIVITY = [
  { user: "Sarah Johnson",   action: "Asked 12 questions in ML Basics",  time: "2 min ago",  dot: "bg-indigo-500"  },
  { user: "Michael Chen",    action: "Completed Neural Networks quiz",    time: "8 min ago",  dot: "bg-purple-500"  },
  { user: "Emily Rodriguez", action: "Generated presentation on CV",      time: "15 min ago", dot: "bg-emerald-500" },
  { user: "David Kim",       action: "Flagged for low comprehension",     time: "22 min ago", dot: "bg-red-500"     },
  { user: "Jessica Taylor",  action: "Reviewed 5 lecture summaries",      time: "35 min ago", dot: "bg-amber-500"   },
];

/* ── Weekly Activity line chart ──────────────────────────────────── */
function WeeklyActivityChart() {
  const ref = useRef(null);
  useEffect(() => {
    let chart;
    (async () => {
      const { Chart, registerables } = await import("chart.js");
      Chart.register(...registerables);
      if (!ref.current) return;
      const dark = document.documentElement.classList.contains("dark");
      chart = new Chart(ref.current, {
        type: "line",
        data: {
          labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          datasets: [{
            label: "Questions Asked",
            data: [1240, 1450, 1820, 1650, 1380, 980, 720],
            borderColor: "#10b981",
            backgroundColor: "rgba(16,185,129,0.08)",
            borderWidth: 2.5,
            pointBackgroundColor: "#10b981",
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.45,
            fill: true,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: {
              grid: { color: dark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)" },
              ticks: { color: dark ? "#94a3b8" : "#64748b", font: { size: 11 } },
            },
            y: {
              grid: { color: dark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)" },
              ticks: { color: dark ? "#94a3b8" : "#64748b", font: { size: 11 } },
              beginAtZero: true,
            },
          },
        },
      });
    })();
    return () => chart?.destroy();
  }, []);
  return <canvas ref={ref} />;
}

export default function AdminDashboardPage() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-5 sm:space-y-6">

      {/* Page header */}
      <div>
        <h1 className="text-[22px] sm:text-[26px] font-black tracking-tight text-slate-900 dark:text-white">
          Analytics Dashboard
        </h1>
        <p className="text-[13px] sm:text-[14px] text-slate-500 dark:text-slate-400 mt-0.5">
          Comprehensive insights into AI performance and usage
        </p>
      </div>

      {/* Stat cards — 2 cols on xs, 4 on md+ */}
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
            <p className="text-[22px] sm:text-[26px] font-black text-slate-900 dark:text-white leading-none">
              {s.value}
            </p>
            <p className="text-[11px] sm:text-[12px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1">
              <FaArrowUp className="text-[10px]" /> {s.delta} this week
            </p>
          </div>
        ))}
      </div>

      {/* Weekly Activity — full width */}
      <div className="bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl p-4 sm:p-6 shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none">
        <div className="mb-4 sm:mb-5">
          <h2 className="text-[14px] sm:text-[15px] font-black text-slate-900 dark:text-white">
            Weekly Activity
          </h2>
          <p className="text-[12px] text-slate-400 mt-0.5">Questions asked per day</p>
        </div>
        <div className="h-[200px] sm:h-[240px]">
          <WeeklyActivityChart />
        </div>
      </div>

      {/* Bottom — insight cards + recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">

        {/* Insight cards */}
        <div className="flex flex-col gap-3 sm:gap-4">
          {[
            { Icon: FaBolt,  label: "Peak Usage",           value: "Wednesday 2–4 PM",      sub: "Highest student activity",   bg: "bg-indigo-50 dark:bg-indigo-500/12",   ic: "text-indigo-600 dark:text-indigo-400"  },
            { Icon: FaBrain, label: "Top Performing Topic",  value: "Machine Learning Basics",sub: "95% accuracy rate",          bg: "bg-emerald-50 dark:bg-emerald-500/12", ic: "text-emerald-600 dark:text-emerald-400"},
            { Icon: FaBook,  label: "Most Asked Question",   value: "Gradient Descent",      sub: "1,234 questions this week",  bg: "bg-purple-50 dark:bg-purple-500/12",   ic: "text-purple-600 dark:text-purple-400"  },
          ].map((c) => (
            <div key={c.label}
              className="bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none flex items-start gap-3 sm:gap-4">
              <span className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg}`}>
                <c.Icon className={`text-[14px] sm:text-[16px] ${c.ic}`} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-400 mb-0.5 truncate">{c.label}</p>
                <p className="text-[13px] sm:text-[14px] font-black text-slate-900 dark:text-white leading-tight">{c.value}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{c.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Recent activity */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl p-4 sm:p-6 shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none">
          <h2 className="text-[14px] sm:text-[15px] font-black text-slate-900 dark:text-white mb-4 sm:mb-5">
            Recent Activity
          </h2>
          <div className="space-y-3 sm:space-y-4">
            {ACTIVITY.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${a.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200 truncate">{a.user}</p>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400">{a.action}</p>
                </div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 flex-shrink-0 whitespace-nowrap">{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
