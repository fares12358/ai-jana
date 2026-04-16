"use client";

/**
 * Admin Dashboard — /admin
 *
 * Three endpoints used:
 *   GET  /admin/analytics          → { total_subjects, total_lectures, completion_rate, ai_interactions }
 *   GET  /admin/analytics/insights → AnalyticsItem[] (per-subject breakdown)
 *   POST /admin/analytics/generate → { subjects_processed, total_messages_analyzed, message }
 *
 * NOTE: The original code had the endpoint roles swapped.
 *   /admin/analytics        = platform-wide summary stats (not an array)
 *   /admin/analytics/insights = the per-subject array (not a single insights object)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FaBrain,
  FaCommentDots,
  FaBolt,
  FaSync,
  FaCheckCircle,
  FaExclamationTriangle,
  FaFolderOpen,
  FaChartBar,
  FaLightbulb,
  FaGraduationCap,
  FaBook,
  FaQuestionCircle,
} from "react-icons/fa";
import { apiAdminAnalytics, apiAdminAnalyticsInsights, apiAdminAnalyticsGenerate } from "@/utils/api";

/* ══════════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════════ */

function relTime(dateStr) {
  if (!dateStr) return "—";
  const sec = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (sec < 60) return "Just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const SUBJECT_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#10b981",
  "#f59e0b", "#3b82f6", "#ef4444", "#14b8a6",
];

/* ══════════════════════════════════════════════════════════════════
   CHART HOOKS
══════════════════════════════════════════════════════════════════ */

function useBarChart(ref, labels, data, label = "Engagement") {
  useEffect(() => {
    if (!ref.current) return;
    let chart = null;
    let mounted = true;
    (async () => {
      const { Chart, registerables } = await import("chart.js");
      Chart.register(...registerables);
      if (!mounted || !ref.current) return;
      const ex = Chart.getChart(ref.current);
      if (ex) ex.destroy();
      const dark = document.documentElement.classList.contains("dark");
      const gc = dark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";
      const lc = dark ? "#94a3b8" : "#64748b";
      chart = new Chart(ref.current, {
        type: "bar",
        data: {
          labels,
          datasets: [{
            label,
            data,
            backgroundColor: SUBJECT_COLORS.map(c => `${c}cc`),
            hoverBackgroundColor: SUBJECT_COLORS,
            borderRadius: 6,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: lc, font: { size: 11 } } },
            y: {
              grid: { color: gc },
              ticks: { color: lc, font: { size: 11 }, precision: 0 },
              beginAtZero: true,
            },
          },
        },
      });
    })();
    return () => { mounted = false; chart?.destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data)]);
}

/* ══════════════════════════════════════════════════════════════════
   UI ATOMS
══════════════════════════════════════════════════════════════════ */

const Sk = ({ cls = "" }) => (
  <div className={`rounded-lg bg-slate-100 dark:bg-white/8 animate-pulse ${cls}`} />
);

const Card = ({ children, cls = "" }) => (
  <div className={`bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none ${cls}`}>
    {children}
  </div>
);

