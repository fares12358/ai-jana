"use client";
import { MessageSquare } from "lucide-react";
export default function FeedbackPage() {
  return (
    <div className="max-w-[1400px] mx-auto">
      <h1 className="text-[26px] font-black tracking-tight text-slate-900 dark:text-white mb-1">Feedback Loop</h1>
      <p className="text-[14px] text-slate-500 dark:text-slate-400 mb-8">Student feedback and model improvement pipeline</p>
      <div className="flex flex-col items-center justify-center py-28 bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/8 rounded-2xl text-slate-400 dark:text-slate-500 gap-3">
        <MessageSquare size={40} strokeWidth={1.5} />
        <p className="text-[14px] font-semibold">Feedback Loop — coming soon</p>
        <p className="text-[13px]">API integration will populate this view</p>
      </div>
    </div>
  );
}
