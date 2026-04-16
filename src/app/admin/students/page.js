"use client";
/**
 * Lectures Overview — /admin/students
 *
 * KPIs come from the admin APIs via useAdminData():
 *   - totalSubjectsTracked, totalEngagement, completedOps, processingOps, failedOps
 *     all derived from GET /admin/analytics + GET /admin/operations
 *
 * The lectures table needs full lecture metadata (title, subject, created_at)
 * which is NOT in the admin endpoints, so it fetches from the standard
 * authenticated endpoints:
 *   GET /subjects/
 *   GET /lectures/subject/{id}
 *
 * The engagement per subject (engagement_count) is merged from /admin/analytics.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaSearch, FaBookOpen, FaCheckCircle, FaClock,
  FaSync, FaFolderOpen, FaExclamationCircle,
} from "react-icons/fa";
import { useAdminData, relTime, GRAD_COLORS, PIE_COLORS } from "@/hooks/useAdminData";
import { apiGetSubjects, apiGetLecturesBySubject } from "@/utils/api";

/* ── Status badge ─────────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const map = {
    completed:  "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30",
    processing: "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30",
    failed:     "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30",
  };
  const labels = { completed: "Ready", processing: "Processing", failed: "Failed" };
  return (
    <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold border
      ${map[status] ?? "bg-slate-100 dark:bg-white/8 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10"}`}>
      {labels[status] ?? status ?? "—"}
    </span>
  );
}

/* ── Ingestion progress bar ───────────────────────────────────────── */
function IngestionBar({ status }) {
  const cfg = {
    completed:  { pct: 100, cls: "bg-emerald-500" },
    processing: { pct: 50,  cls: "bg-amber-500"   },
    failed:     { pct: 100, cls: "bg-red-500"      },
  }[status] ?? { pct: 20, cls: "bg-slate-300 dark:bg-white/20" };
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden max-w-[100px]">
        <div className={`h-full rounded-full ${cfg.cls}`} style={{ width: `${cfg.pct}%` }} />
      </div>
      <span className="text-[12px] font-semibold text-slate-600 dark:text-slate-400 flex-shrink-0">{cfg.pct}%</span>
    </div>
  );
}

function initials(str = "") {
  return str.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("") || "?";
}

const Sk = ({ cls = "" }) => <div className={`rounded-lg bg-slate-100 dark:bg-white/8 animate-pulse ${cls}`} />;

