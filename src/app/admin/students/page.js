"use client";
import { useState, useMemo } from "react";
import { FaSearch, FaUsers, FaArrowUp, FaCommentDots, FaClock } from "react-icons/fa";

/* ── mock data ───────────────────────────────────────────────────── */
const STUDENTS = [
  { id:1,  name:"Sarah Johnson",   email:"sarah.j@university.edu",   questions:142, comprehension:92, sentiment:"Understood", avgResponse:"1.2s", lastActive:"5 min ago",    initials:"SJ", color:"from-indigo-500 to-purple-600" },
  { id:2,  name:"Michael Chen",    email:"michael.c@university.edu", questions:98,  comprehension:85, sentiment:"Neutral",    avgResponse:"1.4s", lastActive:"12 min ago",   initials:"MC", color:"from-violet-500 to-indigo-600" },
  { id:3,  name:"Emily Rodriguez", email:"emily.r@university.edu",   questions:156, comprehension:94, sentiment:"Understood", avgResponse:"1.1s", lastActive:"23 min ago",   initials:"ER", color:"from-emerald-500 to-teal-600"  },
  { id:4,  name:"David Kim",       email:"david.k@university.edu",   questions:67,  comprehension:68, sentiment:"Confused",   avgResponse:"1.3s", lastActive:"1 hour ago",   initials:"DK", color:"from-indigo-500 to-purple-600" },
  { id:5,  name:"Jessica Taylor",  email:"jessica.t@university.edu", questions:189, comprehension:96, sentiment:"Understood", avgResponse:"1.0s", lastActive:"2 hours ago",  initials:"JT", color:"from-purple-500 to-pink-600"   },
  { id:6,  name:"Alex Thompson",   email:"alex.t@university.edu",    questions:74,  comprehension:78, sentiment:"Neutral",    avgResponse:"1.5s", lastActive:"3 hours ago",  initials:"AT", color:"from-amber-500 to-orange-600"  },
  { id:7,  name:"Maria Garcia",    email:"maria.g@university.edu",   questions:211, comprehension:91, sentiment:"Understood", avgResponse:"1.1s", lastActive:"5 hours ago",  initials:"MG", color:"from-indigo-500 to-blue-600"   },
  { id:8,  name:"James Wilson",    email:"james.w@university.edu",   questions:43,  comprehension:61, sentiment:"Confused",   avgResponse:"1.8s", lastActive:"1 day ago",    initials:"JW", color:"from-rose-500 to-pink-600"     },
];

const STATS = [
  { label:"Total Students",    value:"2,345", Icon:FaUsers,       bg:"bg-indigo-50 dark:bg-indigo-500/15",   ic:"text-indigo-600 dark:text-indigo-400"   },
  { label:"Active Today",      value:"1,847", Icon:FaArrowUp,     bg:"bg-emerald-50 dark:bg-emerald-500/15", ic:"text-emerald-600 dark:text-emerald-400"  },
  { label:"Avg Questions",     value:"5.5",   Icon:FaCommentDots, bg:"bg-purple-50 dark:bg-purple-500/15",   ic:"text-purple-600 dark:text-purple-400"    },
  { label:"Avg Response Time", value:"1.2s",  Icon:FaClock,       bg:"bg-amber-50 dark:bg-amber-500/15",     ic:"text-amber-600 dark:text-amber-400"      },
];

function CompBar({ pct }) {
  const color = pct >= 90 ? "bg-emerald-500" : pct >= 75 ? "bg-blue-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden max-w-[100px]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[12px] sm:text-[13px] font-semibold text-slate-700 dark:text-slate-300 flex-shrink-0">{pct}%</span>
    </div>
  );
}

function SentimentBadge({ s }) {
  const map = {
    Understood: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30",
    Neutral:    "bg-slate-100 dark:bg-white/8 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10",
    Confused:   "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30",
  };
  return (
    <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold border ${map[s] || map.Neutral}`}>
      {s}
    </span>
  );
}

export default function StudentsPage() {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() =>
    STUDENTS.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
    ), [search]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 sm:space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-black tracking-tight text-slate-900 dark:text-white">Students</h1>
          <p className="text-[13px] sm:text-[14px] text-slate-500 dark:text-slate-400 mt-0.5">Monitor student engagement and comprehension</p>
        </div>
        {/* Search */}
        <div className="relative w-full sm:w-auto">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-[13px]" />
          <input
            type="search"
            placeholder="Search students..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-[200px] pl-9 pr-4 py-2.5 rounded-xl text-[13px] outline-none
                       bg-white dark:bg-[#0f1117]
                       border border-slate-200 dark:border-white/10
                       text-slate-900 dark:text-slate-100
                       placeholder:text-slate-400 dark:placeholder:text-slate-600
                       focus:border-indigo-400 dark:focus:border-indigo-500/60
                       focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]
                       transition-shadow"
          />
        </div>
      </div>

      {/* Stat cards — 2 cols xs, 4 cols md+ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {STATS.map(s => (
          <div key={s.label}
            className="bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl px-4 sm:px-5 py-4 shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] sm:text-[12px] text-slate-500 dark:text-slate-400 font-medium leading-tight">{s.label}</p>
              <p className="text-[20px] sm:text-[24px] font-black text-slate-900 dark:text-white mt-0.5">{s.value}</p>
            </div>
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>
              <s.Icon className={`text-[16px] sm:text-[18px] ${s.ic}`} />
            </span>
          </div>
        ))}
      </div>

      {/* Table — scrollable on mobile */}
      <div className="bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/8 bg-slate-50 dark:bg-white/[0.02]">
                {["Student","Questions","Comprehension","Sentiment","Avg Response","Last Active"].map(h => (
                  <th key={h} className="text-left px-4 sm:px-6 py-3 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/6">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.025] transition-colors">
                  {/* Student */}
                  <td className="px-4 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <span className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] sm:text-[12px] font-black text-white bg-gradient-to-br ${s.color}`}>
                        {s.initials}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] sm:text-[14px] font-bold text-slate-900 dark:text-white truncate">{s.name}</p>
                        <p className="text-[11px] sm:text-[12px] text-slate-400 dark:text-slate-500 truncate">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  {/* Questions */}
                  <td className="px-4 sm:px-6 py-3 sm:py-4">
                    <span className="text-[13px] sm:text-[14px] font-semibold text-slate-700 dark:text-slate-300">{s.questions}</span>
                  </td>
                  {/* Comprehension */}
                  <td className="px-4 sm:px-6 py-3 sm:py-4">
                    <CompBar pct={s.comprehension} />
                  </td>
                  {/* Sentiment */}
                  <td className="px-4 sm:px-6 py-3 sm:py-4">
                    <SentimentBadge s={s.sentiment} />
                  </td>
                  {/* Avg Response */}
                  <td className="px-4 sm:px-6 py-3 sm:py-4">
                    <span className="text-[12px] sm:text-[13px] text-slate-600 dark:text-slate-400">{s.avgResponse}</span>
                  </td>
                  {/* Last Active */}
                  <td className="px-4 sm:px-6 py-3 sm:py-4">
                    <span className="text-[12px] sm:text-[13px] text-slate-500 dark:text-slate-400 whitespace-nowrap">{s.lastActive}</span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-[13px] text-slate-400 dark:text-slate-500">
                    No students match &ldquo;{search}&rdquo;
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
