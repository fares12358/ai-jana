"use client";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Moon, Sun, Brain, BookOpen, FileText,
  HelpCircle, LogOut, LayoutDashboard,
} from "lucide-react";
import { useAuth, useTheme } from "@/context/AppContext";

const fadeUp = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.11, delayChildren: 0.05 } } };

export default function HomePage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { dark, toggleTheme } = useTheme();

  /* ── Role-aware destinations ──────────────────────────────────── */
  const isAdmin      = user?.isAdmin ?? false;
  const dashboardPath = isAdmin ? "/admin" : "/subjects";
  const dashboardLabel = isAdmin ? "Dashboard" : "My Subjects";

  const features = useMemo(() => [
    {
      icon: <BookOpen size={20} />, title: "Explain",
      desc: "Get detailed explanations of complex concepts from your lectures. Ask questions and receive instant, clear answers.",
      cls: "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30",
    },
    {
      icon: <FileText size={20} />, title: "Summary",
      desc: "Generate concise summaries of your lectures. Save time and quickly review key points before exams.",
      cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30",
    },
    {
      icon: <HelpCircle size={20} />, title: "Quiz",
      desc: "Test your knowledge with AI-generated MCQs and essay questions based on your lecture content.",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30",
    },
  ], []);

  const steps = [
    { n: "1", label: "Upload Your Lecture", dot: "bg-indigo-600", glow: "shadow-[0_8px_20px_rgba(79,70,229,0.35)]" },
    { n: "2", label: "Ask Questions",       dot: "bg-amber-500",  glow: "shadow-[0_8px_20px_rgba(245,158,11,0.35)]" },
    { n: "3", label: "Master the Material", dot: "bg-emerald-500",glow: "shadow-[0_8px_20px_rgba(16,185,129,0.35)]" },
  ];

  const C = "w-full max-w-[1180px] mx-auto px-4 sm:px-6";

  return (
    <div className="min-h-screen tc bg-white dark:bg-[#0b1020] text-slate-900 dark:text-gray-200">

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 tc bg-white/90 dark:bg-[#0b1020]/90 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none">
        <div className={`${C} flex items-center justify-between gap-2 py-3`}>

          {/* Brand */}
          <button
            className="flex items-center gap-2 cursor-pointer select-none bg-transparent border-0 p-0 flex-shrink-0"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center tc bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 shadow-[0_4px_14px_rgba(99,102,241,0.18)]">
              <Brain size={18} />
            </span>
            <span className="font-black text-[15px] sm:text-[18px] tracking-tight tc text-slate-900 dark:text-gray-100">
              Lecture Brain
            </span>
          </button>

          {/* Nav actions */}
          <div className="flex items-center gap-1.5">
            {/* Theme toggle */}
            <motion.button whileTap={{ scale: 0.88 }} onClick={toggleTheme}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center cursor-pointer tc bg-white dark:bg-white/8 border border-slate-200 dark:border-white/12 text-slate-600 dark:text-gray-300 shadow-sm flex-shrink-0">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={dark ? "sun" : "moon"}
                  initial={{ rotate: -40, opacity: 0, scale: 0.7 }}
                  animate={{ rotate: 0,  opacity: 1, scale: 1   }}
                  exit={{   rotate:  40, opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-center justify-center">
                  {dark ? <Sun size={15} /> : <Moon size={15} />}
                </motion.span>
              </AnimatePresence>
            </motion.button>

            {user ? (
              /* ── Logged-in state ── */
              <>
                <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.95 }}
                  onClick={() => router.push(dashboardPath)}
                  className="flex items-center gap-1.5 h-8 sm:h-9 px-3 sm:px-4 rounded-xl text-[12px] sm:text-[13px] font-bold cursor-pointer border-0
                             tc bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_2px_10px_rgba(99,102,241,0.28)] transition-colors flex-shrink-0">
                  <LayoutDashboard size={14} />
                  <span className="hidden sm:block">{dashboardLabel}</span>
                </motion.button>

                <motion.button whileTap={{ scale: 0.95 }} onClick={logout}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center cursor-pointer tc
                             bg-white dark:bg-white/8 border border-slate-200 dark:border-white/12
                             text-slate-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400
                             shadow-sm flex-shrink-0 transition-colors">
                  <LogOut size={15} />
                </motion.button>
              </>
            ) : (
              /* ── Logged-out state ── */
              <motion.button whileTap={{ scale: 0.95 }} whileHover={{ y: -1 }}
                onClick={() => router.push("/login")}
                className="h-8 sm:h-9 px-3 sm:px-5 rounded-xl text-[12px] sm:text-[13px] font-bold cursor-pointer tc
                           bg-transparent text-slate-700 dark:text-gray-300
                           border border-slate-200 dark:border-white/15
                           hover:bg-slate-50 dark:hover:bg-white/6 hover:border-slate-300 dark:hover:border-white/25
                           transition-colors flex-shrink-0">
                Sign In
              </motion.button>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* ── HERO ────────────────────────────────────────────────── */}
        <section className="relative pt-12 sm:pt-20 pb-10 sm:pb-14 overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] sm:w-[900px] h-[400px] sm:h-[500px] rounded-full blur-3xl bg-indigo-500/[0.07] dark:bg-indigo-500/[0.13]" />
            <div className="absolute top-32 left-1/4 w-[300px] sm:w-[400px] h-[250px] sm:h-[300px] rounded-full blur-3xl bg-purple-500/[0.05] dark:bg-purple-500/[0.10]" />
          </div>

          <motion.div className={`${C} relative text-center`} variants={stagger} initial="hidden" animate="show">
            {/* Badge */}
            <motion.div variants={fadeUp}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full mb-5 sm:mb-6 tc bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-extrabold text-[10px] sm:text-[11px] tracking-wide border border-indigo-200 dark:border-indigo-500/30">
              <motion.span animate={{ scale: [1, 1.35, 1] }} transition={{ duration: 2.2, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-[#852760] inline-block flex-shrink-0" />
              AI-Powered Learning Platform
            </motion.div>

            <motion.h1 variants={fadeUp}
              className="text-[clamp(26px,6vw,52px)] font-black tracking-[-0.04em] leading-[1.1] mb-4 tc text-slate-900 dark:text-white">
              Interact Intelligently<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                with Your Lectures
              </span>
            </motion.h1>

            <motion.p variants={fadeUp}
              className="mx-auto max-w-[90%] sm:max-w-[56ch] leading-[1.7] text-[14px] sm:text-[15px] mb-7 sm:mb-8 tc text-slate-500 dark:text-gray-400">
              Transform your lecture notes and videos into interactive learning experiences.
              Get explanations, summaries, and quiz questions powered by AI.
            </motion.p>

            {/* ── CTA Buttons — role-aware ────────────────────────── */}
            <motion.div variants={fadeUp} className="flex justify-center gap-3 flex-wrap mb-10 sm:mb-12">
              {user ? (
                /* Logged-in — show one role-aware button */
                <motion.button
                  whileHover={{ y: -2, boxShadow: "0 12px 28px rgba(79,70,229,0.40)" }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => router.push(dashboardPath)}
                  className="h-10 sm:h-11 px-5 sm:px-7 rounded-xl font-bold text-[13px] sm:text-[14px] cursor-pointer border-0
                             bg-indigo-600 hover:bg-indigo-700 text-white
                             shadow-[0_4px_18px_rgba(79,70,229,0.28)] transition-colors inline-flex items-center gap-2">
                  <LayoutDashboard size={16} />
                  {isAdmin ? "Go to Dashboard" : "My Subjects"}
                </motion.button>
              ) : (
                /* Logged-out — Get Started + Sign In */
                <>
                  <motion.button
                    whileHover={{ y: -2, boxShadow: "0 12px 28px rgba(79,70,229,0.40)" }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => router.push("/signup")}
                    className="h-10 sm:h-11 px-5 sm:px-7 rounded-xl font-bold text-[13px] sm:text-[14px] cursor-pointer border-0
                               bg-indigo-600 hover:bg-indigo-700 text-white
                               shadow-[0_4px_18px_rgba(79,70,229,0.28)] transition-colors">
                    Get Started Free
                  </motion.button>
                  <motion.button
                    whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}
                    onClick={() => router.push("/login")}
                    className="h-10 sm:h-11 px-5 sm:px-7 rounded-xl font-bold text-[13px] sm:text-[14px] cursor-pointer tc
                               bg-transparent text-slate-700 dark:text-gray-300
                               border border-slate-200 dark:border-white/15
                               hover:bg-slate-50 dark:hover:bg-white/6 transition-colors">
                    Sign In
                  </motion.button>
                </>
              )}
            </motion.div>

            {/* Illustration */}
            <motion.div variants={fadeUp} className="flex justify-center" aria-hidden="true">
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0,  scale: 1    }}
                transition={{ delay: 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-[560px] h-[160px] sm:h-[190px] rounded-2xl tc border border-indigo-200/60 dark:border-indigo-500/20 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.50)] relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 tc bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40" />
                <motion.div
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                  className="relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center tc bg-white/80 dark:bg-white/12 border border-white dark:border-white/15 text-indigo-600 dark:text-indigo-300 shadow-[0_8px_24px_rgba(79,70,229,0.18)]">
                  <Brain size={44} className="sm:hidden" />
                  <Brain size={56} className="hidden sm:block" />
                </motion.div>
                <div className="absolute right-4 sm:right-[110px] z-10 flex flex-col gap-2 sm:gap-3">
                  {[<BookOpen size={13} key="b" />, <FileText size={13} key="f" />, <HelpCircle size={13} key="h" />].map((icon, i) => (
                    <div key={i} className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center tc bg-white/90 dark:bg-white/12 border border-white dark:border-white/15 text-slate-700 dark:text-gray-300 shadow-[0_4px_16px_rgba(15,23,42,0.10)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.40)]">
                      {icon}
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        {/* ── FEATURES ────────────────────────────────────────────── */}
        <section id="features" className="py-14 sm:py-20 tc bg-slate-50 dark:bg-white/[0.025]">
          <div className={C}>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-center mb-8 sm:mb-10">
              <h2 className="text-[22px] sm:text-[28px] font-black tracking-tight mb-2 tc text-slate-900 dark:text-white">Powerful Features</h2>
              <p className="text-[13px] sm:text-[14px] tc text-slate-500 dark:text-gray-400">Everything you need to master your lecture content</p>
            </motion.div>
            <motion.div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 w-full max-w-[880px] mx-auto"
              variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
              {features.map(f => (
                <motion.article key={f.title} variants={fadeUp} whileHover={{ y: -4 }}
                  className="rounded-2xl p-5 sm:p-6 cursor-default tc bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/8 shadow-[0_2px_16px_rgba(15,23,42,0.05)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.30)]">
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center mb-3 sm:mb-4 border tc flex-shrink-0 ${f.cls}`}>{f.icon}</div>
                  <h3 className="font-black text-[14px] sm:text-[15px] mb-1.5 sm:mb-2 tc text-slate-900 dark:text-white">{f.title}</h3>
                  <p className="text-[12px] sm:text-[13px] leading-[1.65] m-0 tc text-slate-500 dark:text-gray-400">{f.desc}</p>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── HOW IT WORKS ────────────────────────────────────────── */}
        <section id="how" className="py-14 sm:py-20 tc bg-white dark:bg-[#0b1020]">
          <div className={C}>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-center mb-10 sm:mb-12">
              <h2 className="text-[22px] sm:text-[28px] font-black tracking-tight mb-2 tc text-slate-900 dark:text-white">How It Works</h2>
              <p className="text-[13px] sm:text-[14px] tc text-slate-500 dark:text-gray-400">Get started in three simple steps</p>
            </motion.div>
            <motion.div className="grid grid-cols-3 gap-4 sm:gap-8 w-full max-w-[880px] mx-auto"
              variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
              {steps.map(s => (
                <motion.div key={s.n} variants={fadeUp} className="text-center">
                  <motion.span whileHover={{ scale: 1.12 }} transition={{ type: "spring", stiffness: 300 }}
                    className={`${s.dot} ${s.glow} w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 font-black text-[14px] sm:text-[16px] text-white`}>
                    {s.n}
                  </motion.span>
                  <div className="font-black text-[12px] sm:text-[14px] tc text-slate-900 dark:text-white leading-tight">{s.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────────── */}
        <section className="mx-3 sm:mx-6 mb-10 sm:mb-12 py-12 sm:py-16 rounded-2xl sm:rounded-3xl relative overflow-hidden text-white bg-gradient-to-br from-indigo-600 to-indigo-700 dark:from-indigo-700 dark:to-indigo-900">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/8 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-purple-500/20 blur-3xl" />
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="relative text-center px-4 sm:px-6">
            <h3 className="text-[20px] sm:text-[24px] font-black tracking-tight mb-3">Ready to transform your learning?</h3>
            <p className="mx-auto max-w-[42ch] sm:max-w-[52ch] opacity-90 text-[13px] sm:text-[14px] leading-[1.7] mb-7 sm:mb-8">
              Join thousands of students already learning smarter with Lecture Brain.
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              <motion.button
                whileHover={{ y: -2, boxShadow: "0 12px 30px rgba(0,0,0,0.30)" }} whileTap={{ scale: 0.96 }}
                onClick={() => router.push(user ? dashboardPath : "/signup")}
                className="h-10 sm:h-11 px-5 sm:px-7 rounded-xl font-bold text-[13px] sm:text-[14px] cursor-pointer border-0 bg-white text-indigo-700 shadow-[0_4px_18px_rgba(0,0,0,0.18)] transition-shadow">
                {user ? dashboardLabel : "Get Started Free"}
              </motion.button>
              {!user && (
                <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}
                  onClick={() => router.push("/login")}
                  className="h-10 sm:h-11 px-5 sm:px-7 rounded-xl font-bold text-[13px] sm:text-[14px] cursor-pointer bg-white/10 hover:bg-white/18 text-white border border-white/30 transition-colors">
                  Sign In
                </motion.button>
              )}
            </div>
          </motion.div>
        </section>

        {/* ── FOOTER ──────────────────────────────────────────────── */}
        <footer className="tc border-t border-slate-200 dark:border-white/8 pt-10 sm:pt-12 pb-8">
          <div className={`${C} flex flex-col sm:flex-row justify-between gap-8 sm:gap-10 items-start mb-8`}>
            <div className="flex-shrink-0">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center tc bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 shadow-[0_4px_14px_rgba(99,102,241,0.18)]"><Brain size={18} /></span>
                <span className="font-black text-[16px] sm:text-[17px] tracking-tight tc text-slate-900 dark:text-gray-100">Lecture Brain</span>
              </div>
              <p className="text-[12px] sm:text-[13px] leading-[1.6] max-w-[24ch] tc text-slate-500 dark:text-gray-500">AI-powered learning for every student.</p>
            </div>
            <div className="grid grid-cols-3 gap-6 sm:gap-10 text-[12px] sm:text-[13px] w-full sm:w-auto">
              {[
                { title: "Product", links: ["Features", "Pricing", "FAQ"] },
                { title: "Company", links: ["About", "Blog", "Contact"] },
                { title: "Legal",   links: ["Terms", "Privacy", "Security"] },
              ].map(col => (
                <div key={col.title}>
                  <div className="font-black mb-2 sm:mb-3 tc text-slate-900 dark:text-gray-200 text-[11px] sm:text-[13px]">{col.title}</div>
                  {col.links.map(l => (
                    <a key={l} href={`#${l.toLowerCase()}`} className="block py-0.5 sm:py-1 tc text-slate-500 dark:text-gray-500 hover:text-slate-900 dark:hover:text-gray-300 transition-colors">{l}</a>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className={`${C} pt-5 sm:pt-6 border-t border-slate-200 dark:border-white/8`}>
            <small className="text-[11px] sm:text-[12px] tc text-slate-400 dark:text-gray-600">
              © {new Date().getFullYear()} Lecture Brain. All rights reserved.
            </small>
          </div>
        </footer>
      </main>
    </div>
  );
}
