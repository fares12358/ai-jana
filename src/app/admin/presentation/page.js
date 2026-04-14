"use client";
/**
 * Presentation Generator — /admin/presentation
 *
 * Uses GET /admin/presentation/{lecture_id} (the correct admin endpoint)
 * to fetch AI-generated slides for a completed lecture.
 *
 * Falls back to building slides from summary + quiz if the admin endpoint
 * returns raw knowledge-card data rather than pre-built slide objects.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FaUpload, FaFileAlt, FaVideo, FaMagic,
  FaTimes, FaChevronLeft, FaChevronRight, FaDownload,
  FaBookOpen, FaFolderOpen, FaSync, FaExclamationTriangle,
} from "react-icons/fa";
import { useAdminData } from "@/hooks/useAdminData";
import { apiAdminPresentation } from "@/utils/api";

/* ── Presentation styles ──────────────────────────────────────────── */
const STYLES = ["Simple", "Visual", "Detailed"];

const SLIDE_COLORS = [
  "from-indigo-500 to-purple-600",
  "from-violet-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-purple-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-red-600",
];

/* ── Safely coerce any value to a display string ──────────────────── */
function str(v) {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    for (const f of ["text", "content", "name", "title", "description", "value", "label"]) {
      if (typeof v[f] === "string" && v[f].trim()) return v[f];
    }
    return JSON.stringify(v);
  }
  return String(v);
}

/* ── Build slides from API response ──────────────────────────────────
   The /admin/presentation/{id} endpoint may return either:
   A) { slides: [{ title, body/content, ... }] }  — pre-built slides
   B) A knowledge card / summary object            — we build slides
──────────────────────────────────────────────────────────────────── */
function buildSlides(lectureTitle, apiData, style) {
  /* Case A: backend already returns slides array */
  if (apiData?.slides && Array.isArray(apiData.slides)) {
    const built = apiData.slides.map((s, i) => ({
      title: str(s.title ?? `Slide ${i + 1}`),
      body:  str(s.body ?? s.content ?? s.text ?? ""),
      color: SLIDE_COLORS[i % SLIDE_COLORS.length],
    }));
    if (built.length) return built;
  }

  /* Case B: build from knowledge card / summary fields */
  const slides = [];

  slides.push({
    title: lectureTitle || "Lecture Overview",
    body:  "AI-generated presentation",
    color: SLIDE_COLORS[0],
  });

  const kc = apiData?.knowledge_card ?? apiData?.knowledgeCard ?? apiData;

  if (kc && typeof kc === "object") {
    const overview = kc.overview ?? kc.description ?? kc.summary_text ?? "";
    if (overview) slides.push({ title: "Overview", body: str(overview), color: SLIDE_COLORS[1] });

    const concepts = kc.key_concepts ?? kc.keyConcepts ?? kc.concepts ?? [];
    if (Array.isArray(concepts) && concepts.length) {
      const limit = style === "Detailed" ? 8 : style === "Visual" ? 5 : 4;
      const body  = concepts.slice(0, limit).map(c => {
        const label  = typeof c === "string" ? c : str(c.concept ?? c.name ?? c.title ?? c);
        const detail = typeof c === "object"  ? str(c.definition ?? c.description ?? "") : "";
        return `• ${label}${detail ? `: ${detail}` : ""}`;
      }).join("\n");
      slides.push({ title: "Key Concepts", body, color: SLIDE_COLORS[2] });
    }

    const topics = kc.main_topics ?? kc.mainTopics ?? kc.key_points ?? kc.keyPoints ?? [];
    if (Array.isArray(topics) && topics.length) {
      slides.push({
        title: "Main Topics",
        body:  topics.map(t => `• ${str(typeof t === "object" ? (t.topic ?? t.name ?? t) : t)}`).join("\n"),
        color: SLIDE_COLORS[3],
      });
    }

    const conclusion = kc.conclusion ?? kc.summary ?? "";
    if (conclusion) slides.push({ title: "Conclusion", body: str(conclusion), color: SLIDE_COLORS[4] });
  } else if (typeof apiData === "string" && apiData.trim()) {
    slides.push({ title: "Summary", body: apiData, color: SLIDE_COLORS[1] });
  }

  if (slides.length <= 1) {
    slides.push({
      title: "Content Not Available",
      body:  "No slide data found for this lecture.\n\nMake sure the lecture has been fully ingested (status: Ready) before generating a presentation.",
      color: SLIDE_COLORS[1],
    });
  }

  return slides;
}

