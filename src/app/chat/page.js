"use client";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, Sun, Moon, LogOut,
  BookOpen, FileText, HelpCircle, Sparkles, Send,
  AlertCircle, RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, useTheme } from "@/context/AppContext";
import RequireAuth from "@/components/RequireAuth";
import {
  apiGetLecture,
  apiGetSummary,
  apiGenerateQuiz,
  apiChat,
  apiExplain,
} from "@/utils/api";

/* ── timestamp helper ─────────────────────────────────────────────── */
const ts = () => {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
};

/* ── format any API response into a display string ───────────────── */
function formatResponse(data, tab) {
  if (!data) return "No response received.";

  // Chat / Explain
  if (typeof data === "string") return data;
  if (data.response)     return data.response;
  if (data.explanation)  return data.explanation;
  if (data.answer)       return data.answer;

  // Summary — Knowledge Card object
  if (tab === "summary") {
    if (data.summary)       return data.summary;
    if (data.knowledge_card) {
      const kc = data.knowledge_card;
      const parts = [];
      if (kc.title)    parts.push(`📘 ${kc.title}`);
      if (kc.overview) parts.push(`\n${kc.overview}`);
      if (Array.isArray(kc.key_concepts) && kc.key_concepts.length) {
        parts.push("\n\n🔑 Key Concepts:");
        kc.key_concepts.forEach(c => parts.push(`  • ${typeof c === "string" ? c : c.concept ?? JSON.stringify(c)}`));
      }
      if (Array.isArray(kc.main_topics) && kc.main_topics.length) {
        parts.push("\n\n📌 Main Topics:");
        kc.main_topics.forEach(t => parts.push(`  • ${typeof t === "string" ? t : t.topic ?? JSON.stringify(t)}`));
      }
      if (kc.conclusion) parts.push(`\n\n✅ Conclusion:\n${kc.conclusion}`);
      return parts.join("\n") || JSON.stringify(kc, null, 2);
    }
    // Fallback — pretty-print JSON
    return JSON.stringify(data, null, 2);
  }

  // Quiz — array of questions
  if (tab === "mcq" || tab === "essay") {
    const questions = data.questions ?? data.quiz ?? (Array.isArray(data) ? data : null);
    if (Array.isArray(questions) && questions.length) {
      return questions.map((q, i) => {
        const lines = [`Q${i + 1}. ${q.question ?? q.text ?? q}`];
        if (Array.isArray(q.options)) {
          q.options.forEach((opt, oi) => {
            const letter = ["A", "B", "C", "D"][oi] ?? oi + 1;
            lines.push(`   ${letter}) ${opt}`);
          });
        }
        if (q.correct_answer !== undefined) lines.push(`   ✅ Answer: ${q.correct_answer}`);
        if (q.explanation)                  lines.push(`   💡 ${q.explanation}`);
        return lines.join("\n");
      }).join("\n\n");
    }
    return JSON.stringify(data, null, 2);
  }

  // Generic fallback
  if (data.message) return data.message;
  return JSON.stringify(data, null, 2);
}

