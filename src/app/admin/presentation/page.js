"use client";
import { useRef, useState } from "react";
import {
  FaUpload, FaFileAlt, FaVideo, FaMagic, FaBolt,
  FaTimes, FaChevronLeft, FaChevronRight, FaDownload,
} from "react-icons/fa";

/* ── mock slide data ─────────────────────────────────────────────── */
const MOCK_SLIDES = [
  { title:"Introduction to Machine Learning",  body:"Machine learning is a subset of AI that enables systems to learn and improve from experience without being explicitly programmed.", color:"from-indigo-500 to-purple-600" },
  { title:"Types of Machine Learning",         body:"• Supervised Learning\n• Unsupervised Learning\n• Reinforcement Learning\n• Semi-supervised Learning",                           color:"from-violet-500 to-indigo-600" },
  { title:"Supervised Learning",               body:"Training data includes input-output pairs. The model learns to map inputs to outputs.\n\nExamples: Classification, Regression",    color:"from-emerald-500 to-teal-600"  },
  { title:"Key Algorithms",                    body:"• Linear Regression\n• Decision Trees\n• Random Forest\n• Neural Networks\n• Support Vector Machines",                          color:"from-purple-500 to-pink-600"   },
  { title:"Model Evaluation",                  body:"Accuracy, Precision, Recall, F1-Score\n\nCross-validation prevents overfitting and gives a reliable performance estimate.",        color:"from-amber-500 to-orange-600"  },
  { title:"Applications",                      body:"• Image Recognition\n• Natural Language Processing\n• Recommendation Systems\n• Fraud Detection",                               color:"from-rose-500 to-red-600"      },
];

const STYLES = ["Simple","Visual","Detailed"];

