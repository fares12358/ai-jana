"use client";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, Sun, Moon, LogOut,
  BookOpen, FileText, HelpCircle, Sparkles, Send,
  AlertCircle, RefreshCw, CheckCircle, Clock,
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
  apiGetChatHistory,
} from "@/utils/api";

/* ══════════════════════════════════════════════════════════════════════
   RESPONSE PARSERS  (all unchanged)
══════════════════════════════════════════════════════════════════════ */

function deepStr(val) {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) return val.map(deepStr).filter(Boolean).join(", ");
  if (typeof val === "object") {
    const textFields = ["text", "content", "label", "value", "name", "title", "description", "answer", "option"];
    for (const f of textFields) {
      if (typeof val[f] === "string" && val[f].trim()) return val[f];
    }
    for (const v of Object.values(val)) {
      if (typeof v === "string" && v.trim()) return v;
    }
    return JSON.stringify(val);
  }
  return String(val);
}

function parseQuestion(raw, idx) {
  if (!raw || typeof raw !== "object") {
    return { question: deepStr(raw), options: [], correct: null, explanation: null };
  }
  const question =
    raw.question ?? raw.text ?? raw.q ??
    raw.stem ?? raw.prompt ?? raw.content ??
    raw.title ?? `Question ${idx + 1}`;
  let options = [];
  if (Array.isArray(raw.options))                   options = raw.options.map(deepStr);
  else if (Array.isArray(raw.choices))              options = raw.choices.map(deepStr);
  else if (Array.isArray(raw.answers))              options = raw.answers.map(deepStr);
  else if (raw.options && typeof raw.options === "object")
    options = Object.entries(raw.options).map(([k, v]) => `${k}) ${deepStr(v)}`);
  else if (raw.A || raw.B || raw.C || raw.D)
    options = ["A","B","C","D"].filter(k => raw[k] !== undefined).map(k => `${k}) ${deepStr(raw[k])}`);
  const correct     = raw.correct_answer ?? raw.correct ?? raw.answer ?? raw.right_answer ?? raw.solution ?? null;
  const explanation = raw.explanation ?? raw.reason ?? raw.rationale ?? null;
  return {
    question:    deepStr(question),
    options,
    correct:     correct     !== null ? deepStr(correct)     : null,
    explanation: explanation !== null ? deepStr(explanation) : null,
  };
}

function parseQuizData(data) {
  if (!data) return null;
  const arr =
    (Array.isArray(data)           ? data           : null) ??
    (Array.isArray(data.questions) ? data.questions : null) ??
    (Array.isArray(data.quiz)      ? data.quiz      : null) ??
    (Array.isArray(data.items)     ? data.items     : null) ??
    (Array.isArray(data.results)   ? data.results   : null) ??
    null;
  if (!arr || arr.length === 0) return null;
  return arr.map(parseQuestion);
}

function parseSummaryData(data) {
  if (!data) return "No summary available.";
  if (typeof data === "string") return data;
  if (typeof data.summary === "string" && data.summary.trim()) return data.summary;
  const kc = data.knowledge_card ?? data.knowledgeCard ?? data.card ?? data;
  if (typeof kc === "object" && kc !== null) {
    const parts = [];
    if (kc.title) parts.push(`📘 ${deepStr(kc.title)}`);
    if (kc.overview || kc.description) parts.push(`\n${deepStr(kc.overview ?? kc.description)}`);
    const concepts = kc.key_concepts ?? kc.keyConcepts ?? kc.concepts ?? kc.topics ?? [];
    if (Array.isArray(concepts) && concepts.length) {
      parts.push("\n\n🔑 Key Concepts:");
      concepts.forEach(c => {
        const label  = typeof c === "string" ? c : deepStr(c.concept ?? c.name ?? c.title ?? c);
        const detail = typeof c === "object" ? (c.definition ?? c.description ?? c.explanation ?? "") : "";
        parts.push(`  • ${label}${detail ? `: ${detail}` : ""}`);
      });
    }
    const topics = kc.main_topics ?? kc.mainTopics ?? [];
    if (Array.isArray(topics) && topics.length) {
      parts.push("\n\n📌 Main Topics:");
      topics.forEach(t => parts.push(`  • ${deepStr(typeof t === "object" ? (t.topic ?? t.name ?? t) : t)}`));
    }
    const points = kc.key_points ?? kc.keyPoints ?? kc.bullet_points ?? [];
    if (Array.isArray(points) && points.length) {
      parts.push("\n\n📝 Key Points:");
      points.forEach(p => parts.push(`  • ${deepStr(p)}`));
    }
    if (kc.conclusion || kc.summary_text) {
      parts.push(`\n\n✅ Conclusion:\n${deepStr(kc.conclusion ?? kc.summary_text)}`);
    }
    const result = parts.join("\n").trim();
    return result || JSON.stringify(kc, null, 2);
  }
  return JSON.stringify(data, null, 2);
}

