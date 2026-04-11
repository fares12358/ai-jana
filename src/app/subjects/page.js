"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Brain, Moon, Sun, LogOut, Plus, Folder, X, BookOpen, AlignLeft, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, useTheme } from "@/context/AppContext";
import { useSubjects } from "@/hooks/useSubjects";
import RequireAuth from "@/components/RequireAuth";

const COLORS = [
  { bg: "bg-indigo-100 dark:bg-indigo-500/20",  icon: "text-indigo-600 dark:text-indigo-300" },
  { bg: "bg-purple-100 dark:bg-purple-500/20",  icon: "text-purple-600 dark:text-purple-300" },
  { bg: "bg-emerald-100 dark:bg-emerald-500/20",icon: "text-emerald-600 dark:text-emerald-300"},
  { bg: "bg-amber-100 dark:bg-amber-500/20",    icon: "text-amber-600 dark:text-amber-300"   },
  { bg: "bg-pink-100 dark:bg-pink-500/20",      icon: "text-pink-600 dark:text-pink-300"     },
  { bg: "bg-blue-100 dark:bg-blue-500/20",      icon: "text-blue-600 dark:text-blue-300"     },
];
const stagger  = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const cardAnim = { hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } } };

function AddSubjectModal({ open, onClose, onAdd }) {
  const [name, setName]           = useState("");
  const [desc, setDesc]           = useState("");
  const [error, setError]         = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset       = () => { setName(""); setDesc(""); setError(""); };
  const handleClose = () => { if (submitting) return; reset(); onClose(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError("Subject name is required"); return; }
    setSubmitting(true); setError("");
    try { await onAdd({ name: name.trim(), description: desc.trim() }); reset(); onClose(); }
    catch (err) { setError(err.message || "Failed to create subject"); }
    finally { setSubmitting(false); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={handleClose}>
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm tc" />
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 32 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 32 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full sm:max-w-[460px] tc rounded-t-2xl sm:rounded-2xl shadow-[0_-8px_40px_rgba(0,0,0,0.18)] sm:shadow-[0_24px_80px_rgba(0,0,0,0.22)] bg-white dark:bg-[#111827] border-t border-x sm:border border-slate-200 dark:border-white/10"
            onClick={e => e.stopPropagation()}>
            <div className="sm:hidden flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-white/20" /></div>
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-100 dark:border-white/8 tc">
              <div>
                <h2 className="font-black text-[16px] sm:text-[17px] text-slate-900 dark:text-white">New Subject</h2>
                <p className="text-[12px] text-slate-500 dark:text-gray-400 mt-0.5">Add a subject folder for your lectures</p>
              </div>
              <button onClick={handleClose} className="w-8 h-8 rounded-xl grid place-items-center cursor-pointer border-0 tc bg-slate-100 dark:bg-white/8 text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/14 hover:text-slate-900 dark:hover:text-white"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-5 sm:px-6 py-4 sm:py-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-slate-700 dark:text-gray-300 flex items-center gap-1.5"><BookOpen size={13} className="text-indigo-500" />Subject Name <span className="text-red-500">*</span></label>
                <input autoFocus value={name} onChange={e => { setName(e.target.value); setError(""); }} placeholder="e.g. Machine Learning" disabled={submitting}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-[14px] outline-none tc text-slate-900 dark:text-gray-100 placeholder:text-slate-400 dark:placeholder:text-gray-600 bg-slate-50 dark:bg-white/6 border ${error ? "border-red-400 dark:border-red-400/70" : "border-slate-200 dark:border-white/10"} focus:border-indigo-400 dark:focus:border-indigo-500/70 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)] disabled:opacity-60`} />
                <AnimatePresence>{error && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[12px] text-red-500 font-semibold">{error}</motion.p>}</AnimatePresence>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-slate-700 dark:text-gray-300 flex items-center gap-1.5"><AlignLeft size={13} className="text-indigo-500" />Description <span className="text-slate-400 dark:text-gray-600 font-normal">(optional)</span></label>
                <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="A short description…" rows={3} disabled={submitting}
                  className="w-full px-3.5 py-2.5 rounded-xl text-[14px] outline-none resize-none tc text-slate-900 dark:text-gray-100 placeholder:text-slate-400 dark:placeholder:text-gray-600 bg-slate-50 dark:bg-white/6 border border-slate-200 dark:border-white/10 focus:border-indigo-400 dark:focus:border-indigo-500/70 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)] disabled:opacity-60" />
              </div>
              <div className="flex gap-3 pt-1 pb-1 sm:pb-0">
                <button type="button" onClick={handleClose} disabled={submitting} className="flex-1 py-2.5 rounded-xl text-[14px] font-bold cursor-pointer border tc bg-slate-100 dark:bg-white/8 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/14 disabled:opacity-50 disabled:cursor-not-allowed">Cancel</button>
                <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-xl text-[14px] font-bold cursor-pointer border-0 bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_4px_14px_rgba(99,102,241,0.30)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                  {submitting ? <span className="flex items-center justify-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Creating…</span> : "Create Subject"}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SubjectsContent() {
  const router = useRouter();
  const { logout } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const { subjects, loading, error, addSubject, refresh } = useSubjects();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="min-h-screen tc bg-slate-50 dark:bg-[#0b1020] text-slate-900 dark:text-gray-100">
      <header className="sticky top-0 z-50 tc bg-white/95 dark:bg-[#0b1020]/92 backdrop-blur-xl border-b border-slate-200 dark:border-white/8 shadow-sm dark:shadow-none">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 flex items-center justify-between gap-3 py-3">
          <button className="flex items-center gap-2 sm:gap-2.5 cursor-pointer bg-transparent border-0 p-0 flex-shrink-0" onClick={() => router.push("/")}>
            <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl grid place-items-center flex-shrink-0 bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_4px_14px_rgba(109,92,255,0.28)]"><Brain size={17} color="#fff" /></span>
            <span className="font-black text-[15px] sm:text-[17px] tracking-tight whitespace-nowrap text-slate-900 dark:text-gray-100 tc">Lecture Brain</span>
          </button>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.90 }} onClick={toggleTheme} aria-label="Toggle theme"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl grid place-items-center cursor-pointer tc bg-white dark:bg-white/8 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white shadow-sm">
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </motion.button>
            <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.90 }} onClick={logout} aria-label="Logout"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl grid place-items-center cursor-pointer tc bg-white dark:bg-white/8 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 shadow-sm">
              <LogOut size={15} />
            </motion.button>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-7 sm:pt-10 pb-16">
        <div className="flex items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="min-w-0">
            <h1 className="m-0 text-[28px] sm:text-[40px] md:text-[48px] font-black tracking-[-1px] leading-[1.05] text-slate-900 dark:text-white tc truncate">My Subjects</h1>
            <p className="mt-1 sm:mt-2 text-[13px] sm:text-[14px] text-slate-500 dark:text-gray-400 tc">Organize your lecture brains by subject</p>
          </div>
          <motion.button whileHover={{ y: -2, boxShadow: "0 12px 28px rgba(99,102,241,0.30)" }} whileTap={{ scale: 0.97 }} onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl border-0 font-bold text-[13px] sm:text-[14px] cursor-pointer whitespace-nowrap flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_4px_18px_rgba(99,102,241,0.28)] transition-colors">
            <Plus size={15} /> New Subject
          </motion.button>
        </div>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[1,2,3].map(i => <div key={i} className="h-[78px] rounded-2xl animate-pulse tc bg-slate-200 dark:bg-white/8" />)}
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-[14px] text-red-500 dark:text-red-400 font-semibold">{error}</p>
            <motion.button whileTap={{ scale: 0.97 }} onClick={refresh} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-0 text-[13px] font-bold cursor-pointer bg-slate-900 dark:bg-white text-white dark:text-slate-900">
              <RefreshCw size={14} /> Retry
            </motion.button>
          </div>
        )}

        {!loading && !error && (
          <motion.section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4" variants={stagger} initial="hidden" animate="show">
            {subjects.map((s, idx) => {
              const c = COLORS[idx % COLORS.length];
              return (
                <motion.button key={s.id} variants={cardAnim} whileHover={{ y: -3, boxShadow: "0 16px 40px rgba(2,6,23,0.10)" }} whileTap={{ scale: 0.98 }}
                  onClick={() => router.push(`/subjects/${s.id}`)}
                  className={`text-left w-full flex gap-3 sm:gap-4 items-center tc bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/8 rounded-2xl px-4 sm:px-5 py-4 sm:py-5 shadow-[0_2px_14px_rgba(2,6,23,0.05)] dark:shadow-none cursor-pointer ${s._pending ? "opacity-60" : ""}`}>
                  <div className={`${c.bg} w-11 h-11 sm:w-[52px] sm:h-[52px] rounded-xl grid place-items-center flex-shrink-0 tc`}><Folder size={18} className={c.icon} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] sm:text-[16px] font-black truncate mb-1 text-slate-900 dark:text-white tc">{s.name}</div>
                    {s.description && <div className="text-[12px] text-slate-400 dark:text-gray-500 truncate mb-1.5 tc">{s.description}</div>}
                    <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold tc border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-gray-400">{s.lecturesCount ?? 0} Lectures</span>
                  </div>
                </motion.button>
              );
            })}
            <motion.button variants={cardAnim} whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} onClick={() => setModalOpen(true)}
              className="text-left w-full flex gap-3 sm:gap-4 items-center tc border-2 border-dashed border-slate-300 dark:border-white/15 bg-white/50 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/5 hover:border-indigo-300 dark:hover:border-indigo-500/40 rounded-2xl px-4 sm:px-5 py-4 sm:py-5 cursor-pointer transition-colors">
              <div className="w-11 h-11 sm:w-[52px] sm:h-[52px] rounded-xl grid place-items-center flex-shrink-0 tc bg-slate-100 dark:bg-white/8"><Plus size={20} className="text-slate-400 dark:text-gray-500" /></div>
              <div className="min-w-0">
                <div className="text-[15px] sm:text-[16px] font-black mb-0.5 text-slate-700 dark:text-gray-300 tc">Add New Subject</div>
                <div className="text-[12px] sm:text-[13px] text-slate-400 dark:text-gray-500 tc">Create a new subject folder</div>
              </div>
            </motion.button>
          </motion.section>
        )}

        {!loading && !error && subjects.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="mt-5 sm:mt-6 text-center py-12 sm:py-16 px-4 sm:px-6 rounded-2xl tc border border-dashed border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.02]">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 tc bg-indigo-50 dark:bg-indigo-500/15"><Folder size={22} className="text-indigo-500 dark:text-indigo-400" /></div>
            <p className="text-[14px] sm:text-[15px] font-black mb-1 text-slate-800 dark:text-gray-200 tc">No subjects yet</p>
            <p className="text-[12px] sm:text-[13px] mb-5 sm:mb-6 text-slate-400 dark:text-gray-500 tc max-w-[28ch] mx-auto">Create your first subject to start organizing your lectures.</p>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl border-0 font-bold text-[13px] cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_4px_14px_rgba(99,102,241,0.30)] transition-colors">
              <Plus size={14} /> Create Subject
            </motion.button>
          </motion.div>
        )}
      </main>
      <AddSubjectModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={addSubject} />
    </div>
  );
}

export default function SubjectsPage() {
  return <RequireAuth><SubjectsContent /></RequireAuth>;
}
