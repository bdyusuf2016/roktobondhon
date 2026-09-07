import React from 'react';
import { RotateCcw, ShieldCheck, Activity, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useDialog } from '../../contexts/DialogContext';
import { isDemoMode } from '../../supabase/config';

interface AdminHeaderProps {
  title?: string;
  subtitle?: string;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  title = 'এডমিন ও মডারেশন কন্ট্রোল প্যানেল',
  subtitle = 'ধামরাই, সাভার ও মানিকগঞ্জ জেলা ও উপজেলা ভিত্তিক পূর্ণাঙ্গ রক্তদান ব্যবস্থাপনা',
}) => {
  const { currentUser } = useAuth();
  const { resetDemoData } = useData();
  const dialog = useDialog();

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-5 sm:p-6 shadow-lg border border-slate-700/60">
      {/* Subtle Background Glow Elements */}
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute right-1/3 -bottom-16 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Title & Status */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-red-600/90 text-white border border-red-500/40 shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>রক্ত দান পরিবার কালামপুর কন্ট্রোল সেন্টার</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>লাইভ ক্লাউড সিঙ্ক সক্রিয়</span>
            </span>

            {currentUser && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-500/15 text-purple-200 border border-purple-500/30">
                <Sparkles className="w-3 h-3 text-purple-300" />
                <span className="capitalize">{currentUser.role === 'super_admin' ? 'সুপার এডমিন' : currentUser.role}</span>: {currentUser.fullName}
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight">
            {title}
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-normal leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Demo Data Reset Button (Visible only for Demo Mode & Super Admin) */}
          {isDemoMode && currentUser?.role === 'super_admin' && (
            <button
              type="button"
              onClick={async () => {
                const confirmed = await dialog.confirm({
                  title: 'টেস্ট ডেটাবেজ রিসেট',
                  message:
                    'আপনি কি টেস্ট ডেটাবেজ রিসেট করতে চান? (১০০ ডোনার, ২০ রিকোয়েস্ট, ৫০ রক্তদান তৈরি হবে)',
                  type: 'danger',
                  confirmText: 'হ্যাঁ, রিসেট করুন',
                  cancelText: 'বাতিল',
                });
                if (confirmed) {
                  resetDemoData();
                  dialog.alert({
                    title: 'রিসেট সম্পন্ন!',
                    message: 'ডেটাবেজ সফলভাবে রিসেট ও সিড করা হয়েছে!',
                    type: 'success',
                  });
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700 hover:border-slate-600 shadow-sm cursor-pointer"
              title="১০০ জন ডোনার, ২০ আবেদন এবং ৫০ রক্তদান পুনঃলোড করুন"
            >
              <RotateCcw className="w-3.5 h-3.5 text-red-400" />
              <span>ডেমো সিড রিসেট</span>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs text-slate-300 text-xs font-medium">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>সিস্টেম হেলথ: ১০০% সক্রিয়</span>
          </div>
        </div>
      </div>
    </div>
  );
};
