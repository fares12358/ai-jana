"use client";
import { useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Brain, Moon, Sun, LogOut, Plus, ArrowLeft,
  X, BookOpen, Link as LinkIcon, Upload, FileText,
  Video, Trash2, Play, RefreshCw, Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, useTheme } from "@/context/AppContext";
import { useLectures } from "@/hooks/useLectures";
import { useSubjects } from "@/hooks/useSubjects";
import RequireAuth from "@/components/RequireAuth";

const LECTURE_COLORS = [
  { bg: "bg-indigo-100 dark:bg-indigo-500/20",  icon: "text-indigo-600 dark:text-indigo-300" },
  { bg: "bg-purple-100 dark:bg-purple-500/20",  icon: "text-purple-600 dark:text-purple-300" },
  { bg: "bg-emerald-100 dark:bg-emerald-500/20",icon: "text-emerald-600 dark:text-emerald-300"},
  { bg: "bg-amber-100 dark:bg-amber-500/20",    icon: "text-amber-600 dark:text-amber-300"   },
  { bg: "bg-pink-100 dark:bg-pink-500/20",      icon: "text-pink-600 dark:text-pink-300"     },
  { bg: "bg-blue-100 dark:bg-blue-500/20",      icon: "text-blue-600 dark:text-blue-300"     },
];
const stagger  = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const cardAnim = { hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } } };

