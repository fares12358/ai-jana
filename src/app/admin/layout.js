"use client";
import AdminSidebar from "@/components/admin/AdminSidebar";
import RequireAdmin from "@/components/RequireAdmin";
import { useAuth } from "@/context/AppContext";

function AdminShell({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] flex">
      <AdminSidebar />

      {/* Main — offset by sidebar on lg+, full width on mobile */}
      <div className="flex-1 lg:ml-[220px] flex flex-col min-h-screen w-full overflow-hidden">

        {/* Top bar */}
        <header className="
          sticky top-0 z-30 flex items-center justify-between
          px-4 sm:px-6 py-3
          bg-white/90 dark:bg-[#090d16]/90 backdrop-blur-xl
          border-b border-slate-200 dark:border-white/8
          pl-14 lg:pl-6
        ">
          {/* Left — system status */}
          <div className="flex items-center gap-2 text-[13px] font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]" />
            System Online
          </div>

          {/* Right — admin badge + logout */}
          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                  {user.email}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                  ADMIN
                </span>
              </div>
            )}
            <button
              onClick={logout}
              className="text-[12px] font-bold px-3 py-1.5 rounded-lg cursor-pointer border-0
                         bg-slate-100 dark:bg-white/8 text-slate-600 dark:text-slate-300
                         hover:bg-red-50 dark:hover:bg-red-500/10
                         hover:text-red-600 dark:hover:text-red-400
                         transition-colors">
              Logout
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }) {
  return (
    <RequireAdmin>
      <AdminShell>{children}</AdminShell>
    </RequireAdmin>
  );
}
