import React from 'react';
import { RotateCcw } from 'lucide-react';
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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
      <div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-md text-xs font-black uppercase bg-slate-900 text-white tracking-wider">
            Admin Portal
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {title}
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {subtitle}
        </p>
      </div>

      {/* Demo Data Reset Button — Protected strictly for Demo Mode & Super Admin */}
      {isDemoMode && currentUser?.role === 'super_admin' && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              const confirmed = await dialog.confirm({
                title: 'টেস্ট ডেটাবেজ রিসেট',
                message: 'আপনি কি টেস্ট ডেটাবেজ রিসেট করতে চান? (১০০ ডোনার, ২০ রিকোয়েস্ট, ৫০ রক্তদান তৈরি হবে)',
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
            className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200"
            title="১০০ জন ডোনার, ২০ আবেদন এবং ৫০ রক্তদান পুনঃলোড করুন"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            ডেমো ডেটা রিসেট (100 Donors Seed)
          </button>
        </div>
      )}
    </div>
  );
};
