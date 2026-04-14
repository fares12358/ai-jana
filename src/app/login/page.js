"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Brain, Lock, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AppContext";

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

/* ── Inner form — uses useSearchParams so must be inside <Suspense> ── */
function LoginForm() {
  const { login, loading } = useAuth();
  const router  = useRouter();
  const params  = useSearchParams();

  const [email, setEmail] = useState("");
  const [pass,  setPass]  = useState("");
  const [err,   setErr]   = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!email.trim()) return setErr("Enter your email");
    if (!pass.trim())  return setErr("Enter your password");
    try {
      const { user } = await login({ email: email.trim(), password: pass });

      // ── Admin email → redirect to admin dashboard ──────────────────
      if (user?.isAdmin) {
        router.push("/admin");
        return;
      }

      // ── Regular user → respect ?next= param or default ────────────
      router.push(params.get("next") || "/subjects");
    } catch (e2) {
      setErr(e2?.message || "Login failed. Please check your credentials.");
    }
  };

  const nextParam = params.get("next") || "/subjects";

  return (
    <motion.div
      variants={stagger} initial="hidden" animate="show"
      className="relative w-full max-w-[400px] text-center"
    >
      {/* Brand */}
      <motion.div variants={fadeUp} className="flex items-center justify-center gap-2.5 mb-2">
        <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_8px_24px_rgba(99,102,241,0.35)]">
          <Brain size={18} color="#fff" />
        </span>
        <span className="font-black text-[18px] tracking-tight text-slate-900 dark:text-white">
          Lecture Brain
        </span>
      </motion.div>

      <motion.p variants={fadeUp} className="text-[13px] mb-6 sm:mb-7 text-slate-500 dark:text-gray-400">
        Welcome back — sign in to continue
      </motion.p>

      {/* Card */}
      <motion.form
        variants={fadeUp} onSubmit={submit}
        className="text-left rounded-2xl border overflow-hidden
                   bg-white border-slate-200 shadow-[0_8px_40px_rgba(15,23,42,0.10)]
                   dark:bg-[rgba(15,23,42,0.60)] dark:border-white/[0.09]
                   dark:shadow-[0_24px_80px_rgba(0,0,0,0.55)]
                   dark:[backdrop-filter:blur(20px)]"
      >
        <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 sm:pb-5 flex flex-col gap-4">

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-extrabold tracking-wide uppercase text-slate-500 dark:text-gray-300/85" htmlFor="email">
              Email
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500">
                <Mail size={15} />
              </span>
              <input
                id="email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-[14px] outline-none border
                           placeholder:text-slate-300 dark:placeholder:text-gray-600
                           bg-slate-50 text-slate-900 border-slate-200
                           dark:bg-black/25 dark:text-gray-100 dark:border-white/[0.10]
                           focus:border-indigo-400 dark:focus:border-indigo-500/60
                           focus:shadow-[0_0_0_4px_rgba(99,102,241,0.12)] transition-shadow"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-extrabold tracking-wide uppercase text-slate-500 dark:text-gray-300/85" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500">
                <Lock size={15} />
              </span>
              <input
                id="password" type="password" value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-[14px] outline-none border
                           placeholder:text-slate-300 dark:placeholder:text-gray-600
                           bg-slate-50 text-slate-900 border-slate-200
                           dark:bg-black/25 dark:text-gray-100 dark:border-white/[0.10]
                           focus:border-indigo-400 dark:focus:border-indigo-500/60
                           focus:shadow-[0_0_0_4px_rgba(99,102,241,0.14)] transition-shadow"
              />
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {err && (
              <motion.div
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-semibold
                           bg-red-50 border border-red-200 text-red-600
                           dark:bg-red-500/12 dark:border-red-500/25 dark:text-red-400"
              >
                <span className="flex-shrink-0">⚠</span> {err}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            whileHover={{ boxShadow: "0 8px 24px rgba(99,102,241,0.35)" }}
            type="submit" disabled={!!loading}
            className="w-full py-2.5 rounded-xl font-bold text-[14px] cursor-pointer border-0
                       bg-indigo-600 hover:bg-indigo-700 text-white
                       shadow-[0_4px_14px_rgba(99,102,241,0.30)]
                       transition-colors disabled:opacity-55 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Logging in…
              </span>
            ) : "Login"}
          </motion.button>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-t text-center text-[12px]
                        border-slate-100 text-slate-400
                        dark:border-white/[0.07] dark:text-gray-500">
          Don&apos;t have an account?{" "}
          <Link
            href={`/signup?next=${encodeURIComponent(nextParam)}`}
            className="text-indigo-600 dark:text-indigo-400 font-bold hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
          >
            Create one
          </Link>
        </div>
      </motion.form>

      <motion.div variants={fadeUp}>
        <Link href="/"
          className="mt-5 inline-flex items-center gap-1.5 text-[12px] transition-colors text-slate-400 hover:text-slate-600 dark:text-gray-600 dark:hover:text-gray-400">
          ← Back to home
        </Link>
      </motion.div>
    </motion.div>
  );
}

/* ── Page shell ───────────────────────────────────────────────────── */
export default function LoginPage() {
  return (
    <div className="min-h-screen min-h-dvh flex items-center justify-center px-4 sm:px-5 py-10 sm:py-12 relative overflow-hidden bg-slate-100 dark:bg-[#050a1a]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-[400px] sm:w-[700px] h-[350px] sm:h-[500px] rounded-full blur-[80px]
                        bg-indigo-400/[0.10] dark:bg-indigo-600/[0.14]" />
        <div className="absolute bottom-1/4 left-1/4
                        w-[280px] sm:w-[400px] h-[220px] sm:h-[300px] rounded-full blur-[60px]
                        bg-purple-400/[0.08] dark:bg-purple-600/[0.09]" />
      </div>
      <Suspense fallback={
        <div className="w-full max-w-[400px] flex items-center justify-center py-20">
          <span className="w-7 h-7 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