function parseChatData(data) {
  if (!data) return "No response received.";
  if (typeof data === "string") return data;
  return deepStr(
    data.response ?? data.explanation ?? data.answer ??
    data.message  ?? data.text        ?? data.content ?? data
  );
}

/* ══════════════════════════════════════════════════════════════════════
   CHAT HISTORY PARSER
══════════════════════════════════════════════════════════════════════ */
function parseHistoryResponse(raw) {
  if (!raw) return [];
  const arr =
    (Array.isArray(raw)              ? raw              : null) ??
    (Array.isArray(raw.history)      ? raw.history      : null) ??
    (Array.isArray(raw.messages)     ? raw.messages     : null) ??
    (Array.isArray(raw.chat_history) ? raw.chat_history : null) ??
    null;
  if (!arr || arr.length === 0) return [];
  return arr
    .filter(item => item && (item.role === "user" || item.role === "assistant"))
    .map(item => ({
      role:      item.role,
      content:   deepStr(item.content ?? item.message ?? item.text ?? ""),
      timestamp: item.timestamp ?? item.created_at ?? item.time ?? null,
    }))
    .filter(item => item.content.trim() !== "");
}

/* ── timestamp helpers ────────────────────────────────────────────── */
const makeTsNow = () => {
  const n = new Date();
  return `${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`;
};

function fmtTime(rawTs) {
  if (!rawTs) return "";
  try {
    const d = new Date(rawTs);
    if (isNaN(d.getTime())) return "";
    return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  } catch { return ""; }
}

