"use client";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] flex">
      <AdminSidebar />

      {/* Main — offset by sidebar on lg+, full width on mobile */}
      <div className="flex-1 lg:ml-[220px] flex flex-col min-h-screen w-full overflow-hidden">

        {/* Top bar */}
        <header className="
          sticky top-0 z-30 flex items-center justify-end
          px-4 sm:px-6 py-3
          bg-white/90 dark:bg-[#090d16]/90 backdrop-blur-xl
          border-b border-slate-200 dark:border-white/8
          pl-14 lg:pl-6
        ">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]" />
            System Online
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
