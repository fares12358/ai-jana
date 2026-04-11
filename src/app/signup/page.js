"use client";
import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Brain, Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AppContext";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function checks(pw) {
  return {
    length:  pw.length >= 8,
    lower:   /[a-z]/.test(pw),
    upper:   /[A-Z]/.test(pw),
    number:  /\d/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
}
function firstPasswordError(pw) {
  const c = checks(pw);
  if (!c.length)  return "Password must be at least 8 characters";
  if (!c.lower)   return "Add at least 1 lowercase letter";
  if (!c.upper)   return "Add at least 1 uppercase letter";
  if (!c.number)  return "Add at least 1 number";
  if (!c.special) return "Add at least 1 special character (e.g. !@#$)";
  return "";
}

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
};

function FieldError({ msg }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          initial={{ opacity: 0, y: -4, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-1.5 text-[12px] font-semibold text-red-600 dark:text-red-400"
        >
          {msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Inner component — contains useSearchParams(), must be inside <Suspense>
───────────────────────────────────────────────────────────────────────────── */
function SignupForm() {
  const { signup, loading } = useAuth();
  const router  = useRouter();
  const params  = useSearchParams();          // ← only called inside Suspense

  const [name,        setName]        = useState("");
  const [email,       setEmail]       = useState("");
  const [pass,        setPass]        = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [agree,       setAgree]       = useState(false);
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors,      setErrors]      = useState({});

  const pwChecks       = useMemo(() => checks(pass), [pass]);
  const passErrLive    = useMemo(() => (pass ? firstPasswordError(pass) : ""), [pass]);
  const confirmErrLive = useMemo(
    () => (!confirmPass ? "" : confirmPass !== pass ? "Passwords do not match" : ""),
    [confirmPass, pass]
  );

  const validateAll = () => {
    const e = {};
    if (!name.trim())                        e.name        = "Full name is required";
    if (!email.trim())                       e.email       = "Email is required";
    else if (!emailRegex.test(email.trim())) e.email       = "Enter a valid email";
    if (!pass)                               e.pass        = "Password is required";
    else if (passErrLive)                    e.pass        = passErrLive;
    if (!confirmPass)                        e.confirmPass = "Please confirm your password";
    else if (confirmPass !== pass)           e.confirmPass = "Passwords do not match";
    if (!agree)                              e.agree       = "You must agree to continue";
    return e;
  };

  const canSubmit =
    name.trim() && email.trim() && pass && confirmPass &&
    agree && !passErrLive && !confirmErrLive && !loading;

  const clearField = (key) => setErrors((prev) => ({ ...prev, [key]: "" }));

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validateAll();
    setErrors(e);
    if (Object.keys(e).length) return;
    try {
      await signup({ name: name.trim(), email: email.trim().toLowerCase(), password: pass });
      router.push(params.get("next") || "/subjects");
    } catch (err) {
      setErrors((prev) => ({ ...prev, form: err?.message || "Signup failed. Please try again." }));
    }
  };

  const inputCls = (hasErr) =>
    `w-full py-2.5 rounded-xl border text-[14px] outline-none
     placeholder:text-slate-300 dark:placeholder:text-gray-600
     bg-slate-50 text-slate-900 border-slate-200
     dark:bg-black/25 dark:text-gray-100 dark:border-white/[0.10]
     transition-shadow
     ${hasErr
       ? "border-red-400 shadow-[0_0_0_3px_rgba(239,68,68,0.12)] dark:border-red-500/60 dark:shadow-[0_0_0_3px_rgba(239,68,68,0.14)]"
       : "focus:border-indigo-400 dark:focus:border-indigo-500/60 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.12)]"
     }`;

  const Label = ({ children, htmlFor }) => (
    <label
      className="text-[11px] font-extrabold tracking-wide uppercase text-slate-500 dark:text-gray-300/85"
      htmlFor={htmlFor}
    >
      {children}
    </label>
  );

  const EyeBtn = ({ show, toggle }) => (
    <button
      type="button"
      onClick={toggle}
      aria-label={show ? "Hide" : "Show"}
      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 border-0 bg-transparent cursor-pointer transition-colors text-slate-400 hover:text-slate-700 dark:text-gray-500 dark:hover:text-gray-300"
    >
      {show ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );

  const nextParam = params.get("next") || "/subjects";

  return (
    <motion.div
      variants={stagger} initial="hidden" animate="show"
      className="relative w-full max-w-[420px] text-center"
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
        Create your account to get started
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
        <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 sm:pb-5 flex flex-col gap-3.5 sm:gap-4">

          {/* Full Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Full Name</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500">
                <User size={15} />
              </span>
              <input
                id="name"
                className={`${inputCls(!!errors.name)} pl-9 pr-3`}
                value={name}
                onChange={(e) => { setName(e.target.value); clearField("name"); }}
                placeholder="John Doe"
              />
            </div>
            <FieldError msg={errors.name} />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500">
                <Mail size={15} />
              </span>
              <input
                id="email" type="email"
                className={`${inputCls(!!errors.email)} pl-9 pr-3`}
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearField("email"); }}
                placeholder="you@example.com"
              />
            </div>
            <FieldError msg={errors.email} />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500">
                <Lock size={15} />
              </span>
              <input
                id="password"
                type={showPass ? "text" : "password"}
                className={`${inputCls(!!errors.pass)} pl-9 pr-11`}
                value={pass}
                onChange={(e) => { setPass(e.target.value); clearField("pass"); }}
                placeholder="••••••••"
              />
              <EyeBtn show={showPass} toggle={() => setShowPass((v) => !v)} />
            </div>
            <FieldError msg={errors.pass} />

            {/* Password strength rules */}
            {pass && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="grid grid-cols-2 gap-x-4 gap-y-1 pt-0.5"
              >
                {[
                  [pwChecks.length,  "8+ characters"],
                  [pwChecks.upper,   "1 uppercase"],
                  [pwChecks.lower,   "1 lowercase"],
                  [pwChecks.number,  "1 number"],
                  [pwChecks.special, "1 special (!@#$)"],
                ].map(([ok, label]) => (
                  <div
                    key={label}
                    className={`flex items-center gap-1.5 text-[11px] font-semibold transition-colors ${ok ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-gray-600"}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ok ? "bg-emerald-500" : "bg-slate-300 dark:bg-gray-700"}`} />
                    {label}
                  </div>
                ))}
              </motion.div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPass">Confirm Password</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500">
                <Lock size={15} />
              </span>
              <input
                id="confirmPass"
                type={showConfirm ? "text" : "password"}
                className={`${inputCls(!!(errors.confirmPass || confirmErrLive))} pl-9 pr-11`}
                value={confirmPass}
                onChange={(e) => { setConfirmPass(e.target.value); clearField("confirmPass"); }}
                placeholder="••••••••"
              />
              <EyeBtn show={showConfirm} toggle={() => setShowConfirm((v) => !v)} />
            </div>
            <FieldError msg={errors.confirmPass || confirmErrLive} />
          </div>

          {/* Terms checkbox */}
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox" checked={agree}
              onChange={(e) => { setAgree(e.target.checked); clearField("agree"); }}
              className="mt-0.5 w-4 h-4 accent-indigo-500 flex-shrink-0"
            />
            <span className="text-[12px] leading-[1.5] text-slate-500 dark:text-gray-400 text-left">
              I agree to the{" "}
              <a href="#" onClick={(e) => e.preventDefault()}
                className="font-bold transition-colors text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                Terms of Service
              </a>{" "}and{" "}
              <a href="#" onClick={(e) => e.preventDefault()}
                className="font-bold transition-colors text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                Privacy Policy
              </a>
            </span>
          </label>
          <FieldError msg={errors.agree} />

          {/* Form-level error */}
          <AnimatePresence>
            {errors.form && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-semibold
                           bg-red-50 border border-red-200 text-red-600
                           dark:bg-red-500/12 dark:border-red-500/25 dark:text-red-400"
              >
                <span>⚠</span> {errors.form}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            whileHover={canSubmit ? { boxShadow: "0 8px 24px rgba(99,102,241,0.35)" } : {}}
            type="submit" disabled={!canSubmit}
            className="w-full py-2.5 rounded-xl font-bold text-[14px] cursor-pointer border-0
                       bg-indigo-600 hover:bg-indigo-700 text-white
                       shadow-[0_4px_14px_rgba(99,102,241,0.30)]
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Creating account…
              </span>
            ) : "Create Account"}
          </motion.button>
        </div>

        {/* Card footer */}
        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-t text-center text-[12px]
                        border-slate-100 text-slate-400
                        dark:border-white/[0.07] dark:text-gray-500">
          Already have an account?{" "}
          <Link
            href={`/login?next=${encodeURIComponent(nextParam)}`}
            className="font-bold transition-colors text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            Sign in
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

/* ─────────────────────────────────────────────────────────────────────────────
   Page shell — static, wraps SignupForm in <Suspense>
───────────────────────────────────────────────────────────────────────────── */
export default function SignupPage() {
  return (
    <div className="min-h-screen min-h-dvh flex items-center justify-center px-4 sm:px-5 py-10 sm:py-12 relative overflow-hidden bg-slate-100 dark:bg-[#050a1a]">
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-[400px] sm:w-[700px] h-[350px] sm:h-[500px] rounded-full blur-[80px]
                        bg-indigo-400/[0.10] dark:bg-indigo-600/[0.12]" />
        <div className="absolute bottom-1/4 left-1/4
                        w-[280px] sm:w-[400px] h-[220px] sm:h-[300px] rounded-full blur-[60px]
                        bg-purple-400/[0.07] dark:bg-purple-600/[0.08]" />
      </div>

      {/* SignupForm is the only part that needs useSearchParams */}
      <Suspense fallback={
        <div className="w-full max-w-[420px] flex items-center justify-center py-20">
          <span className="w-7 h-7 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
        </div>
      }>
        <SignupForm />
      </Suspense>
    </div>
  );
}
