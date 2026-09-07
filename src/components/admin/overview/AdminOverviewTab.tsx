import React from 'react';
import { Droplets, MapPin } from 'lucide-react';
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

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">মোট ডোনার</span>
          <span className="text-2xl font-black text-slate-900 block mt-1 tracking-tight">{totalDonors}</span>
          <span className="text-[10px] text-slate-500">ধামরাই, সাভার, মানিকগঞ্জ</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">ভেরিফাইড ডোনার</span>
          <span className="text-2xl font-black text-emerald-600 block mt-1 tracking-tight">{verifiedDonors}</span>
          <span className="text-[10px] text-emerald-700 font-medium">পরিচয় নিশ্চিত</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">যাচাইকরণ বাকি</span>
          <span className="text-2xl font-black text-amber-600 block mt-1 tracking-tight">{pendingDonors}</span>
          <span className="text-[10px] text-amber-700 font-medium">রিভিউ প্রয়োজন</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">সক্রিয় রক্তের আবেদন</span>
          <span className="text-2xl font-black text-blue-600 block mt-1 tracking-tight">{activeReqs.length}</span>
          <span className="text-[10px] text-blue-700 font-medium">চলমান সেবা</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">জরুরি ক্রাইসিস</span>
          <span className="text-2xl font-black text-red-600 block mt-1 tracking-tight">{criticalReqs.length}</span>
          <span className="text-[10px] text-red-600 font-bold">আইসিইউ/অপারেশন</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">মোট রক্তদান সম্পন্ন</span>
          <span className="text-2xl font-black text-purple-600 block mt-1 tracking-tight">{totalDonations}</span>
          <span className="text-[10px] text-purple-700 font-medium">জীবন বাঁচানো হয়েছে</span>
        </div>
      </div>

      {/* Blood Group Breakdown Chart / Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Droplets className="w-4 h-4 text-red-600" />
            রক্তের গ্রুপ অনুযায়ী ডোনারের সংখ্যা
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {(Object.keys(bloodGroupCounts) as BloodGroup[]).map((group) => {
              const count = bloodGroupCounts[group];
              const percent = totalDonors > 0 ? Math.round((count / totalDonors) * 100) : 0;
              return (
                <div key={group} className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-center">
                  <span className="text-base font-black text-red-700 font-mono block">{group}</span>
                  <span className="text-xs font-bold text-slate-800 block mt-0.5">{count} জন</span>
                  <span className="text-[10px] text-slate-400 font-mono block">{percent}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* District Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-600" />
            শাখা ও জেলা অনুযায়ী ডোনারের বণ্টন
          </h2>
          <div className="space-y-3 text-xs">
            {branches.map((branch) => {
              const branchDonors = donors.filter(
                (d) => d.district === branch.district || d.upazila === branch.upazila
              ).length;
              const pct = totalDonors > 0 ? Math.round((branchDonors / totalDonors) * 100) : 0;
              return (
                <div key={branch.id} className="space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-700">
                    <span>{branch.nameBn} ({branch.upazila})</span>
                    <span>{branchDonors} জন ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-600 rounded-full"
                      style={{ width: `${pct}%` }}
                    ></div>
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