function fmtDateLabel(rawTs) {
  if (!rawTs) return "Previous conversation";
  try {
    const d     = new Date(rawTs);
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day   = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff  = Math.round((today - day) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return d.toLocaleDateString("en-US", { weekday:"short", day:"numeric", month:"short" });
  } catch { return "Previous conversation"; }
}

/* ══════════════════════════════════════════════════════════════════════
   QUIZ MESSAGE RENDERER
   ── Defined at module level so React never sees a new component type
══════════════════════════════════════════════════════════════════════ */
function QuizMessage({ questions }) {
  const [revealed, setRevealed] = useState({});
  const [selected, setSelected] = useState({});
  const toggle  = (idx) => setRevealed(p => ({ ...p, [idx]: !p[idx] }));
  const LETTERS = ["A","B","C","D","E","F"];

  return (
    <div className="flex flex-col gap-5 w-full">
      {questions.map((q, qi) => {
        const isRevealed  = !!revealed[qi];
        const selectedIdx = selected[qi] ?? null;
        return (
          <div key={qi} className="flex flex-col gap-3">
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 text-[11px] font-black flex items-center justify-center">
                {qi + 1}
              </span>
              <p className="text-[13px] sm:text-[14px] font-semibold text-slate-900 dark:text-gray-100 leading-snug">
                {q.question}
              </p>
            </div>

            {q.options.length > 0 && (
              <div className="flex flex-col gap-1.5 ml-8">
                {q.options.map((opt, oi) => {
                  const letter = LETTERS[oi] ?? String(oi + 1);
                  let optCls   = "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300";
                  if (isRevealed && q.correct) {
                    const cl = q.correct.toLowerCase();
                    const isCorrect =
                      cl === letter.toLowerCase() ||
                      opt.toLowerCase().includes(cl) ||
                      cl.includes(opt.toLowerCase().slice(0, 8));
                    optCls = isCorrect
                      ? "bg-emerald-50 dark:bg-emerald-500/15 border-emerald-400 dark:border-emerald-500/50 text-emerald-800 dark:text-emerald-300"
                      : selectedIdx === oi
                        ? "bg-red-50 dark:bg-red-500/12 border-red-400 dark:border-red-500/50 text-red-700 dark:text-red-300"
                        : optCls;
                  } else if (selectedIdx === oi) {
                    optCls = "bg-indigo-50 dark:bg-indigo-500/15 border-indigo-400 dark:border-indigo-500/50 text-indigo-800 dark:text-indigo-200";
                  }
                  return (
                    <button key={oi}
                      onClick={() => !isRevealed && setSelected(p => ({ ...p, [qi]: oi }))}
                      className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl border text-[12px] sm:text-[13px] font-medium transition-all cursor-pointer ${optCls} ${isRevealed ? "cursor-default" : "hover:border-indigo-300 dark:hover:border-indigo-500/40"}`}>
                      <span className="flex-shrink-0 w-5 h-5 rounded-md border border-current flex items-center justify-center text-[10px] font-black opacity-70">
                        {letter}
                      </span>
                      <span className="leading-snug">{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="ml-8 flex flex-col gap-1.5">
              <button onClick={() => toggle(qi)}
                className="self-start inline-flex items-center gap-1.5 text-[11px] sm:text-[12px] font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer border-0 bg-transparent p-0 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors">
                <CheckCircle size={12} />
                {isRevealed ? "Hide Answer" : "Show Answer"}
              </button>
              <AnimatePresence>
                {isRevealed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-col gap-1 overflow-hidden">
                    {q.correct     && <p className="text-[12px] font-bold text-emerald-700 dark:text-emerald-400">✅ Correct: {q.correct}</p>}
                    {q.explanation && <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">💡 {q.explanation}</p>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {qi < questions.length - 1 && <div className="border-t border-slate-100 dark:border-white/6 mt-1" />}
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MESSAGE BUBBLE
   ── Defined at module level — stable identity across renders.
      Receives isFaded, isUser, isQuiz, payload, time as plain props.
══════════════════════════════════════════════════════════════════════ */
function MsgBubble({ m }) {
  const isUser  = m.role === "user";
  const isQuiz  = m.type === "quiz" && Array.isArray(m.payload);
  const isFaded = !!m._fromHistory;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0,   scale: 1    }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={`flex items-end gap-2 sm:gap-3 ${isUser ? "justify-end" : "justify-start"}`}>

      {/* Brain avatar — assistant only */}
      {!isUser && (
        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex-shrink-0 grid place-items-center text-[13px] border shadow-sm self-start mt-0.5
          ${isFaded
            ? "bg-slate-100 dark:bg-white/6 border-slate-200 dark:border-white/8 opacity-70"
            : "bg-indigo-100 dark:bg-indigo-500/20 border-indigo-200 dark:border-indigo-500/30"}`}>
          🧠
        </div>
      )}

      {/* Bubble */}
      <div className={[
        isUser
          ? "max-w-[75vw] sm:max-w-[min(560px,72vw)]"
          : isQuiz
            ? "w-full max-w-[min(760px,92vw)]"
            : "max-w-[75vw] sm:max-w-[min(660px,78vw)]",
        "rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3",
        "text-[13px] sm:text-[14px] leading-[1.65]",
        isUser
          ? isFaded
            ? "bg-[#6d5efc]/70 text-white/90 shadow-[0_4px_16px_rgba(109,94,252,0.20)] rounded-br-sm"
            : "bg-[#6d5efc] text-white shadow-[0_6px_24px_rgba(109,94,252,0.30)] rounded-br-sm"
          : isFaded
            ? "bg-slate-50 dark:bg-white/4 border border-slate-200 dark:border-white/6 text-slate-600 dark:text-gray-400 shadow-none rounded-bl-sm"
            : "bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/8 text-slate-800 dark:text-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.40)] rounded-bl-sm",
      ].join(" ")}>

        {isQuiz
          ? <QuizMessage questions={m.payload} />
          : <div className="whitespace-pre-wrap">{m.payload}</div>
        }

        {m.time && (
          <div className={`mt-1.5 sm:mt-2 text-[10px] sm:text-[11px] flex items-center gap-1
            ${isUser ? "text-white/50 justify-end" : "text-slate-400 dark:text-gray-600"}`}>
            {isFaded && <Clock size={9} className="flex-shrink-0" />}
            {m.time}
          </div>
        )}
      </div>

      {/* "You" label */}
      {isUser && (
        <div className="text-[11px] sm:text-[12px] flex-shrink-0 text-slate-400 dark:text-gray-500 self-end mb-1">
          You
        </div>
      )}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   DATE SEPARATOR  — WhatsApp-style pill
══════════════════════════════════════════════════════════════════════ */
function DateSeparator({ label }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px bg-slate-200 dark:bg-white/8" />
      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-[#070b16] px-2.5 py-1 rounded-full border border-slate-200 dark:border-white/8 flex-shrink-0 select-none">
        <Clock size={10} />
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-200 dark:bg-white/8" />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   HISTORY SKELETON
══════════════════════════════════════════════════════════════════════ */
function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-3 py-2">
      {[
        { user: false, w: "w-[55%]" },
        { user: true,  w: "w-[42%]" },
        { user: false, w: "w-[62%]" },
        { user: true,  w: "w-[35%]" },
      ].map((s, i) => (
        <div key={i} className={`flex items-end gap-2 ${s.user ? "justify-end" : "justify-start"}`}>
          {!s.user && <div className="w-7 h-7 rounded-xl flex-shrink-0 bg-slate-200 dark:bg-white/8 animate-pulse" />}
          <div className={`${s.w} h-10 rounded-2xl bg-slate-200 dark:bg-white/8 animate-pulse`} />
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   INNER CHAT COMPONENT
══════════════════════════════════════════════════════════════════════ */
function ChatContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { logout } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const streamRef = useRef(null);

  const subjectId = params.get("subject") || "";
  const lectureId = params.get("lecture") || "";
  const backPath  = subjectId ? `/subjects/${subjectId}` : "/subjects";

  /* ── Core state ─────────────────────────────────────────────────── */
  const [lectureTitle, setLectureTitle] = useState(params.get("name") || "");
  const [lectureReady, setLectureReady] = useState(false);
  const [activeTab,    setActiveTab]    = useState("chat");
  const [input,        setInput]        = useState("");
  const [sending,      setSending]      = useState(false);
  const [tabLoading,   setTabLoading]   = useState(false);
  const [tabError,     setTabError]     = useState("");

  /* ── FIX 2: Cache summary & MCQ so we never hit the API twice ──── */
  const tabCache = useRef({ summary: null, mcq: null });

  /* ── History state ──────────────────────────────────────────────── */
  const [historyLoading,  setHistoryLoading]  = useState(false);
  const [historyLoaded,   setHistoryLoaded]   = useState(false);
  const [historyMessages, setHistoryMessages] = useState([]);
  const [historyDateLabel,setHistoryDateLabel]= useState("Previous conversation");
  const [history,         setHistory]         = useState([]);   // context pairs for /ai/chat

  /* ── Session messages (new this visit) ─────────────────────────── */
  const [messages, setMessages] = useState([]);

  /* ── Load lecture title + chat history on mount ─────────────────── */
  useEffect(() => {
    if (!lectureId) return;
    /* Reset cache when lecture changes */
    tabCache.current = { summary: null, mcq: null };

    /* 1. Lecture title */
    (async () => {
      try {
        const lec = await apiGetLecture(lectureId);
        setLectureTitle(lec.title ?? lec.name ?? "");
      } catch { /* keep URL param fallback */ }
      finally { setLectureReady(true); }
    })();

    /* 2. Chat history */
    (async () => {
      setHistoryLoading(true);
      try {
        const raw    = await apiGetChatHistory(lectureId);
        const parsed = parseHistoryResponse(raw);

        if (parsed.length === 0) {
          setMessages([{ id:"welcome", role:"assistant", type:"text",
            payload:"Hello! I'm your AI assistant. Switch tabs to get a summary, quiz, or just ask me anything about this lecture.",
            time: makeTsNow() }]);
          return;
        }

        setHistoryDateLabel(fmtDateLabel(parsed[0].timestamp));
        setHistoryMessages(parsed.map((item, i) => ({
          id:           `hist-${i}-${item.role}`,
          role:         item.role,
          type:         "text",
          payload:      item.content,
          time:         fmtTime(item.timestamp) || "",
          _fromHistory: true,
        })));
        /* Seed AI context — last 20 turns */
        setHistory(parsed.slice(-20).map(item => ({ role: item.role, content: item.content })));
        setMessages([]);   /* no welcome when history exists */

      } catch {
        setMessages([{ id:"welcome", role:"assistant", type:"text",
          payload:"Hello! I'm your AI assistant. Switch tabs to get a summary, quiz, or just ask me anything about this lecture.",
          time: makeTsNow() }]);
      } finally {
        setHistoryLoaded(true);
        setHistoryLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lectureId]);

  /* ── Auto-scroll ────────────────────────────────────────────────── */
  useEffect(() => {
    const el = streamRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, historyMessages, historyLoaded, sending, tabLoading]);

  /* ── Add a new session message ──────────────────────────────────── */
  const addMsg = useCallback((role, type, payload) => {
    setMessages(prev => [
      ...prev,
      { id: `${role}-${Date.now()}`, role, type, payload, time: makeTsNow() },
    ]);
  }, []);

  /* ── Tabs ────────────────────────────────────────────────────────── */
  const tabs = [
    { id:"chat",    icon:<Sparkles size={14}/>,  label:"Chat",     shortLabel:"Chat"    },
    { id:"explain", icon:<BookOpen size={14}/>,   label:"Explain",  shortLabel:"Explain" },
    { id:"summary", icon:<FileText size={14}/>,   label:"Summary",  shortLabel:"Summary" },
    { id:"mcq",     icon:<HelpCircle size={14}/>, label:"MCQ Quiz", shortLabel:"MCQ"     },
  ];

  const tabLabel = useMemo(
    () => tabs.find(t => t.id === activeTab)?.label ?? "Chat",
    [activeTab], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const suggested = useMemo(() => ({
    chat:    "What are the most important concepts in this lecture?",
    explain: "Explain the core concepts of this lecture in simple terms.",
    summary: "Summarise this lecture for me.",
    mcq:     "Generate a multiple choice quiz from this lecture.",
  }[activeTab]), [activeTab]);

  /* ── Tab switch — FIX 2: use cache for summary & mcq ────────────── */
  const handleTabChange = useCallback(async (tabId) => {
    setActiveTab(tabId);
    setTabError("");
    if (!lectureId) return;
    if (tabId !== "summary" && tabId !== "mcq") return;

    /* ✅ CACHE HIT — show already-fetched result, zero API calls */
    if (tabCache.current[tabId] !== null) {
      addMsg(
        "assistant",
        tabId === "mcq" ? "quiz" : "summary",
        tabCache.current[tabId],
      );
      return;
    }

    /* CACHE MISS — fetch once, store result */
    setTabLoading(true);
    try {
      if (tabId === "summary") {
        const data    = await apiGetSummary(lectureId);
        const text    = parseSummaryData(data);
        tabCache.current.summary = text;          /* store */
        addMsg("assistant", "summary", text);
      } else {
        const data      = await apiGenerateQuiz(lectureId);
        const questions = parseQuizData(data);
        const payload   = questions ?? parseChatData(data);
        tabCache.current.mcq = payload;           /* store */
        addMsg("assistant", questions ? "quiz" : "text", payload);
      }
    } catch (err) {
      setTabError(err.message || "Failed to load. Please try again.");
    } finally {
      setTabLoading(false);
    }
  }, [lectureId, addMsg]);

  /* ── Send message ────────────────────────────────────────────────── */
  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || tabLoading) return;
    setInput("");
    setTabError("");
    addMsg("user", "text", text);
    setSending(true);

    const userHistory = [...history, { role:"user", content:text }];

    try {
      let data;
      if (activeTab === "explain") {
        data = await apiExplain({ concept: text, lecture_id: lectureId });
      } else {
        data = await apiChat({ message: text, lecture_id: lectureId, history });
      }
      const reply = parseChatData(data);
      addMsg("assistant", "text", reply);
      setHistory([...userHistory, { role:"assistant", content:reply }]);
    } catch (err) {
      const msg = err.message || "Something went wrong. Please try again.";
      addMsg("assistant", "text", `⚠️ ${msg}`);
      setTabError(msg);
    } finally {
      setSending(false);
    }
  }, [input, sending, tabLoading, activeTab, lectureId, history, addMsg]);

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const iconBtn = [
    "w-8 h-8 sm:w-9 sm:h-9 rounded-xl grid place-items-center cursor-pointer flex-shrink-0",
    "bg-white dark:bg-white/8 border border-slate-200 dark:border-white/10",
    "text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white shadow-sm",
  ].join(" ");

  /* ── Guard ──────────────────────────────────────────────────────── */
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

  const hasHistory = historyMessages.length > 0;

  return (
    <div className="flex flex-col h-screen h-dvh overflow-hidden bg-slate-50 dark:bg-[#070b16] text-slate-900 dark:text-gray-100">

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 bg-white/95 dark:bg-[#070b16]/92 backdrop-blur-xl border-b border-slate-200 dark:border-white/8 shadow-sm dark:shadow-none">
        <div className="max-w-[1100px] mx-auto px-3 sm:px-5 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3">
          <motion.button whileHover={{ x:-2 }} whileTap={{ scale:0.90 }}
            onClick={() => router.push(backPath)} title="Back" className={iconBtn}>
            <ArrowLeft size={16} />
          </motion.button>

          <div className="flex-1 min-w-0">
            <div className="font-black text-[13px] sm:text-[15px] leading-tight truncate text-slate-900 dark:text-white">
              {lectureTitle || (lectureReady ? "Lecture" : "Loading…")}
            </div>
            <div className="text-[11px] sm:text-[12px] mt-0.5 text-slate-400 dark:text-gray-500">
              {activeTab === "chat"    && "Conversational AI tutor"}
              {activeTab === "explain" && "Concept explanation mode"}
              {activeTab === "summary" && "Lecture knowledge card"}
              {activeTab === "mcq"     && "Auto-generated quiz"}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <motion.button whileTap={{ scale:0.90 }} onClick={toggleTheme} title="Toggle theme" className={iconBtn}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={dark ? "sun":"moon"}
                  initial={{ rotate:-35, opacity:0, scale:0.75 }}
                  animate={{ rotate:0,   opacity:1, scale:1    }}
                  exit={{    rotate:35,  opacity:0, scale:0.75 }}
                  transition={{ duration:0.18 }}
                  className="flex items-center justify-center">
                  {dark ? <Sun size={15}/> : <Moon size={15}/>}
                </motion.span>
              </AnimatePresence>
            </motion.button>
            <motion.button whileTap={{ scale:0.90 }} onClick={logout} title="Logout"
              className={`${iconBtn} hover:!text-red-500 dark:hover:!text-red-400`}>
              <LogOut size={15}/>
            </motion.button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-[1100px] mx-auto px-3 sm:px-5 pb-2.5 sm:pb-3 flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none">
          {tabs.map(t => (
            <motion.button key={t.id} whileHover={{ y:-1 }} whileTap={{ scale:0.96 }}
              onClick={() => handleTabChange(t.id)}
              className={[
                "inline-flex items-center gap-1.5 sm:gap-2 flex-shrink-0",
                "px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border",
                "font-bold text-[12px] sm:text-[13px] cursor-pointer",
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

      {/* ── MESSAGES ───────────────────────────────────────────────── */}
      <div ref={streamRef} className="flex-1 overflow-y-auto">
        <div className="max-w-[860px] mx-auto px-3 sm:px-5 py-4 sm:py-6 flex flex-col gap-3 sm:gap-4">

          {/* Error banner */}
          <AnimatePresence>
            {tabError && (
              <motion.div
                initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/12 border border-red-200 dark:border-red-500/25 text-red-600 dark:text-red-400 text-[13px] font-semibold">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span className="flex-1">{tabError}</span>
                <button onClick={() => setTabError("")}
                  className="border-0 bg-transparent cursor-pointer text-red-400 hover:text-red-600 p-0">
                  <RefreshCw size={13}/>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* History skeleton */}
          {historyLoading && <HistorySkeleton />}

          {/* ── FIX 1: history rendered WITHOUT AnimatePresence so it
              never re-mounts when `input` state changes ──────────── */}
          {!historyLoading && historyMessages.map(m => (
            <MsgBubble key={m.id} m={m} />
          ))}

          {/* Date separator */}
          {!historyLoading && hasHistory && historyLoaded && (
            <motion.div
              initial={{ opacity:0, y:8 }}
              animate={{ opacity:1, y:0 }}
              transition={{ duration:0.3, delay:0.1 }}>
              <DateSeparator label={historyDateLabel} />
            </motion.div>
          )}

          {/* Session messages */}
          <AnimatePresence initial={false}>
            {messages.map(m => (
              <MsgBubble key={m.id} m={m} />
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          <AnimatePresence>
            {(sending || tabLoading) && (
              <motion.div
                initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:12 }}
                className="flex items-end gap-2 sm:gap-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex-shrink-0 grid place-items-center text-[13px] bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 shadow-sm">
                  🧠
                </div>
                <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/8 rounded-2xl rounded-bl-sm px-3 sm:px-4 py-2.5 sm:py-3 shadow-sm dark:shadow-[0_4px_24px_rgba(0,0,0,0.40)]">
                  <div className="flex items-center gap-1.5">
                    {[0,0.22,0.44].map((delay, i) => (
                      <motion.span key={i}
                        animate={{ y:[0,-5,0] }}
                        transition={{ duration:0.7, repeat:Infinity, delay }}
                        className="w-1.5 h-1.5 rounded-full block bg-slate-400 dark:bg-gray-500"
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── COMPOSER ───────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-slate-200 dark:border-white/8 bg-white dark:bg-[#070b16]">
        <div className="max-w-[860px] mx-auto px-3 sm:px-5 py-3 sm:py-4">

          {/* Suggestion chip */}
          <motion.button
            whileHover={{ y:-1 }} whileTap={{ scale:0.97 }}
            onClick={() => setInput(suggested)} type="button"
            className="mb-2 sm:mb-3 inline-flex items-center gap-1.5 text-[11px] sm:text-[12px] font-bold cursor-pointer px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/15 border-indigo-200 dark:border-indigo-500/25 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 transition-colors">
            <Sparkles size={11}/> {tabLabel} suggestion
          </motion.button>

          <div className="flex gap-2 sm:gap-2.5 items-end">
            <textarea
              className="flex-1 resize-none rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-[13px] sm:text-[14px] leading-[1.5] outline-none bg-slate-50 dark:bg-white/6 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-gray-100 placeholder:text-slate-400 dark:placeholder:text-gray-600 focus:border-indigo-400 dark:focus:border-indigo-500/60 focus:shadow-[0_0_0_4px_rgba(109,94,252,0.10)] focus:bg-white dark:focus:bg-white/8 disabled:opacity-50"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={`${tabLabel} mode — ask anything about this lecture…`}
              rows={2}
              disabled={sending || tabLoading}
            />
            <motion.button
              whileHover={(!sending && !tabLoading) ? { y:-2, boxShadow:"0 8px 24px rgba(109,94,252,0.45)" } : {}}
              whileTap={{ scale:0.95 }}
              onClick={send}
              disabled={sending || tabLoading || !input.trim()}
              className="h-10 sm:h-12 px-3 sm:px-4 rounded-xl sm:rounded-2xl border-0 font-bold inline-flex items-center gap-1.5 sm:gap-2 cursor-pointer flex-shrink-0 bg-[#6d5efc] hover:bg-[#5d4edc] text-white shadow-[0_4px_16px_rgba(109,94,252,0.30)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <Send size={15}/>
              <span className="hidden sm:inline text-[13px]">
                {(sending || tabLoading) ? "Sending…" : "Send"}
              </span>
            </motion.button>
          </div>

          <p className="hidden sm:block mt-2.5 text-[11px] text-slate-400 dark:text-gray-600">
            Press{" "}
            <kbd className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-slate-100 dark:bg-white/8 border border-slate-200 dark:border-white/10">Enter</kbd>
            {" "}to send ·{" "}
            <kbd className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-slate-100 dark:bg-white/8 border border-slate-200 dark:border-white/10">Shift+Enter</kbd>
            {" "}for new line
          </p>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   PAGE SHELL
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