/* ════════════════════════════════════════════════════════════════════
   LECTURES OVERVIEW PAGE
══════════════════════════════════════════════════════════════════════ */
export default function LecturesOverviewPage() {
  /* Admin API data (analytics + operations) */
  const {
    analyticsArr,
    loading:     adminLoading,
    error:       adminError,
    fetchAll:    refreshAdmin,
    totalSubjectsTracked,
    totalEngagement,
    completedOps,
    processingOps,
    failedOps,
  } = useAdminData();

  /* Subject + lecture data (standard endpoints) */
  const [subjects,      setSubjects]      = useState([]);
  const [lectures,      setLectures]      = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [subjectsError,   setSubjectsError]   = useState(null);

  const loadSubjectsAndLectures = useCallback(async () => {
    setSubjectsLoading(true);
    setSubjectsError(null);
    try {
      const subs = await apiGetSubjects();
      const subList = Array.isArray(subs) ? subs : [];
      setSubjects(subList);

      const results = await Promise.allSettled(subList.map(s => apiGetLecturesBySubject(s.id ?? s._id)));
      setLectures(results.flatMap((r, i) =>
        r.status === "fulfilled" && Array.isArray(r.value)
          ? r.value.map(l => ({
              ...l,
              _subjectId:   String(subList[i].id   ?? subList[i]._id ?? ""),
              _subjectName: subList[i].name ?? "Unknown",
            }))
          : []
      ));
    } catch (e) { setSubjectsError(e.message); }
    finally     { setSubjectsLoading(false); }
  }, []);

  useEffect(() => { loadSubjectsAndLectures(); }, [loadSubjectsAndLectures]);

  const loading = adminLoading || subjectsLoading;

  const refreshAll = useCallback(() => {
    refreshAdmin();
    loadSubjectsAndLectures();
  }, [refreshAdmin, loadSubjectsAndLectures]);

  /* Engagement map: subject_id → engagement_count from /admin/analytics */
  const engagementMap = useMemo(() => {
    const m = {};
    analyticsArr.forEach(a => { m[a.subject_id] = a.engagement_count ?? 0; });
    return m;
  }, [analyticsArr]);

  /* Computed counts from actual lecture statuses */
  const totalLectures  = lectures.length;
  const completedLec   = lectures.filter(l => l.status === "completed").length;
  const processingLec  = lectures.filter(l => l.status === "processing").length;

  /* KPI cards — mix admin API + lecture API data */
  const STATS = [
    { label: "Subjects",       value: loading ? "—" : String(subjects.length),   Icon: FaFolderOpen,  bg: "bg-indigo-50 dark:bg-indigo-500/15",   ic: "text-indigo-600 dark:text-indigo-400"   },
    { label: "Total Lectures", value: loading ? "—" : String(totalLectures),     Icon: FaBookOpen,    bg: "bg-purple-50 dark:bg-purple-500/15",   ic: "text-purple-600 dark:text-purple-400"   },
    { label: "Ready for AI",   value: loading ? "—" : String(completedLec),      Icon: FaCheckCircle, bg: "bg-emerald-50 dark:bg-emerald-500/15", ic: "text-emerald-600 dark:text-emerald-400" },
    { label: "AI Interactions",value: loading ? "—" : String(totalEngagement),   Icon: FaClock,       bg: "bg-amber-50 dark:bg-amber-500/15",    ic: "text-amber-600 dark:text-amber-400"     },
  ];

  /* Filters */
  const [search,     setSearch]     = useState("");
  const [subjFilter, setSubjFilter] = useState("all");
  const [statFilter, setStatFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return lectures.filter(l => {
      if (subjFilter !== "all" && l._subjectId !== subjFilter) return false;
      if (statFilter !== "all" && l.status !== statFilter)    return false;
      if (q && !(l.title ?? l.name ?? "").toLowerCase().includes(q)
            && !l._subjectName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [lectures, search, subjFilter, statFilter]);

  /* Subject cards — merge engagement from /admin/analytics */
  const subjectCards = useMemo(() =>
    subjects.map((s, i) => {
      const sid        = String(s.id ?? s._id ?? "");
      const lecs       = lectures.filter(l => l._subjectId === sid);
      const done       = lecs.filter(l => l.status === "completed").length;
      const pct        = lecs.length > 0 ? Math.round((done / lecs.length) * 100) : 0;
      const engagement = engagementMap[sid] ?? 0;
      return { ...s, _sid: sid, lecs, done, pct, grad: GRAD_COLORS[i % GRAD_COLORS.length], engagement };
    })
  , [subjects, lectures, engagementMap]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 sm:space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-black tracking-tight text-slate-900 dark:text-white">Lectures Overview</h1>
          <p className="text-[13px] sm:text-[14px] text-slate-500 dark:text-slate-400 mt-0.5">
            Engagement from <code className="text-[11px] bg-slate-100 dark:bg-white/8 px-1.5 py-0.5 rounded">/admin/analytics</code>
            {" "}· lectures from <code className="text-[11px] bg-slate-100 dark:bg-white/8 px-1.5 py-0.5 rounded">/subjects</code>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!loading && subjects.length > 0 && (
            <select value={subjFilter} onChange={e => setSubjFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl text-[12px] sm:text-[13px] outline-none appearance-none cursor-pointer
                         bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300">
              <option value="all">All Subjects</option>
              {subjects.map(s => <option key={s.id ?? s._id} value={String(s.id ?? s._id)}>{s.name}</option>)}
            </select>
          )}
          <select value={statFilter} onChange={e => setStatFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-[12px] sm:text-[13px] outline-none appearance-none cursor-pointer
                       bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300">
            <option value="all">All Statuses</option>
            <option value="completed">Ready</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </select>
          <div className="relative">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[12px] pointer-events-none" />
            <input type="search" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-[150px] sm:w-[180px] pl-9 pr-3 py-2.5 rounded-xl text-[13px] outline-none
                         bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/10
                         text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600
                         focus:border-indigo-400 dark:focus:border-indigo-500/60
                         focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)] transition-shadow" />
          </div>
          <button onClick={refreshAll} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[12px] font-bold cursor-pointer border-0
                       bg-slate-100 dark:bg-white/8 text-slate-600 dark:text-slate-300
                       hover:bg-slate-200 dark:hover:bg-white/14 transition-colors disabled:opacity-50">
            <FaSync className={`text-[11px] ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{loading ? "Loading…" : "Refresh"}</span>
          </button>
        </div>
      </div>

      {(adminError || subjectsError) && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/12 border border-red-200 dark:border-red-500/25 text-red-600 dark:text-red-400 text-[13px] font-semibold flex items-center gap-2">
          <FaExclamationCircle className="flex-shrink-0" /> {adminError ?? subjectsError}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {STATS.map(s => (
          <div key={s.label}
            className="bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl px-4 sm:px-5 py-4 shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] sm:text-[12px] text-slate-500 dark:text-slate-400 font-medium leading-tight">{s.label}</p>
              {loading ? <div className="h-7 w-10 rounded bg-slate-100 dark:bg-white/8 animate-pulse mt-1" />
                       : <p className="text-[20px] sm:text-[24px] font-black text-slate-900 dark:text-white mt-0.5">{s.value}</p>}
            </div>
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>
              <s.Icon className={`text-[16px] sm:text-[18px] ${s.ic}`} />
            </span>
          </div>
        ))}
      </div>

      {/* Subject cards with engagement from /admin/analytics */}
      {!loading && subjectCards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {subjectCards.map((s, i) => (
            <div key={s._sid || i}
              className="bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none flex items-start gap-3">
              <span className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-[12px] font-black text-white bg-gradient-to-br ${s.grad}`}>
                {initials(s.name)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[14px] font-black text-slate-900 dark:text-white truncate">{s.name}</p>
                  {s.engagement > 0 && (
                    <span className="text-[11px] font-bold text-indigo-500 dark:text-indigo-400 flex-shrink-0">
                      {s.engagement} chats
                    </span>
                  )}
                </div>
                {s.description && <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{s.description}</p>}
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${s.pct}%` }} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex-shrink-0">
                    {s.done}/{s.lecs.length} ready
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lectures table */}
      <div className="bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none overflow-hidden">
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-100 dark:border-white/8">
          <h2 className="text-[14px] font-black text-slate-900 dark:text-white">
            All Lectures
            {!loading && <span className="ml-2 text-[12px] font-semibold text-slate-400">({filtered.length}{filtered.length !== lectures.length ? ` of ${lectures.length}` : ""})</span>}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/8 bg-slate-50 dark:bg-white/[0.02]">
                {["Lecture","Subject","Ingestion","Status","Created"].map(h => (
                  <th key={h} className="text-left px-4 sm:px-6 py-3 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/6">
              {loading
                ? [1,2,3,4,5].map(i => (
                    <tr key={i}>
                      {[200,100,110,80,90].map((w,j) => (
                        <td key={j} className="px-4 sm:px-6 py-4">
                          <div className="h-4 rounded bg-slate-100 dark:bg-white/8 animate-pulse" style={{width:w}} />
                        </td>
                      ))}
                    </tr>
                  ))
                : filtered.map((l, idx) => (
                  <tr key={l.id ?? l._id ?? idx} className="hover:bg-slate-50 dark:hover:bg-white/[0.025] transition-colors">
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <span className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-[11px] font-black text-white bg-gradient-to-br ${GRAD_COLORS[idx % GRAD_COLORS.length]}`}>
                          {initials(l.title ?? l.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] sm:text-[14px] font-bold text-slate-900 dark:text-white truncate">{l.title ?? l.name ?? "Untitled"}</p>
                          {l.description && <p className="text-[11px] sm:text-[12px] text-slate-400 dark:text-slate-500 truncate max-w-[200px]">{l.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <span className="inline-flex items-center gap-1.5 text-[12px] sm:text-[13px] font-semibold text-slate-600 dark:text-slate-300">
                        <FaFolderOpen className="text-indigo-500 text-[11px] flex-shrink-0" />
                        {l._subjectName ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4"><IngestionBar status={l.status} /></td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={l.status} />
                        {l.status === "failed" && <FaExclamationCircle className="text-red-400 text-[11px]" />}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <span className="text-[12px] sm:text-[13px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {relTime(l.created_at ?? l.createdAt)}
                      </span>
                    </td>
                  </tr>
                ))
              }
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="py-16 text-center">
                  <p className="text-[14px] font-semibold text-slate-400 dark:text-slate-500">
                    {search || subjFilter !== "all" || statFilter !== "all" ? "No lectures match your filters." : "No lectures found."}
                  </p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
