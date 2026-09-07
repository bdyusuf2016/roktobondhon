import React from 'react';
import {
  Droplets,
  MapPin,
  Users,
  ShieldCheck,
  Clock,
  Flame,
  Award,
  TrendingUp,
} from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import type { BloodGroup } from '../../../types';

export const AdminOverviewTab: React.FC = () => {
  const { donors, bloodRequests, donations, branches } = useData();

  const totalDonors = donors.length;
  const verifiedDonors = donors.filter((d) => d.verificationStatus === 'verified').length;
  const pendingDonors = donors.filter((d) => d.verificationStatus === 'pending').length;
  const activeReqs = bloodRequests.filter((r) => r.status === 'active' || r.status === 'matched');
  const criticalReqs = bloodRequests.filter((r) => r.emergencyLevel === 'CRITICAL');
  const totalDonations = donations.length;

  const bloodGroupCounts: Record<BloodGroup, number> = {
    'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0
  };
  donors.forEach((d) => {
    if (bloodGroupCounts[d.bloodGroup] !== undefined) {
      bloodGroupCounts[d.bloodGroup]++;
    }
  });

  const kpis = [
    {
      title: 'মোট নিবন্ধিত ডোনার',
      value: totalDonors,
      subtext: 'ধামরাই, সাভার, মানিকগঞ্জ',
      icon: Users,
      gradient: 'from-blue-500 to-indigo-600',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
      topLine: 'from-blue-500 to-indigo-500',
    },
    {
      title: 'ভেরিফাইড ডোনার',
      value: verifiedDonors,
      subtext: 'পরিচয় ও যোগ্যতা নিশ্চিত',
      icon: ShieldCheck,
      gradient: 'from-emerald-500 to-teal-600',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      topLine: 'from-emerald-500 to-teal-500',
    },
    {
      title: 'যাচাইকরণ বাকি (Pending)',
      value: pendingDonors,
      subtext: 'অ্যাডমিন রিভিউ আবশ্যক',
      icon: Clock,
      gradient: 'from-amber-500 to-orange-600',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
      topLine: 'from-amber-500 to-orange-500',
    },
    {
      title: 'চলমান রক্তের আবেদন',
      value: activeReqs.length,
      subtext: 'সক্রিয় ও ফিল্ডে ম্যাচিং',
      icon: Droplets,
      gradient: 'from-sky-500 to-blue-600',
      badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
      topLine: 'from-sky-500 to-blue-500',
    },
    {
      title: 'জরুরি ক্রাইসিস রিকোয়েস্ট',
      value: criticalReqs.length,
      subtext: 'আইসিইউ / সিজারিয়ান ইমার্জেন্সি',
      icon: Flame,
      gradient: 'from-red-500 to-rose-600',
      badgeBg: 'bg-red-50 text-red-700 border-red-200 font-bold',
      topLine: 'from-red-600 to-rose-500',
    },
    {
      title: 'মোট সফল রক্তদান',
      value: totalDonations,
      subtext: 'জীবন বাঁচানো সম্পন্ন হয়েছে',
      icon: Award,
      gradient: 'from-purple-500 to-violet-600',
      badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
      topLine: 'from-purple-500 to-violet-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="group relative bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col justify-between"
            >
              {/* Top Accent Line */}
              <div
                className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${kpi.topLine}`}
              />

              <div>
                <div className="flex items-center justify-between gap-1.5 mb-2">
                  <span className="text-[11px] font-semibold text-slate-500 truncate">
                    {kpi.title}
                  </span>
                  <div
                    className={`w-7 h-7 rounded-lg bg-gradient-to-br ${kpi.gradient} text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                    {kpi.value}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 truncate font-medium">
                  {kpi.subtext}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${kpi.badgeBg}`}>
                  লাইভ
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Blood Group Breakdown Chart / Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Blood Group Cards */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-red-50 border border-red-200/70 text-red-600 flex items-center justify-center">
                <Droplets className="w-3.5 h-3.5" />
              </span>
              <span>রক্তের গ্রুপ অনুযায়ী ডোনারের সংখ্যা</span>
            </h2>
            <span className="text-xs font-mono font-bold text-slate-500">
              মোট: {totalDonors} জন
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            {(Object.keys(bloodGroupCounts) as BloodGroup[]).map((group) => {
              const count = bloodGroupCounts[group];
              const percent = totalDonors > 0 ? Math.round((count / totalDonors) * 100) : 0;
              return (
                <div
                  key={group}
                  className="p-3 rounded-xl bg-gradient-to-b from-slate-50 to-slate-100/50 border border-slate-200/80 hover:border-red-300 hover:bg-red-50/20 transition-all text-center group"
                >
                  <span className="text-base sm:text-lg font-black text-red-600 font-mono block group-hover:scale-110 transition-transform">
                    {group}
                  </span>
                  <span className="text-xs font-bold text-slate-900 block mt-0.5 font-mono">
                    {count} জন
                  </span>
                  <div className="mt-1.5 w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-red-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono block mt-1">
                    {percent}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* District Breakdown */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-200/70 text-indigo-600 flex items-center justify-center">
                <MapPin className="w-3.5 h-3.5" />
              </span>
              <span>শাখা ও আঞ্চলিক ডোনার বণ্টন</span>
            </h2>
            <span className="text-xs font-semibold text-slate-500">
              {branches.length}টি সক্রিয় শাখা
            </span>
          </div>

          <div className="space-y-3.5 text-xs">
            {branches.map((branch) => {
              const branchDonors = donors.filter(
                (d) => d.district === branch.district || d.upazila === branch.upazila
              ).length;
              const pct = totalDonors > 0 ? Math.round((branchDonors / totalDonors) * 100) : 0;
              return (
                <div key={branch.id} className="space-y-1.5 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      <span>{branch.nameBn}</span>
                      <span className="text-[10px] text-slate-400 font-normal">({branch.upazila})</span>
                    </div>
                    <span className="font-mono font-bold text-slate-700">
                      {branchDonors} জন <span className="text-slate-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 to-rose-600 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

