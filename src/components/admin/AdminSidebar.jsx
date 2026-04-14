"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaBrain,
  FaChartBar,
  FaUsers,
  FaChartLine,
  FaMagic,
  FaSun,
  FaMoon,
  FaBars,
  FaTimes,
} from "react-icons/fa";
import { useTheme } from "@/context/AppContext";

const NAV = [
  { label: "Dashboard", href: "/admin", icon: FaChartBar },
  { label: "Students", href: "/admin/students", icon: FaUsers },
  { label: "Analytics", href: "/admin/analytics", icon: FaChartLine },
  { label: "Presentation Generator", href: "/admin/presentation", icon: FaMagic },
];

function SidebarContent({ onClose }) {
  const pathname = usePathname();
  const { dark, toggleTheme } = useTheme();

  const isActive = (href) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center justify-between gap-3 px-5 py-5 border-b border-slate-100 dark:border-white/8">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-[0_4px_14px_rgba(99,102,241,0.35)]">
            <FaBrain className="text-white text-[16px]" />
          </span>
          <div>
            <div className="font-black text-[15px] tracking-tight text-slate-900 dark:text-white leading-tight">
              Lecture Brain
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">AI Dashboard</div>
          </div>
        </div>
        {/* Close button — mobile only */}
        {onClose && (
          <button onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white border-0 bg-transparent cursor-pointer">
            <FaTimes size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-0.5">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href}
              onClick={onClose}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold
                transition-colors duration-150 group
                ${active
                  ? "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/6 hover:text-slate-900 dark:hover:text-white"
                }
              `}
            >
              <Icon className={`text-[15px] flex-shrink-0 ${active
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                }`} />
              <span className="leading-tight">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Theme toggle */}
      <div className="px-4 py-4 border-t border-slate-100 dark:border-white/8">
        <button onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold
                     text-slate-600 dark:text-slate-400
                     hover:bg-slate-100 dark:hover:bg-white/6
                     hover:text-slate-900 dark:hover:text-white transition-colors border-0 bg-transparent cursor-pointer">
          {dark
            ? <FaSun className="text-amber-400 text-[15px]" />
            : <FaMoon className="text-slate-400 text-[15px]" />
          }
          {dark ? "Light Mode" : "Dark Mode"}
        </button>
      </div>
    </div>
  );
}

export default function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* ── Desktop sidebar — fixed, always visible ── */}
      <aside className="
        hidden lg:flex flex-col
        fixed top-0 left-0 h-screen w-[220px] z-40
        bg-white dark:bg-[#0f1117]
        border-r border-slate-200 dark:border-white/8
      ">
        <SidebarContent />
      </aside>

      {/* ── Mobile hamburger button ── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="
          lg:hidden fixed top-3.5 left-4 z-50
          w-9 h-9 flex items-center justify-center rounded-xl
          bg-white dark:bg-[#0f1117]
          border border-slate-200 dark:border-white/10
          text-slate-600 dark:text-slate-300
          shadow-sm cursor-pointer
        "
        aria-label="Open menu"
      >
        <FaBars size={15} />
      </button>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-40 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside className="
            lg:hidden fixed top-0 left-0 h-screen w-[240px] z-50 flex flex-col
            bg-white dark:bg-[#0f1117]
            border-r border-slate-200 dark:border-white/8
            shadow-xl
          ">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </>
      )}
    </>
  );
}
