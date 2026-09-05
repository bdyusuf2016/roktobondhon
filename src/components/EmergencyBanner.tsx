import React from 'react';
import { PhoneCall, AlertTriangle } from 'lucide-react';
import { useOrgConfig } from '../contexts/OrgConfigContext';

export const EmergencyBanner: React.FC = () => {
  const { config } = useOrgConfig();

  return (
    <div className="bg-slate-950 text-slate-200 text-xs sm:text-sm py-2 px-4 border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span className="font-medium flex items-center gap-1.5 text-slate-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ধামরাই, সাভার ও মানিকগঞ্জে ২৪/৭ জরুরি রক্তের হটলাইন:
          </span>
          <a
            href={`tel:${config.emergencyHotline}`}
            className="font-bold tracking-wider text-white bg-red-600 hover:bg-red-500 px-2 py-0.5 rounded-sm transition-colors text-xs font-mono"
          >
            {config.emergencyHotline}
          </a>
        </div>
        <div className="hidden md:flex items-center gap-3 text-xs text-slate-400">
          <span>স্বেচ্ছাসেবী রক্তদানে নেই কোনো বাণিজ্যিক লেনদেন</span>
          <span className="text-slate-700 font-mono">|</span>
          <span className="text-red-400 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            ১ ব্যাগ রক্ত = ১টি জীবন
          </span>
        </div>
      </div>
    </div>
  );
};