/* ════════════════════════════════════════════════════════════════════
   PRESENTATION GENERATOR PAGE
══════════════════════════════════════════════════════════════════════ */
export default function PresentationPage() {
  const fileRef = useRef(null);

  const { subjects, lectures, loading: dataLoading, error: dataError, fetchAll } = useAdminData();

  /* Only completed lectures can generate presentations */
  const completedLectures = lectures.filter(l => l.status === "completed");

  /* UI state */
  const [selectedSubject,  setSelectedSubject]  = useState("");
  const [selectedLecture,  setSelectedLecture]  = useState("");
  const [file,             setFile]             = useState(null);
  const [dragging,         setDragging]         = useState(false);
  const [style,            setStyle]            = useState("Simple");
  const [slides,           setSlides]           = useState(null);
  const [current,          setCurrent]          = useState(0);
  const [generating,       setGenerating]       = useState(false);
  const [genError,         setGenError]         = useState("");

  /* Lectures filtered by subject selection */
  const subjectLectures = completedLectures.filter(
    l => !selectedSubject || l._subjectId === selectedSubject
  );

  const selectedLec = completedLectures.find(
    l => String(l.id ?? l._id ?? "") === selectedLecture
  );

  useEffect(() => { setSelectedLecture(""); }, [selectedSubject]);

  /* File handlers */
  const handleFile = (f) => f && setFile(f);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  /* Generate — uses GET /admin/presentation/{lecture_id} */
  const generate = useCallback(async () => {
    if (!selectedLecture && !file) return;

    setGenerating(true);
    setGenError("");
    setSlides(null);

    try {
      let apiData      = null;
      let lectureTitle = "Lecture";

      if (selectedLecture) {
        lectureTitle = selectedLec?.title ?? selectedLec?.name ?? "Lecture";
        /* ← Correct admin endpoint per ADMIN_INTEGRATION.md */
        apiData = await apiAdminPresentation(selectedLecture);
      } else if (file) {
        /* File-only mode — no API call available, show placeholder */
        lectureTitle = file.name.replace(/\.[^.]+$/, "");
        apiData = null;
      }

      setSlides(buildSlides(lectureTitle, apiData, style));
      setCurrent(0);
    } catch (err) {
      setGenError(
        err?.response?.data?.detail ??
        err.message ??
        "Generation failed. Please try again."
      );
    } finally {
      setGenerating(false);
    }
  }, [file, selectedLecture, selectedLec, style]);

  const prev        = () => setCurrent(c => Math.max(0, c - 1));
  const next        = () => setCurrent(c => Math.min((slides?.length ?? 1) - 1, c + 1));
  const canGenerate = !!file || !!selectedLecture;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 sm:space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-[22px] sm:text-[26px] font-black tracking-tight text-slate-900 dark:text-white">
          AI Presentation Generator
        </h1>
        <p className="text-[13px] sm:text-[14px] text-slate-500 dark:text-slate-400 mt-0.5">
          Generates slides via{" "}
          <code className="text-[11px] bg-slate-100 dark:bg-white/8 px-1.5 py-0.5 rounded">
            GET /admin/presentation/{"{lecture_id}"}
          </code>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">

        {/* ── LEFT — Controls ──────────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Lecture selector */}
          <div className="bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl p-4 sm:p-6 shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] sm:text-[15px] font-black text-slate-900 dark:text-white">
                Select Lecture
              </h2>
              <button onClick={fetchAll} disabled={dataLoading}
                className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer border-0 bg-transparent">
                <FaSync className={`text-[10px] ${dataLoading ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>

            {dataError && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3 bg-red-50 dark:bg-red-500/12 border border-red-200 dark:border-red-500/25 text-red-600 dark:text-red-400 text-[12px] font-semibold">
                <FaExclamationTriangle className="text-[11px] flex-shrink-0" />
                {dataError}
              </div>
            )}

            {/* Subject filter */}
            <div className="flex flex-col gap-2 mb-3">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <FaFolderOpen className="text-indigo-500" /> Filter by Subject
              </label>
              <select
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value)}
                disabled={dataLoading}
                className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none appearance-none cursor-pointer
                           bg-slate-50 dark:bg-white/6 border border-slate-200 dark:border-white/10
                           text-slate-800 dark:text-slate-200
                           focus:border-indigo-400 dark:focus:border-indigo-500/60
                           focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)] disabled:opacity-60">
                <option value="">All Subjects ({completedLectures.length} ready)</option>
                {subjects.map(s => {
                  const sid = String(s.id ?? s._id ?? "");
                  const cnt = completedLectures.filter(l => l._subjectId === sid).length;
                  return (
                    <option key={sid} value={sid}>
                      {s.name} ({cnt} ready)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Lecture dropdown */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <FaBookOpen className="text-indigo-500" /> Choose Lecture
              </label>
              {!dataLoading && subjectLectures.length === 0 ? (
                <p className="text-[12px] text-slate-400 dark:text-slate-500 py-2 px-3 rounded-xl bg-slate-50 dark:bg-white/4 border border-dashed border-slate-200 dark:border-white/10">
                  No completed lectures{selectedSubject ? " in this subject" : ""} yet.
                  Lectures must be fully ingested before generating slides.
                </p>
              ) : (
                <select
                  value={selectedLecture}
                  onChange={e => setSelectedLecture(e.target.value)}
                  disabled={dataLoading || subjectLectures.length === 0}
                  className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none appearance-none cursor-pointer
                             bg-slate-50 dark:bg-white/6 border border-slate-200 dark:border-white/10
                             text-slate-800 dark:text-slate-200
                             focus:border-indigo-400 dark:focus:border-indigo-500/60
                             focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)] disabled:opacity-60">
                  <option value="">— Choose a lecture —</option>
                  {subjectLectures.map(l => {
                    const lid = String(l.id ?? l._id ?? "");
                    return (
                      <option key={lid} value={lid}>
                        {l.title ?? l.name ?? "Untitled"}
                        {l._subjectName ? ` (${l._subjectName})` : ""}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            {/* Selected pill */}
            {selectedLec && (
              <div className="flex items-center gap-2.5 mt-3 px-3 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30">
                <FaBookOpen className="text-indigo-500 text-[13px] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-indigo-800 dark:text-indigo-300 truncate">
                    {selectedLec.title ?? selectedLec.name}
                  </p>
                  <p className="text-[11px] text-indigo-600/70 dark:text-indigo-400/70">
                    {selectedLec._subjectName} · Ready for AI
                  </p>
                </div>
                <button onClick={() => setSelectedLecture("")}
                  className="border-0 bg-transparent cursor-pointer text-indigo-400 hover:text-red-500 p-0 flex-shrink-0">
                  <FaTimes size={13} />
                </button>
              </div>
            )}
          </div>

          {/* File upload — OR alternative */}
          <div className="bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl p-4 sm:p-6 shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none">
            <h2 className="text-[14px] sm:text-[15px] font-black text-slate-900 dark:text-white mb-1">
              Or Upload a File
            </h2>
            <p className="text-[12px] text-slate-400 mb-4">
              Use a local file when no lecture is selected above
            </p>

            {file ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30">
                <FaFileAlt className="text-indigo-600 dark:text-indigo-400 text-[18px] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200 truncate">{file.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button onClick={() => setFile(null)} disabled={!!selectedLecture}
                  className="p-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-white/10 text-slate-400 hover:text-red-500 transition-colors border-0 bg-transparent cursor-pointer disabled:opacity-40">
                  <FaTimes size={14} />
                </button>
              </div>
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => !selectedLecture && fileRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border-2 border-dashed transition-colors
                  ${selectedLecture
                    ? "opacity-40 cursor-not-allowed border-slate-200 dark:border-white/8"
                    : dragging
                      ? "cursor-pointer border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10"
                      : "cursor-pointer border-slate-300 dark:border-white/15 hover:border-indigo-400 dark:hover:border-indigo-500/40 hover:bg-slate-50 dark:hover:bg-white/3"
                  }`}>
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/8 flex items-center justify-center">
                  <FaUpload className="text-slate-400 dark:text-slate-500 text-[16px]" />
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-bold text-slate-700 dark:text-slate-300">
                    {selectedLecture ? "Remove lecture to upload a file" : "Drag & drop or click to browse"}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">PDF, DOCX, TXT, MP4</p>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-slate-400 dark:text-slate-500">
                  <span className="flex items-center gap-1"><FaVideo className="text-[10px]" /> Video</span>
                  <span className="flex items-center gap-1"><FaFileAlt className="text-[10px]" /> PDF</span>
                  <span className="flex items-center gap-1"><FaFileAlt className="text-[10px]" /> Docs</span>
                </div>
                <input ref={fileRef} type="file" className="hidden"
                  accept=".pdf,.mp4,.webm,.docx,.txt"
                  onChange={e => handleFile(e.target.files[0])} />
              </div>
            )}
          </div>

          {/* Style selector */}
          <div className="bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl p-4 sm:p-6 shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none">
            <h2 className="text-[14px] sm:text-[15px] font-black text-slate-900 dark:text-white mb-4">
              Presentation Style
            </h2>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {STYLES.map(s => (
                <button key={s} onClick={() => setStyle(s)}
                  className={`py-2.5 sm:py-3 rounded-xl text-[12px] sm:text-[13px] font-bold border cursor-pointer transition-all
                    ${style === s
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300"
                      : "border-slate-200 dark:border-white/10 bg-white dark:bg-transparent text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20"
                    }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {genError && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/12 border border-red-200 dark:border-red-500/25 text-red-600 dark:text-red-400 text-[13px] font-semibold">
              <FaExclamationTriangle className="text-[13px] flex-shrink-0 mt-0.5" />
              <span>{genError}</span>
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={generate}
            disabled={!canGenerate || generating}
            className={`w-full py-3 sm:py-3.5 rounded-xl text-[13px] sm:text-[14px] font-bold cursor-pointer border-0
                        flex items-center justify-center gap-2 transition-all
              ${(!canGenerate || generating)
                ? "bg-slate-200 dark:bg-white/8 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_4px_16px_rgba(99,102,241,0.30)]"
              }`}>
            {generating
              ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Generating…</>
              : <><FaMagic className="text-[13px]" /> Generate Presentation</>
            }
          </button>
        </div>

        {/* ── RIGHT — Slide preview ─────────────────────────────── */}
        <div className="bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl p-4 sm:p-6 shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none flex flex-col min-h-[400px] sm:min-h-0">

          {/* Preview header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] sm:text-[15px] font-black text-slate-900 dark:text-white">
              Slide Preview
            </h2>
            {slides && (
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <button onClick={prev} disabled={current === 0}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 disabled:opacity-40 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/8 transition-colors">
                  <FaChevronLeft size={11} />
                </button>
                <span className="text-[11px] sm:text-[12px] font-semibold text-slate-500 dark:text-slate-400 min-w-[40px] text-center">
                  {current + 1} / {slides.length}
                </span>
                <button onClick={next} disabled={current === slides.length - 1}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 disabled:opacity-40 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/8 transition-colors">
                  <FaChevronRight size={11} />
                </button>
                <button
                  title="Export is not yet supported"
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-bold cursor-not-allowed border-0 opacity-40 bg-indigo-600 text-white">
                  <FaDownload size={11} /> Export
                </button>
              </div>
            )}
          </div>

          {/* Slide display */}
          <div className="flex-1 flex items-center justify-center">
            {generating ? (
              <div className="flex flex-col items-center gap-3 text-slate-400 dark:text-slate-500">
                <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                <p className="text-[13px] font-medium">Fetching lecture data and building slides…</p>
              </div>
            ) : slides ? (
              <div
                className={`w-full rounded-2xl bg-gradient-to-br ${slides[current].color} p-6 sm:p-8 flex flex-col justify-center shadow-xl`}
                style={{ aspectRatio: "16/9" }}>
                <div className="text-[10px] sm:text-[11px] font-bold text-white/60 uppercase tracking-widest mb-2 sm:mb-3">
                  Slide {current + 1} of {slides.length}
                </div>
                <h3 className="text-[16px] sm:text-[22px] font-black text-white leading-tight mb-3 sm:mb-4">
                  {slides[current].title}
                </h3>
                <p className="text-[12px] sm:text-[13px] text-white/85 leading-relaxed whitespace-pre-line overflow-auto max-h-[130px] sm:max-h-none">
                  {slides[current].body}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-slate-400 dark:text-slate-500 py-16 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl w-full">
                <FaMagic className="text-[28px] sm:text-[32px]" />
                <p className="text-[12px] sm:text-[13px] text-center px-4">
                  Select a completed lecture, then click <strong>Generate Presentation</strong>
                </p>
                {completedLectures.length === 0 && !dataLoading && (
                  <p className="text-[11px] text-amber-500 dark:text-amber-400 text-center px-4">
                    ⚠ No completed lectures found. Ingest a lecture first.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          {slides && (
            <div className="mt-4 flex gap-2 overflow-x-auto scrollbar-none pb-1">
              {slides.map((s, i) => (
                <button key={i} onClick={() => setCurrent(i)}
                  className={`flex-shrink-0 w-16 sm:w-20 h-11 sm:h-14 rounded-xl overflow-hidden border-2 cursor-pointer transition-all bg-gradient-to-br ${s.color}
                    ${i === current ? "border-indigo-500 scale-105 shadow-lg" : "border-transparent opacity-60 hover:opacity-80"}`}>
                  <div className="w-full h-full flex items-end p-1.5">
                    <span className="text-[7px] sm:text-[8px] font-black text-white/80 leading-tight line-clamp-2">
                      {s.title}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}