/* Stat card */
function StatCard({ icon: Icon, label, value, sub, iconBg, iconColor, loading }) {
  return (
    <Card cls="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] sm:text-[12px] font-semibold text-slate-500 dark:text-slate-400 leading-tight">
          {label}
        </p>
        <span className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon className={`text-[15px] sm:text-[17px] ${iconColor}`} />
        </span>
      </div>
      {loading
        ? <Sk cls="h-8 w-16 mb-1.5" />
        : <p className="text-[22px] sm:text-[26px] font-black text-slate-900 dark:text-white leading-none">{value}</p>
      }
      <p className="text-[11px] sm:text-[12px] text-slate-400 dark:text-slate-500 mt-1.5">{sub}</p>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════════════
   DATA HOOK
══════════════════════════════════════════════════════════════════ */

function useAdminData() {
  /* GET /admin/analytics → { total_subjects, total_lectures, completion_rate, ai_interactions } */
  const [summary, setSummary] = useState(null);
  /* GET /admin/analytics/insights → AnalyticsItem[] */
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryResult, subjectsResult] = await Promise.allSettled([
        apiAdminAnalytics(),          // → platform summary object
        apiAdminAnalyticsInsights(),  // → per-subject array
      ]);

      if (summaryResult.status === "fulfilled") {
        const r = summaryResult.value;
        /* axiosInstance may wrap in .data */
        setSummary(r?.data ?? r ?? null);
      } else {
        setSummary(null);
      }

      if (subjectsResult.status === "fulfilled") {
        const r = subjectsResult.value;
        const arr = r?.data ?? r;
        setSubjects(Array.isArray(arr) ? arr : []);
      } else {
        setSubjects([]);
      }

      setFetchedAt(new Date());
    } catch (err) {
      setError(err.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { summary, subjects, loading, error, fetchedAt, fetchAll };
}

/* ══════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════ */

export default function AdminDashboardPage() {
  const barRef = useRef(null);
  const { summary, subjects, loading, error, fetchedAt, fetchAll } = useAdminData();

  const [genMsg, setGenMsg] = useState("");
  const [genOk, setGenOk] = useState(true);
  const [genLoading, setGenLoading] = useState(false);

  /* Bar chart — engagement per subject from /admin/analytics/insights */
  useBarChart(
    barRef,
    subjects.map(s => (s.subject_name ?? "?").split(" ").slice(0, 2).join(" ")),
    subjects.map(s => s.engagement_count ?? 0),
    "Interactions",
  );

  /* POST /admin/analytics/generate */
  const generate = useCallback(async () => {
    setGenMsg("");
    setGenLoading(true);
    try {
      const res = await apiAdminAnalyticsGenerate();
      const data = res?.data ?? res;
      setGenOk(true);
      setGenMsg(
        data?.message
          ?? `Processed ${data?.subjects_processed ?? "?"} subjects · ${data?.total_messages_analyzed ?? "?"} messages`
      );
      fetchAll();
    } catch (e) {
      setGenOk(false);
      setGenMsg(e.message ?? "Generation failed.");
    } finally {
      setGenLoading(false);
    }
  }, [fetchAll]);

  /* Derived values from /admin/analytics/insights array */
  const totalEngagement = subjects.reduce((a, s) => a + (s.engagement_count ?? 0), 0);
  const allWeakTopics = subjects
    .flatMap(s => (s.weak_topics ?? []).map(t => ({ ...t, subject_name: s.subject_name })))
    .sort((a, b) => (b.frequency_score ?? 0) - (a.frequency_score ?? 0));
  const allCommonQuestions = subjects
    .flatMap(s => (s.common_questions ?? []).map(q => ({ q, subject: s.subject_name })));
  const topSubject = [...subjects].sort((a, b) =>
    (b.engagement_count ?? 0) - (a.engagement_count ?? 0))[0];
  const maxWeakScore = allWeakTopics[0]?.frequency_score ?? 1;

  /* Platform summary from /admin/analytics */
  const totalSubjects = summary?.total_subjects ?? subjects.length;
  const totalLectures = summary?.total_lectures ?? 0;
  const completionRate = summary?.completion_rate ?? 0;
  const aiInteractions = summary?.ai_interactions ?? totalEngagement;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 sm:space-y-6">

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-black tracking-tight text-slate-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-[13px] sm:text-[14px] text-slate-500 dark:text-slate-400 mt-0.5">
            {fetchedAt && !loading ? `Updated ${relTime(fetchedAt.toISOString())}` : "Loading…"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={generate}
            disabled={genLoading || loading}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-[12px] sm:text-[13px] font-bold cursor-pointer border-0
                       bg-indigo-600 hover:bg-indigo-700 text-white
                       shadow-[0_2px_10px_rgba(99,102,241,0.30)]
                       transition-colors disabled:opacity-50">
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
            <span className="hidden sm:inline">{loading ? "Loading…" : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* ── BANNERS ────────────────────────────────────────────────── */}
      {genMsg && (
        <div className={`px-4 py-2.5 rounded-xl text-[13px] font-semibold border flex items-center gap-2
          ${genOk
            ? "bg-emerald-50 dark:bg-emerald-500/12 border-emerald-200 dark:border-emerald-500/25 text-emerald-600 dark:text-emerald-400"
            : "bg-red-50 dark:bg-red-500/12 border-red-200 dark:border-red-500/25 text-red-600 dark:text-red-400"
          }`}>
          {genOk ? <FaCheckCircle className="flex-shrink-0 text-[13px]" /> : <FaExclamationTriangle className="flex-shrink-0" />}
          {genMsg}
        </div>
      )}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/12 border border-red-200 dark:border-red-500/25 text-red-600 dark:text-red-400 text-[13px] font-semibold flex items-center gap-2">
          <FaExclamationTriangle className="flex-shrink-0" /> {error}
        </div>
      )}

      {/* ── KPI ROW — from /admin/analytics ────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={FaFolderOpen} label="Total Subjects"
          value={totalSubjects}
          sub={`${subjects.length} with analytics`}
          iconBg="bg-indigo-50 dark:bg-indigo-500/15"
          iconColor="text-indigo-600 dark:text-indigo-400"
          loading={loading}
        />
        <StatCard
          icon={FaBook} label="Total Lectures"
          value={totalLectures}
          sub="across all subjects"
          iconBg="bg-purple-50 dark:bg-purple-500/15"
          iconColor="text-purple-600 dark:text-purple-400"
          loading={loading}
        />
        <StatCard
          icon={FaCommentDots} label="AI Interactions"
          value={aiInteractions}
          sub={`${totalEngagement} from analyzed subjects`}
          iconBg="bg-emerald-50 dark:bg-emerald-500/15"
          iconColor="text-emerald-600 dark:text-emerald-400"
          loading={loading}
        />
        <StatCard
          icon={FaCheckCircle} label="Completion Rate"
          value={`${(completionRate * 100).toFixed(0)}%`}
          sub="pipeline completion"
          iconBg="bg-amber-50 dark:bg-amber-500/15"
          iconColor="text-amber-600 dark:text-amber-400"
          loading={loading}
        />
      </div>

      {/* ── TOP SUBJECT SPOTLIGHT ───────────────────────────────────── */}
      {!loading && topSubject && (
        <Card cls="p-4 sm:p-5">
          <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/20 flex-shrink-0">
              <FaGraduationCap className="text-indigo-500 text-[13px]" />
              <span className="text-[11px] font-black uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                Most Active
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-[14px] font-black text-slate-900 dark:text-white">
                  {topSubject.subject_name}
                </p>
                <span className="text-[12px] text-slate-400">·</span>
                <span className="text-[12px] text-slate-500 dark:text-slate-400">
                  {topSubject.engagement_count} interactions
                </span>
              </div>
              {topSubject.ai_insight && (
                <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  {topSubject.ai_insight}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* ── CHARTS + WEAK TOPICS ROW ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">

        {/* Engagement bar chart — from /admin/analytics/insights */}
        <Card cls="p-4 sm:p-6">
          <div className="mb-4">
            <h2 className="text-[14px] sm:text-[15px] font-black text-slate-900 dark:text-white">
              Engagement by Subject
            </h2>
            <p className="text-[12px] text-slate-400 mt-0.5">
              <code className="text-[11px] bg-slate-100 dark:bg-white/8 px-1 rounded">engagement_count</code>
              {" "}from{" "}
              <code className="text-[11px] bg-slate-100 dark:bg-white/8 px-1 rounded">/admin/analytics/insights</code>
            </p>
          </div>
          <div className="h-[200px] sm:h-[230px]">
            {loading
              ? <div className="h-full rounded-xl bg-slate-100 dark:bg-white/6 animate-pulse" />
              : subjects.length === 0
                ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <FaChartBar className="text-[28px] text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                      <p className="text-[13px] text-slate-400 dark:text-slate-500">No data yet — click Generate Analytics</p>
                    </div>
                  </div>
                )
                : <canvas ref={barRef} />
            }
          </div>
        </Card>

        {/* Top weak topics — from /admin/analytics/insights */}
        <Card cls="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[14px] sm:text-[15px] font-black text-slate-900 dark:text-white">
                Weak Topics
              </h2>
              <p className="text-[12px] text-slate-400 mt-0.5">
                sorted by{" "}
                <code className="text-[11px] bg-slate-100 dark:bg-white/8 px-1 rounded">frequency_score</code>
              </p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <Sk cls="w-5 h-4 flex-shrink-0" />
                  <Sk cls="flex-1 h-4" />
                  <Sk cls="w-5 h-4 flex-shrink-0" />
                </div>
              ))}
            </div>
          ) : allWeakTopics.length > 0 ? (
            <div className="space-y-3">
              {allWeakTopics.slice(0, 8).map((t, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-slate-400 w-5 text-right flex-shrink-0">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {t.topic}
                      </span>
                      {t.subject_name && (
                        <span className="text-[11px] text-slate-400 flex-shrink-0 truncate max-w-[100px]">
                          {t.subject_name}
                        </span>
                      )}
                    </div>
                    {t.frequency_score != null && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-red-400 transition-all"
                            style={{ width: `${Math.min(100, (t.frequency_score / maxWeakScore) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-red-500 dark:text-red-400 w-5 text-right flex-shrink-0">
                          {t.frequency_score}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FaBrain className="text-[24px] text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-[13px] text-slate-400 dark:text-slate-500">No weak topics identified yet.</p>
              <p className="text-[12px] text-slate-400 mt-1">Run Generate Analytics to populate.</p>
            </div>
          )}
        </Card>

      </div>

      {/* ── COMMON QUESTIONS — from /admin/analytics/insights ──────── */}
      {!loading && allCommonQuestions.length > 0 && (
        <Card cls="p-4 sm:p-6">
          <div className="mb-4">
            <h2 className="text-[14px] sm:text-[15px] font-black text-slate-900 dark:text-white">
              Common Student Questions
            </h2>
            <p className="text-[12px] text-slate-400 mt-0.5">
              <code className="text-[11px] bg-slate-100 dark:bg-white/8 px-1 rounded">common_questions</code>
              {" "}from{" "}
              <code className="text-[11px] bg-slate-100 dark:bg-white/8 px-1 rounded">/admin/analytics/insights</code>
              {" "}· {allCommonQuestions.length} questions across {subjects.length} subjects
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {allCommonQuestions.slice(0, 12).map(({ q, subject }, i) => (
              <div key={i}
                className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/4 border border-slate-200 dark:border-white/8">
                <FaQuestionCircle className="text-indigo-400 text-[13px] mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[13px] text-slate-700 dark:text-slate-200 leading-snug">{q}</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{subject}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── PER-SUBJECT CARDS — from /admin/analytics/insights ──────── */}
      {!loading && subjects.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-black text-slate-900 dark:text-white">
              Subject AI Insights
            </h2>
            <span className="text-[12px] text-slate-400 dark:text-slate-500">
              {subjects.length} subject{subjects.length !== 1 ? "s" : ""} ·{" "}
              <code className="text-[11px] bg-slate-100 dark:bg-white/8 px-1 rounded">/admin/analytics/insights</code>
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {subjects.map((s, i) => (
              <Card key={s.subject_id ?? i} cls="p-4 sm:p-5 space-y-3">

                {/* Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-[12px] font-black text-white"
                      style={{ background: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }}>
                      {(s.subject_name ?? "?")[0].toUpperCase()}
                    </span>
                    <p className="text-[13px] font-black text-slate-900 dark:text-white truncate">
                      {s.subject_name ?? `Subject ${i + 1}`}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                    <FaCommentDots className="text-[10px]" />
                    {s.engagement_count ?? 0}
                  </span>
                </div>

                {/* AI insight */}
                {s.ai_insight && (
                  <div className="px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20">
                    <div className="flex items-start gap-1.5">
                      <FaLightbulb className="text-indigo-400 text-[11px] mt-0.5 flex-shrink-0" />
                      <p className="text-[12px] text-indigo-700 dark:text-indigo-300 leading-relaxed line-clamp-3">
                        {s.ai_insight}
                      </p>
                    </div>
                  </div>
                )}

                {/* Common questions */}
                {s.common_questions?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 mb-1.5">
                      Common Questions
                    </p>
                    <div className="space-y-1">
                      {s.common_questions.slice(0, 3).map((q, j) => (
                        <div key={j} className="flex items-start gap-1.5">
                          <span className="text-[10px] text-slate-400 mt-0.5 flex-shrink-0">·</span>
                          <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-snug">{q}</p>
                        </div>
                      ))}
                      {s.common_questions.length > 3 && (
                        <p className="text-[11px] text-slate-400 pl-3">
                          +{s.common_questions.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Weak topics */}
                {s.weak_topics?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 mb-1.5">
                      Weak Topics
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {s.weak_topics.slice(0, 4).map((t, j) => (
                        <span key={j}
                          className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 dark:bg-red-500/12 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/25">
                          {t.topic}
                          {t.frequency_score != null && (
                            <span className="opacity-60 ml-1">·{t.frequency_score}</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confusing concepts */}
                {s.confusing_concepts?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {s.confusing_concepts.slice(0, 3).map((c, j) => (
                      <span key={j}
                        className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-500/12 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/25">
                        {c}
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Analyzed {relTime(s.last_analyzed_at)}
                </p>
              </Card>
            ))}
          </div>
        </div>
      ) : !loading && (
        <Card cls="p-8 sm:p-12">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 flex items-center justify-center mx-auto mb-4">
              <FaBrain className="text-[28px] text-indigo-400 dark:text-indigo-500" />
            </div>
            <p className="text-[15px] font-black text-slate-600 dark:text-slate-300 mb-1">No analytics data yet</p>
            <p className="text-[13px] text-slate-400 dark:text-slate-500 mb-6 max-w-[38ch] mx-auto leading-relaxed">
              Click <strong className="text-slate-600 dark:text-slate-300">Generate Analytics</strong> to run
              AI analysis on student interactions across all subjects.
            </p>
            <button onClick={generate} disabled={genLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold cursor-pointer border-0
                         bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_4px_14px_rgba(99,102,241,0.30)]
                         transition-colors disabled:opacity-50">
              <FaBolt className="text-[11px]" /> Generate Now
            </button>
          </div>
        </Card>
      )}

    </div>
  );
}