export default function PresentationPage() {
  const fileRef = useRef(null);
  const [file,     setFile]     = useState(null);
  const [dragging, setDragging] = useState(false);
  const [style,    setStyle]    = useState("Simple");
  const [slides,   setSlides]   = useState(null);
  const [current,  setCurrent]  = useState(0);
  const [loading,  setLoading]  = useState(false);

  const handleFile = (f) => f && setFile(f);
  const handleDrop = (e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); };

  const generate = async (smart = false) => {
    if (!file && !smart) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1400));
    setSlides(MOCK_SLIDES); setCurrent(0); setLoading(false);
  };

  const prev = () => setCurrent(c => Math.max(0, c - 1));
  const next = () => setCurrent(c => Math.min((slides?.length ?? 1) - 1, c + 1));

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 sm:space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-[22px] sm:text-[26px] font-black tracking-tight text-slate-900 dark:text-white">
          AI Presentation Generator
        </h1>
        <p className="text-[13px] sm:text-[14px] text-slate-500 dark:text-slate-400 mt-0.5">
          Create structured presentations from your content automatically
        </p>
      </div>

      {/* 2-col on lg+, stacked below */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">

        {/* LEFT — Upload + settings */}
        <div className="flex flex-col gap-4">

          {/* Upload */}
          <div className="bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl p-4 sm:p-6 shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none">
            <h2 className="text-[14px] sm:text-[15px] font-black text-slate-900 dark:text-white mb-4">Upload Content</h2>
            {file ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30">
                <FaFileAlt className="text-indigo-600 dark:text-indigo-400 text-[18px] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200 truncate">{file.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button onClick={() => setFile(null)}
                  className="p-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-white/10 text-slate-400 hover:text-red-500 transition-colors border-0 bg-transparent cursor-pointer">
                  <FaTimes size={14} />
                </button>
              </div>
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-3 py-10 sm:py-12 rounded-2xl cursor-pointer border-2 border-dashed transition-colors
                  ${dragging
                    ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10"
                    : "border-slate-300 dark:border-white/15 hover:border-indigo-400 dark:hover:border-indigo-500/40 hover:bg-slate-50 dark:hover:bg-white/3"
                  }`}
              >
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/8 flex items-center justify-center">
                  <FaUpload className="text-slate-400 dark:text-slate-500 text-[18px]" />
                </div>
                <div className="text-center">
                  <p className="text-[14px] font-bold text-slate-700 dark:text-slate-300">Drag &amp; drop files here</p>
                  <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-0.5">or click to browse</p>
                </div>
                <div className="flex items-center gap-4 text-[12px] text-slate-400 dark:text-slate-500">
                  <span className="flex items-center gap-1.5"><FaVideo className="text-[11px]" /> Video</span>
                  <span className="flex items-center gap-1.5"><FaFileAlt className="text-[11px]" /> PDF</span>
                  <span className="flex items-center gap-1.5"><FaFileAlt className="text-[11px]" /> Docs</span>
                </div>
                <input ref={fileRef} type="file" className="hidden"
                  accept=".pdf,.mp4,.webm,.docx,.txt,.pptx"
                  onChange={e => handleFile(e.target.files[0])} />
              </div>
            )}
          </div>

          {/* Style */}
          <div className="bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl p-4 sm:p-6 shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none">
            <h2 className="text-[14px] sm:text-[15px] font-black text-slate-900 dark:text-white mb-4">Presentation Style</h2>
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

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => generate(false)}
              disabled={!file || loading}
              className={`w-full py-3 sm:py-3.5 rounded-xl text-[13px] sm:text-[14px] font-bold cursor-pointer border-0 flex items-center justify-center gap-2 transition-all
                ${(!file || loading)
                  ? "bg-slate-200 dark:bg-white/8 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_4px_16px_rgba(99,102,241,0.30)]"
                }`}>
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Generating…</>
                : <><FaMagic className="text-[13px]" /> Generate Presentation</>
              }
            </button>

            <button
              onClick={() => generate(true)}
              disabled={loading}
              className="w-full py-3 sm:py-3.5 rounded-xl text-[13px] sm:text-[14px] font-bold cursor-pointer border-0 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_4px_16px_rgba(99,102,241,0.30)] transition-all disabled:opacity-60 disabled:cursor-not-allowed">
              <FaBolt className="text-[13px]" /> Generate from Weak Topics (Smart Mode)
            </button>
          </div>
        </div>

        {/* RIGHT — Slide preview */}
        <div className="bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl p-4 sm:p-6 shadow-[0_2px_12px_rgba(15,23,42,0.05)] dark:shadow-none flex flex-col min-h-[400px] sm:min-h-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] sm:text-[15px] font-black text-slate-900 dark:text-white">Slide Preview</h2>
            {slides && (
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <button onClick={prev} disabled={current === 0}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 disabled:opacity-40 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/8 transition-colors">
                  <FaChevronLeft size={11} />
                </button>
                <span className="text-[11px] sm:text-[12px] font-semibold text-slate-500 dark:text-slate-400 min-w-[40px] sm:min-w-[50px] text-center">
                  {current + 1} / {slides.length}
                </span>
                <button onClick={next} disabled={current === slides.length - 1}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 disabled:opacity-40 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/8 transition-colors">
                  <FaChevronRight size={11} />
                </button>
                <button className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-bold cursor-pointer border-0 bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
                  <FaDownload size={11} /> Export
                </button>
              </div>
            )}
          </div>

          {/* Slide display */}
          <div className="flex-1 flex items-center justify-center">
            {loading ? (
              <div className="flex flex-col items-center gap-3 text-slate-400 dark:text-slate-500">
                <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                <p className="text-[13px] font-medium">Generating slides…</p>
              </div>
            ) : slides ? (
              <div className={`w-full rounded-2xl bg-gradient-to-br ${slides[current].color} p-6 sm:p-8 flex flex-col justify-center shadow-xl`} style={{ aspectRatio: "16/9" }}>
                <div className="text-[10px] sm:text-[11px] font-bold text-white/60 uppercase tracking-widest mb-2 sm:mb-3">
                  Slide {current + 1}
                </div>
                <h3 className="text-[16px] sm:text-[22px] font-black text-white leading-tight mb-3 sm:mb-4">
                  {slides[current].title}
                </h3>
                <p className="text-[12px] sm:text-[14px] text-white/85 leading-relaxed whitespace-pre-line">
                  {slides[current].body}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-slate-400 dark:text-slate-500 py-16 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl w-full">
                <FaMagic className="text-[28px] sm:text-[32px]" />
                <p className="text-[12px] sm:text-[13px] text-center px-4">
                  Upload content and click generate<br />to see slides
                </p>
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
                    <span className="text-[7px] sm:text-[8px] font-black text-white/80 leading-tight line-clamp-2">{s.title}</span>
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