/* ═══════════════════════════════════════════════════════════════════
   INNER CHAT COMPONENT  (needs useSearchParams → must be in Suspense)
══════════════════════════════════════════════════════════════════════ */
function ChatContent() {
  const router             = useRouter();
  const params             = useSearchParams();
  const { logout }         = useAuth();
  const { dark, toggleTheme } = useTheme();
  const streamRef          = useRef(null);

  /* ── URL params ─────────────────────────────────────────────────── */
  const subjectId  = params.get("subject")  || "";
  const lectureId  = params.get("lecture")  || "";
  const backPath   = subjectId ? `/subjects/${subjectId}` : "/subjects";

  /* ── State ──────────────────────────────────────────────────────── */
  const [lectureTitle, setLectureTitle] = useState(params.get("name") || "");
  const [lectureReady, setLectureReady] = useState(false); // true after lecture loaded
  const [activeTab,    setActiveTab]    = useState("chat");
  const [input,        setInput]        = useState("");
  const [sending,      setSending]      = useState(false);
  const [tabLoading,   setTabLoading]   = useState(false); // for summary/quiz auto-load
  const [tabError,     setTabError]     = useState("");

  /* chat history kept as { role, content } for the API */
  const [history, setHistory] = useState([]);
  /* display messages kept separately */
  const [messages, setMessages] = useState([{
    id:   "m0",
    role: "assistant",
    text: "Hello! I'm your AI assistant for this lecture. Switch tabs to get a summary, quiz, or ask me anything.",
    time: ts(),
  }]);

  /* ── Load lecture details once ──────────────────────────────────── */
  useEffect(() => {
    if (!lectureId) return;
    (async () => {
      try {
        const lec = await apiGetLecture(lectureId);
        setLectureTitle(lec.title ?? lec.name ?? lectureTitle);
      } catch { /* keep URL name if API fails */ }
      finally { setLectureReady(true); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lectureId]);

  /* ── Auto-scroll to bottom ──────────────────────────────────────── */
  useEffect(() => {
    const el = streamRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending, tabLoading]);

  /* ── Add a display message ──────────────────────────────────────── */
  const addMsg = useCallback((role, text) => {
    setMessages(prev => [...prev, { id: `${role}-${Date.now()}`, role, text, time: ts() }]);
  }, []);

  /* ── Tab definitions ────────────────────────────────────────────── */
  const tabs = [
    { id: "chat",    icon: <Sparkles   size={14} />, label: "Chat",           shortLabel: "Chat"    },
    { id: "explain", icon: <BookOpen   size={14} />, label: "Explain",        shortLabel: "Explain" },
    { id: "summary", icon: <FileText   size={14} />, label: "Summary",        shortLabel: "Summary" },
    { id: "mcq",     icon: <HelpCircle size={14} />, label: "MCQ Quiz",       shortLabel: "MCQ"     },
  ];

  const tabLabel = useMemo(() =>
    tabs.find(t => t.id === activeTab)?.label ?? "Chat"
  , [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Suggested prompts per tab ──────────────────────────────────── */
  const suggested = useMemo(() => ({
    chat:    "What are the most important concepts in this lecture?",
    explain: "Explain the core concepts of this lecture in simple terms.",
    summary: "Give me a structured summary of this lecture.",
    mcq:     "Generate 5 multiple choice questions from this lecture.",
  }[activeTab]), [activeTab]);

  /* ── Handle tab switching — auto-fetch for summary & mcq ────────── */
  const handleTabChange = useCallback(async (tabId) => {
    setActiveTab(tabId);
    setTabError("");

    if (!lectureId) return;
    if (tabId !== "summary" && tabId !== "mcq") return;

    setTabLoading(true);
    try {
      let data;
      if (tabId === "summary") {
        data = await apiGetSummary(lectureId);
      } else {
        data = await apiGenerateQuiz(lectureId);
      }
      const text = formatResponse(data, tabId);
      addMsg("assistant", text);
    } catch (err) {
      setTabError(err.message || "Failed to load. Please try again.");
    } finally {
      setTabLoading(false);
    }
  }, [lectureId, addMsg]);

  /* ── Send a message ─────────────────────────────────────────────── */
  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || tabLoading) return;
    setInput("");
    setTabError("");
    addMsg("user", text);
    setSending(true);

    // Build new history entry
    const newHistory = [...history, { role: "user", content: text }];

    try {
      let data;

      if (activeTab === "explain") {
        // POST /ai/explain  — concept + lecture_id
        data = await apiExplain({ concept: text, lecture_id: lectureId });
      } else if (activeTab === "summary") {
        // Summary is auto-loaded; if user types anyway, treat as chat
        data = await apiChat({ message: text, lecture_id: lectureId, history });
      } else if (activeTab === "mcq") {
        // MCQ is auto-loaded; if user types a follow-up, route to chat
        data = await apiChat({ message: text, lecture_id: lectureId, history });
      } else {
        // "chat" tab — full conversational chat with history
        data = await apiChat({ message: text, lecture_id: lectureId, history });
      }

      const reply = formatResponse(data, activeTab);
      addMsg("assistant", reply);

      // Update history with both sides
      setHistory([...newHistory, { role: "assistant", content: reply }]);
    } catch (err) {
      const errMsg = err.message || "Something went wrong. Please try again.";
      addMsg("assistant", `⚠️ ${errMsg}`);
      setTabError(errMsg);
    } finally {
      setSending(false);
    }
  }, [input, sending, tabLoading, activeTab, lectureId, history, addMsg]);

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  /* ── Styles ─────────────────────────────────────────────────────── */
  const iconBtn = [
    "w-8 h-8 sm:w-9 sm:h-9 rounded-xl grid place-items-center cursor-pointer tc flex-shrink-0",
    "bg-white dark:bg-white/8",
    "border border-slate-200 dark:border-white/10",
    "text-slate-500 dark:text-gray-400",
    "hover:text-slate-900 dark:hover:text-white shadow-sm",
  ].join(" ");

  /* ── Guard — no lectureId ───────────────────────────────────────── */
  if (!lectureId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 bg-slate-50 dark:bg-[#070b16] text-slate-500 dark:text-slate-400">
        <AlertCircle size={40} strokeWidth={1.5} />
        <p className="text-[14px] font-semibold">No lecture selected.</p>
        <button onClick={() => router.push("/subjects")}
          className="px-4 py-2 rounded-xl border-0 font-bold text-[13px] cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white">
          Go to Subjects
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen h-dvh overflow-hidden tc bg-slate-50 dark:bg-[#070b16] text-slate-900 dark:text-gray-100">

      {/* ── TOP BAR ─────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 tc bg-white/95 dark:bg-[#070b16]/92 backdrop-blur-xl border-b border-slate-200 dark:border-white/8 shadow-sm dark:shadow-none">

        {/* Title row */}
        <div className="max-w-[1100px] mx-auto px-3 sm:px-5 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3">
          <motion.button whileHover={{ x: -2 }} whileTap={{ scale: 0.90 }}
            onClick={() => router.push(backPath)} title="Back" className={iconBtn}>
            <ArrowLeft size={16} />
          </motion.button>

          <div className="flex-1 min-w-0">
            <div className="font-black text-[13px] sm:text-[15px] leading-tight truncate text-slate-900 dark:text-white tc">
              {lectureTitle || (lectureReady ? "Lecture" : "Loading…")}
            </div>
            <div className="text-[11px] sm:text-[12px] mt-0.5 text-slate-400 dark:text-gray-500 tc">
              {activeTab === "chat"    && "Conversational AI tutor"}
              {activeTab === "explain" && "Concept explanation mode"}
              {activeTab === "summary" && "Lecture knowledge card"}
              {activeTab === "mcq"     && "Auto-generated quiz"}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <motion.button whileTap={{ scale: 0.90 }} onClick={toggleTheme} title="Toggle theme" className={iconBtn}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={dark ? "sun" : "moon"}
                  initial={{ rotate: -35, opacity: 0, scale: 0.75 }}
                  animate={{ rotate: 0,  opacity: 1, scale: 1    }}
                  exit={{   rotate:  35, opacity: 0, scale: 0.75 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-center justify-center">
                  {dark ? <Sun size={15} /> : <Moon size={15} />}
                </motion.span>
              </AnimatePresence>
            </motion.button>
            <motion.button whileTap={{ scale: 0.90 }} onClick={logout} title="Logout"
              className={`${iconBtn} hover:!text-red-500 dark:hover:!text-red-400`}>
              <LogOut size={15} />
            </motion.button>
          </div>
        </div>

        {/* Tabs row */}
        <div className="max-w-[1100px] mx-auto px-3 sm:px-5 pb-2.5 sm:pb-3 flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none">
          {tabs.map(t => (
            <motion.button key={t.id} whileHover={{ y: -1 }} whileTap={{ scale: 0.96 }}
              onClick={() => handleTabChange(t.id)}
              className={[
                "inline-flex items-center gap-1.5 sm:gap-2 flex-shrink-0",
                "px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border",
                "font-bold text-[12px] sm:text-[13px] cursor-pointer tc",
                activeTab === t.id
                  ? "bg-[#6d5efc] border-[#6d5efc] text-white shadow-[0_6px_20px_rgba(109,94,252,0.30)]"
                  : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white",
              ].join(" ")}>
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.shortLabel}</span>
            </motion.button>
          ))}
        </div>
      </header>

      {/* ── MESSAGES ────────────────────────────────────────────────── */}
      <div ref={streamRef} className="flex-1 overflow-y-auto">
        <div className="max-w-[860px] mx-auto px-3 sm:px-5 py-4 sm:py-6 flex flex-col gap-4 sm:gap-5">

          {/* Error banner */}
          <AnimatePresence>
            {tabError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/12 border border-red-200 dark:border-red-500/25 text-red-600 dark:text-red-400 text-[13px] font-semibold">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span className="flex-1">{tabError}</span>
                <button onClick={() => setTabError("")} className="border-0 bg-transparent cursor-pointer text-red-400 hover:text-red-600 p-0">
                  <RefreshCw size={13} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Message bubbles */}
          <AnimatePresence initial={false}>
            {messages.map(m => (
              <motion.div key={m.id}
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0,  scale: 1    }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className={`flex items-end gap-2 sm:gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>

                {m.role === "assistant" && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex-shrink-0 grid place-items-center text-[13px] tc bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 shadow-sm">
                    🧠
                  </div>
                )}

                <div className={[
                  "max-w-[75vw] sm:max-w-[min(660px,78vw)] rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3",
                  "text-[13px] sm:text-[14px] leading-[1.65]",
                  m.role === "user"
                    ? "bg-[#6d5efc] text-white shadow-[0_6px_24px_rgba(109,94,252,0.30)] rounded-br-sm"
                    : "bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/8 text-slate-800 dark:text-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.40)] rounded-bl-sm tc",
                ].join(" ")}>
                  <div className="whitespace-pre-wrap">{m.text}</div>
                  <div className={`mt-1.5 sm:mt-2 text-[10px] sm:text-[11px] ${m.role === "user" ? "text-white/60" : "text-slate-400 dark:text-gray-600 tc"}`}>
                    {m.time}
                  </div>
                </div>

                {m.role === "user" && (
                  <div className="text-[11px] sm:text-[12px] flex-shrink-0 text-slate-400 dark:text-gray-500 tc self-end mb-1">
                    You
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing / loading indicator */}
          <AnimatePresence>
            {(sending || tabLoading) && (
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
                className="flex items-end gap-2 sm:gap-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex-shrink-0 grid place-items-center text-[13px] tc bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 shadow-sm">
                  🧠
                </div>
                <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/8 rounded-2xl rounded-bl-sm px-3 sm:px-4 py-2.5 sm:py-3 shadow-sm dark:shadow-[0_4px_24px_rgba(0,0,0,0.40)] tc">
                  <div className="flex items-center gap-1.5">
                    {[0, 0.22, 0.44].map((delay, i) => (
                      <motion.span key={i}
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.7, repeat: Infinity, delay }}
                        className="w-1.5 h-1.5 rounded-full block bg-slate-400 dark:bg-gray-500 tc"
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── COMPOSER ────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 tc border-t border-slate-200 dark:border-white/8 bg-white dark:bg-[#070b16]">
        <div className="max-w-[860px] mx-auto px-3 sm:px-5 py-3 sm:py-4">

          {/* Suggestion chip */}
          <motion.button
            whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
            onClick={() => setInput(suggested)} type="button"
            className="mb-2 sm:mb-3 inline-flex items-center gap-1.5 text-[11px] sm:text-[12px] font-bold cursor-pointer px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border tc text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/15 border-indigo-200 dark:border-indigo-500/25 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 transition-colors">
            <Sparkles size={11} /> {tabLabel} suggestion
          </motion.button>

          <div className="flex gap-2 sm:gap-2.5 items-end">
            <textarea
              className="flex-1 resize-none rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-[13px] sm:text-[14px] leading-[1.5] outline-none tc bg-slate-50 dark:bg-white/6 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-gray-100 placeholder:text-slate-400 dark:placeholder:text-gray-600 focus:border-indigo-400 dark:focus:border-indigo-500/60 focus:shadow-[0_0_0_4px_rgba(109,94,252,0.10)] focus:bg-white dark:focus:bg-white/8 disabled:opacity-50"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={`${tabLabel} mode — ask anything about this lecture…`}
              rows={2}
              disabled={sending || tabLoading}
            />
            <motion.button
              whileHover={(!sending && !tabLoading) ? { y: -2, boxShadow: "0 8px 24px rgba(109,94,252,0.45)" } : {}}
              whileTap={{ scale: 0.95 }}
              onClick={send}
              disabled={sending || tabLoading || !input.trim()}
              className="h-10 sm:h-12 px-3 sm:px-4 rounded-xl sm:rounded-2xl border-0 font-bold inline-flex items-center gap-1.5 sm:gap-2 cursor-pointer flex-shrink-0 bg-[#6d5efc] hover:bg-[#5d4edc] text-white shadow-[0_4px_16px_rgba(109,94,252,0.30)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <Send size={15} />
              <span className="hidden sm:inline text-[13px]">
                {(sending || tabLoading) ? "Sending…" : "Send"}
              </span>
            </motion.button>
          </div>

          <p className="hidden sm:block mt-2.5 text-[11px] text-slate-400 dark:text-gray-600 tc">
            Press{" "}
            <kbd className="px-1.5 py-0.5 rounded font-mono text-[10px] tc bg-slate-100 dark:bg-white/8 border border-slate-200 dark:border-white/10">Enter</kbd>
            {" "}to send ·{" "}
            <kbd className="px-1.5 py-0.5 rounded font-mono text-[10px] tc bg-slate-100 dark:bg-white/8 border border-slate-200 dark:border-white/10">Shift+Enter</kbd>
            {" "}for new line
          </p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PAGE SHELL  — static, wraps ChatContent in <Suspense>
══════════════════════════════════════════════════════════════════════ */
function ChatPageInner() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-[#070b16]">
        <span className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}

export default function ChatPage() {
  return <RequireAuth><ChatPageInner /></RequireAuth>;
}