function StatusBadge({ status }) {
  if (!status || status === "completed") return null;
  const map = {
    processing: { label: "Processing…", cls: "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300", icon: <Loader2 size={11} className="animate-spin" /> },
    failed:     { label: "Failed",      cls: "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300",         icon: null },
  };
  const info = map[status];
  if (!info) return null;
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${info.cls}`}>{info.icon}{info.label}</span>;
}

function AddLectureModal({ open, onClose, onAdd }) {
  const fileRef = useRef(null);
  const [name, setName]           = useState("");
  const [video, setVideo]         = useState("");
  const [file, setFile]           = useState(null);
  const [error, setError]         = useState("");
  const [dragging, setDragging]   = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reset       = () => { setName(""); setVideo(""); setFile(null); setError(""); setDragging(false); };
  const handleClose = () => { if (submitting) return; reset(); onClose(); };
  const handleFile  = (f) => { if (!f) return; if (!f.name.match(/\.(pdf|mp4|webm|mp3|wav|txt|docx)$/i)) { setError("Unsupported file type"); return; } setFile(f); setError(""); };
  const handleDrop  = (e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError("Lecture name is required"); return; }
    if (!file && !video.trim()) { setError("Add a file or a video link"); return; }
    setSubmitting(true); setError("");
    try { await onAdd({ title: name.trim(), description: video.trim() || (file ? file.name : "") }); reset(); onClose(); }
    catch (err) { setError(err.message || "Failed to add lecture"); }
    finally { setSubmitting(false); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={handleClose}>
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm tc" />
          <motion.div initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-[500px] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.22)] tc bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/8 tc sticky top-0 bg-white dark:bg-[#111827] z-10">
              <div><h2 className="font-black text-[17px] text-slate-900 dark:text-white">Add Lecture</h2><p className="text-[12px] text-slate-500 dark:text-gray-400 mt-0.5">Upload a file or add a video link</p></div>
              <button onClick={handleClose} className="w-8 h-8 rounded-xl grid place-items-center cursor-pointer border-0 tc bg-slate-100 dark:bg-white/8 text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/14 hover:text-slate-900 dark:hover:text-white"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-slate-700 dark:text-gray-300 flex items-center gap-1.5 tc"><BookOpen size={13} className="text-indigo-500" />Lecture Name <span className="text-red-500">*</span></label>
                <input autoFocus value={name} onChange={e => { setName(e.target.value); setError(""); }} placeholder="e.g. Introduction to Neural Networks" disabled={submitting}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-[14px] outline-none tc text-slate-900 dark:text-gray-100 placeholder:text-slate-400 dark:placeholder:text-gray-600 bg-slate-50 dark:bg-white/6 border ${error && !name.trim() ? "border-red-400 dark:border-red-400/70" : "border-slate-200 dark:border-white/10"} focus:border-indigo-400 dark:focus:border-indigo-500/70 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)] disabled:opacity-60`} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-slate-700 dark:text-gray-300 flex items-center gap-1.5 tc"><Video size={13} className="text-indigo-500" />Video Link <span className="text-slate-400 dark:text-gray-600 font-normal">(optional)</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500"><LinkIcon size={14} /></span>
                  <input type="url" value={video} onChange={e => { setVideo(e.target.value); setError(""); }} placeholder="https://youtube.com/watch?v=..." disabled={submitting}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-[14px] outline-none tc text-slate-900 dark:text-gray-100 placeholder:text-slate-400 dark:placeholder:text-gray-600 bg-slate-50 dark:bg-white/6 border border-slate-200 dark:border-white/10 focus:border-indigo-400 dark:focus:border-indigo-500/70 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)] disabled:opacity-60" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-slate-700 dark:text-gray-300 flex items-center gap-1.5 tc"><Upload size={13} className="text-indigo-500" />Upload File <span className="text-slate-400 dark:text-gray-600 font-normal">(optional)</span></label>
                {file ? (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl tc bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30">
                    <FileText size={18} className="text-indigo-500 flex-shrink-0" />
                    <span className="text-[13px] font-bold text-slate-800 dark:text-gray-200 truncate flex-1 tc">{file.name}</span>
                    <button type="button" onClick={() => setFile(null)} className="border-0 bg-transparent cursor-pointer text-slate-400 dark:text-gray-500 hover:text-red-500 tc p-0"><Trash2 size={15} /></button>
                  </div>
                ) : (
                  <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop} onClick={() => fileRef.current?.click()}
                    className={`flex flex-col items-center justify-center gap-2 py-7 rounded-xl cursor-pointer border-2 border-dashed tc transition-colors ${dragging ? "border-indigo-400 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-500/15" : "border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/5 hover:border-indigo-300 dark:hover:border-indigo-500/40"}`}>
                    <Upload size={22} className="text-slate-400 dark:text-gray-500" />
                    <div className="text-[13px] font-semibold text-slate-600 dark:text-gray-400 tc">Drop file here or <span className="text-indigo-600 dark:text-indigo-400">browse</span></div>
                    <div className="text-[11px] text-slate-400 dark:text-gray-600 tc">PDF, MP4, MP3, DOCX, TXT</div>
                    <input ref={fileRef} type="file" className="hidden" accept=".pdf,.mp4,.webm,.mp3,.wav,.txt,.docx" onChange={e => handleFile(e.target.files[0])} />
                  </div>
                )}
              </div>
              <AnimatePresence>{error && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[12px] text-red-500 font-semibold -mt-1">{error}</motion.p>}</AnimatePresence>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={handleClose} disabled={submitting} className="flex-1 py-2.5 rounded-xl text-[14px] font-bold cursor-pointer border tc bg-slate-100 dark:bg-white/8 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/14 disabled:opacity-50 disabled:cursor-not-allowed">Cancel</button>
                <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-xl text-[14px] font-bold cursor-pointer border-0 bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_4px_14px_rgba(99,102,241,0.30)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                  {submitting ? <span className="flex items-center justify-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Adding…</span> : "Add Lecture"}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SubjectDetailContent() {
  const router = useRouter();
  const { subjectId } = useParams();
  const { logout } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const { lectures, loading, error, addLecture, refresh } = useLectures(subjectId);
  const { subjects } = useSubjects();
  const subject     = subjects.find((s) => String(s.id) === String(subjectId));
  const subjectName = subject?.name ?? subjectId?.replace(/-/g, " ") ?? "Subject";
  const [modalOpen, setModalOpen] = useState(false);

  const iconBtn = "w-9 h-9 rounded-xl grid place-items-center cursor-pointer tc bg-white dark:bg-white/8 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white shadow-sm";

  return (
    <div className="min-h-screen tc bg-slate-50 dark:bg-[#0b1020] text-slate-900 dark:text-gray-100">
      <header className="sticky top-0 z-50 tc bg-white/95 dark:bg-[#0b1020]/92 backdrop-blur-xl border-b border-slate-200 dark:border-white/8 shadow-sm dark:shadow-none">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 flex items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <motion.button whileHover={{ x: -2 }} whileTap={{ scale: 0.90 }} onClick={() => router.push("/subjects")} className={iconBtn}><ArrowLeft size={17} /></motion.button>
            <button className="flex items-center gap-2 sm:gap-2.5 cursor-pointer bg-transparent border-0 p-0" onClick={() => router.push("/")}>
              <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl grid place-items-center flex-shrink-0 bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_4px_14px_rgba(109,92,255,0.28)]"><Brain size={17} color="#fff" /></span>
              <span className="font-black text-[15px] sm:text-[17px] tracking-tight whitespace-nowrap text-slate-900 dark:text-gray-100 tc hidden sm:block">Lecture Brain</span>
            </button>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.90 }} onClick={toggleTheme} className={iconBtn}>{dark ? <Sun size={16} /> : <Moon size={16} />}</motion.button>
            <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.90 }} onClick={logout} className={`${iconBtn} hover:!text-red-500 dark:hover:!text-red-400`}><LogOut size={16} /></motion.button>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-7 sm:pt-10 pb-16">
        <div className="flex items-center gap-2 mb-5 sm:mb-6 text-[13px] text-slate-400 dark:text-gray-500 tc">
          <button onClick={() => router.push("/subjects")} className="hover:text-indigo-600 dark:hover:text-indigo-400 tc border-0 bg-transparent cursor-pointer p-0 font-medium">My Subjects</button>
          <span>/</span>
          <span className="text-slate-700 dark:text-gray-300 font-semibold tc capitalize">{subjectName}</span>
        </div>

        <div className="flex items-start justify-between gap-4 mb-7 sm:mb-8 flex-wrap">
          <div className="min-w-0">
            <h1 className="m-0 text-[28px] sm:text-[36px] md:text-[44px] font-black tracking-[-1px] leading-[1.05] capitalize tc text-slate-900 dark:text-white truncate">{subjectName}</h1>
            <p className="mt-1 sm:mt-2 text-[13px] sm:text-[14px] text-slate-500 dark:text-gray-400 tc">{loading ? "Loading lectures…" : lectures.length === 0 ? "No lectures yet — add your first one" : `${lectures.length} lecture${lectures.length !== 1 ? "s" : ""}`}</p>
          </div>
          <motion.button whileHover={{ y: -2, boxShadow: "0 12px 28px rgba(99,102,241,0.30)" }} whileTap={{ scale: 0.97 }} onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl border-0 font-bold text-[13px] sm:text-[14px] cursor-pointer whitespace-nowrap flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_4px_18px_rgba(99,102,241,0.28)] transition-colors">
            <Plus size={15} /> Add Lecture
          </motion.button>
        </div>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[1,2,3].map(i => <div key={i} className="h-[130px] rounded-2xl animate-pulse tc bg-slate-200 dark:bg-white/8" />)}
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-[14px] text-red-500 dark:text-red-400 font-semibold">{error}</p>
            <motion.button whileTap={{ scale: 0.97 }} onClick={refresh} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-0 text-[13px] font-bold cursor-pointer bg-slate-900 dark:bg-white text-white dark:text-slate-900"><RefreshCw size={14} /> Retry</motion.button>
          </div>
        )}

        {!loading && !error && (
          <motion.section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4" variants={stagger} initial="hidden" animate="show">
            {lectures.map((l, idx) => {
              const c = LECTURE_COLORS[idx % LECTURE_COLORS.length];
              const isProcessing = l.status === "processing";
              return (
                <motion.button key={l.id} variants={cardAnim}
                  whileHover={!isProcessing ? { y: -3, boxShadow: "0 16px 40px rgba(2,6,23,0.10)" } : {}}
                  whileTap={!isProcessing ? { scale: 0.98 } : {}}
                  onClick={() => !isProcessing && router.push(`/chat?subject=${subjectId}&lecture=${l.id}`)}
                  disabled={isProcessing || l._pending}
                  className={`text-left w-full rounded-2xl tc bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/8 shadow-[0_2px_14px_rgba(2,6,23,0.05)] dark:shadow-none overflow-hidden cursor-pointer ${isProcessing || l._pending ? "opacity-70 cursor-wait" : ""}`}>
                  <div className={`${c.bg} px-4 sm:px-5 py-4 sm:py-5 flex items-center gap-3 tc`}>
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl grid place-items-center flex-shrink-0 bg-white/70 dark:bg-black/20 tc">
                      {l.description?.startsWith("http") ? <Play size={17} className={c.icon} /> : <FileText size={17} className={c.icon} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-black text-[14px] sm:text-[15px] leading-tight truncate tc text-slate-900 dark:text-white">{l.title ?? l.name}</div>
                      <div className="text-[11px] mt-0.5 tc text-slate-500 dark:text-gray-400">
                        {l.createdAt ?? new Date(l.created_at ?? Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </div>
                  </div>
                  <div className="px-4 sm:px-5 py-2.5 sm:py-3 flex items-center gap-3 tc">
                    <StatusBadge status={l.status} />
                    {l.description && !l.description.startsWith("http") && <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tc text-slate-500 dark:text-gray-400 truncate"><FileText size={11} />{l.description}</span>}
                    {l.description?.startsWith("http") && <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tc text-slate-500 dark:text-gray-400"><Video size={11} />Video linked</span>}
                    {!isProcessing && <span className="ml-auto text-[11px] font-bold tc text-indigo-600 dark:text-indigo-400 flex-shrink-0">Open Chat →</span>}
                  </div>
                </motion.button>
              );
            })}
            <motion.button variants={cardAnim} whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} onClick={() => setModalOpen(true)}
              className="text-left w-full flex gap-3 sm:gap-4 items-center tc border-2 border-dashed border-slate-300 dark:border-white/15 bg-white/50 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/5 hover:border-indigo-300 dark:hover:border-indigo-500/40 rounded-2xl px-4 sm:px-5 py-4 sm:py-5 cursor-pointer transition-colors">
              <div className="w-11 h-11 sm:w-[52px] sm:h-[52px] rounded-xl grid place-items-center flex-shrink-0 tc bg-slate-100 dark:bg-white/8"><Plus size={20} className="text-slate-400 dark:text-gray-500" /></div>
              <div className="min-w-0">
                <div className="text-[15px] sm:text-[16px] font-black mb-0.5 text-slate-700 dark:text-gray-300 tc">Add New Lecture</div>
                <div className="text-[12px] sm:text-[13px] text-slate-400 dark:text-gray-500 tc">Upload a file or add a video link</div>
              </div>
            </motion.button>
          </motion.section>
        )}

        {!loading && !error && lectures.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="mt-5 sm:mt-6 text-center py-12 sm:py-16 px-4 sm:px-6 rounded-2xl tc border border-dashed border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.02]">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 tc bg-indigo-50 dark:bg-indigo-500/15"><BookOpen size={22} className="text-indigo-500 dark:text-indigo-400" /></div>
            <p className="text-[14px] sm:text-[15px] font-black mb-1 text-slate-800 dark:text-gray-200 tc">No lectures yet</p>
            <p className="text-[12px] sm:text-[13px] mb-5 sm:mb-6 text-slate-400 dark:text-gray-500 tc max-w-[28ch] mx-auto">Add your first lecture to start learning with AI.</p>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl border-0 font-bold text-[13px] cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_4px_14px_rgba(99,102,241,0.30)] transition-colors"><Plus size={14} /> Add Lecture</motion.button>
          </motion.div>
        )}
      </main>
      <AddLectureModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={addLecture} />
    </div>
  );
}

export default function SubjectDetailPage() {
  return <RequireAuth><SubjectDetailContent /></RequireAuth>;
}
