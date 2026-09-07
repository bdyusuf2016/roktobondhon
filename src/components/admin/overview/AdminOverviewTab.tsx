import React, { useState, useMemo, useRef } from 'react';
import {
  Droplets,
  MapPin,
  Users,
  ShieldCheck,
  Clock,
  Flame,
  Award,
  Search,
  X,
  ExternalLink,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Calendar,
  Building2,
} from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import type { BloodGroup, Donor, BloodRequest, Donation } from '../../../types';
import type { AdminTabKey } from '../AdminSidebar';

interface AdminOverviewTabProps {
  onNavigateToTab?: (tab: AdminTabKey) => void;
}

type FilterType =
  | 'donors_all'
  | 'donors_verified'
  | 'donors_pending'
  | 'requests_active'
  | 'requests_critical'
  | 'donations_all'
  | 'blood_group'
  | 'branch';

interface ActiveFilterState {
  type: FilterType;
  title: string;
  subTitle: string;
  badgeColor: string;
  navTarget: AdminTabKey;
  group?: BloodGroup;
  branchName?: string;
  upazila?: string;
  district?: string;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({ onNavigateToTab }) => {
  const { donors, bloodRequests, donations, branches } = useData();
  const [activeFilter, setActiveFilter] = useState<ActiveFilterState | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const resultsRef = useRef<HTMLDivElement>(null);

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

  const handleSelectFilter = (filter: ActiveFilterState) => {
    // If clicking the same filter again, toggle it off
    if (
      activeFilter &&
      activeFilter.type === filter.type &&
      activeFilter.group === filter.group &&
      activeFilter.branchName === filter.branchName
    ) {
      setActiveFilter(null);
      setSearchQuery('');
      return;
    }

    setActiveFilter(filter);
    setSearchQuery('');

    // Smooth scroll down to the filtered results panel
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  const handleClearFilter = () => {
    setActiveFilter(null);
    setSearchQuery('');
  };

  // Compute filtered items in real-time
  const filteredDonors = useMemo(() => {
    if (!activeFilter) return [];
    let list: Donor[] = [];

    if (activeFilter.type === 'donors_all') {
      list = donors;
    } else if (activeFilter.type === 'donors_verified') {
      list = donors.filter((d) => d.verificationStatus === 'verified');
    } else if (activeFilter.type === 'donors_pending') {
      list = donors.filter((d) => d.verificationStatus === 'pending');
    } else if (activeFilter.type === 'blood_group' && activeFilter.group) {
      list = donors.filter((d) => d.bloodGroup === activeFilter.group);
    } else if (activeFilter.type === 'branch') {
      list = donors.filter(
        (d) =>
          d.district === activeFilter.district ||
          d.upazila === activeFilter.upazila ||
          d.area.toLowerCase().includes((activeFilter.upazila || '').toLowerCase())
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (d) =>
          d.fullName.toLowerCase().includes(q) ||
          d.donorId.toLowerCase().includes(q) ||
          d.phone.includes(q) ||
          d.area.toLowerCase().includes(q) ||
          d.upazila.toLowerCase().includes(q)
      );
    }

    return list;
  }, [activeFilter, donors, searchQuery]);

  const filteredRequests = useMemo(() => {
    if (!activeFilter) return [];
    let list: BloodRequest[] = [];

    if (activeFilter.type === 'requests_active') {
      list = activeReqs;
    } else if (activeFilter.type === 'requests_critical') {
      list = criticalReqs;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.patientName.toLowerCase().includes(q) ||
          r.requestId.toLowerCase().includes(q) ||
          r.hospital.toLowerCase().includes(q) ||
          r.contactNumber.includes(q) ||
          r.bloodGroup.toLowerCase().includes(q)
      );
    }

    return list;
  }, [activeFilter, activeReqs, criticalReqs, searchQuery]);

  const filteredDonations = useMemo(() => {
    if (!activeFilter || activeFilter.type !== 'donations_all') return [];
    let list: Donation[] = donations;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (dn) =>
          dn.donorName.toLowerCase().includes(q) ||
          dn.id.toLowerCase().includes(q) ||
          dn.hospital.toLowerCase().includes(q) ||
          dn.bloodGroup.toLowerCase().includes(q)
      );
    }

    return list;
  }, [activeFilter, donations, searchQuery]);

  const kpis = [
    {
      filterType: 'donors_all' as FilterType,
      title: 'মোট নিবন্ধিত ডোনার',
      value: totalDonors,
      subtext: 'ধামরাই, সাভার, মানিকগঞ্জ',
      icon: Users,
      gradient: 'from-blue-500 to-indigo-600',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
      topLine: 'from-blue-500 to-indigo-500',
      navTarget: 'donors' as AdminTabKey,
    },
    {
      filterType: 'donors_verified' as FilterType,
      title: 'ভেরিফাইড ডোনার',
      value: verifiedDonors,
      subtext: 'পরিচয় ও যোগ্যতা নিশ্চিত',
      icon: ShieldCheck,
      gradient: 'from-emerald-500 to-teal-600',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      topLine: 'from-emerald-500 to-teal-500',
      navTarget: 'donors' as AdminTabKey,
    },
    {
      filterType: 'donors_pending' as FilterType,
      title: 'যাচাইকরণ বাকি (Pending)',
      value: pendingDonors,
      subtext: 'অ্যাডমিন রিভিউ আবশ্যক',
      icon: Clock,
      gradient: 'from-amber-500 to-orange-600',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
      topLine: 'from-amber-500 to-orange-500',
      navTarget: 'donors' as AdminTabKey,
    },
    {
      filterType: 'requests_active' as FilterType,
      title: 'চলমান রক্তের আবেদন',
      value: activeReqs.length,
      subtext: 'সক্রিয় ও ফিল্ডে ম্যাচিং',
      icon: Droplets,
      gradient: 'from-sky-500 to-blue-600',
      badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
      topLine: 'from-sky-500 to-blue-500',
      navTarget: 'requests' as AdminTabKey,
    },
    {
      filterType: 'requests_critical' as FilterType,
      title: 'জরুরি ক্রাইসিস রিকোয়েস্ট',
      value: criticalReqs.length,
      subtext: 'আইসিইউ / সিজারিয়ান ইমার্জেন্সি',
      icon: Flame,
      gradient: 'from-red-500 to-rose-600',
      badgeBg: 'bg-red-50 text-red-700 border-red-200 font-bold',
      topLine: 'from-red-600 to-rose-500',
      navTarget: 'requests' as AdminTabKey,
    },
    {
      filterType: 'donations_all' as FilterType,
      title: 'মোট সফল রক্তদান',
      value: totalDonations,
      subtext: 'জীবন বাঁচানো সম্পন্ন হয়েছে',
      icon: Award,
      gradient: 'from-purple-500 to-violet-600',
      badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
      topLine: 'from-purple-500 to-violet-500',
      navTarget: 'donations' as AdminTabKey,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 6 Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          const isCurrentActive = activeFilter?.type === kpi.filterType;

          return (
            <button
              key={idx}
              type="button"
              onClick={() =>
                handleSelectFilter({
                  type: kpi.filterType,
                  title: kpi.title,
                  subTitle: kpi.subtext,
                  badgeColor: kpi.badgeBg,
                  navTarget: kpi.navTarget,
                })
              }
              className={`group relative text-left p-4 rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between cursor-pointer ${
                isCurrentActive
                  ? 'bg-red-50/40 border-red-500 ring-2 ring-red-500/20 shadow-md scale-[1.02]'
                  : 'bg-white border-slate-200/90 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300'
              }`}
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
                    className={`w-7 h-7 rounded-lg bg-gradient-to-br ${kpi.gradient} text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-110 transition-transform`}
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
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono border transition-colors ${
                    isCurrentActive
                      ? 'bg-red-600 text-white border-red-600 font-bold animate-pulse'
                      : kpi.badgeBg
                  }`}
                >
                  {isCurrentActive ? 'ফিল্টার সক্রিয়' : 'ক্লিক করুন'}
                </span>
              </div>
            </button>
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
              <span>রক্তের গ্রুপ অনুযায়ী ডোনার ফিল্টার</span>
            </h2>
            <span className="text-xs font-mono font-bold text-slate-500">
              মোট: {totalDonors} জন
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            {(Object.keys(bloodGroupCounts) as BloodGroup[]).map((group) => {
              const count = bloodGroupCounts[group];
              const percent = totalDonors > 0 ? Math.round((count / totalDonors) * 100) : 0;
              const isCurrentActive =
                activeFilter?.type === 'blood_group' && activeFilter.group === group;

              return (
                <button
                  key={group}
                  type="button"
                  onClick={() =>
                    handleSelectFilter({
                      type: 'blood_group',
                      group,
                      title: `রক্তের গ্রুপ: ${group}`,
                      subTitle: `${group} রক্তের গ্রুপের নিবন্ধিত রক্তদাতাবৃন্দ`,
                      badgeColor: 'bg-red-50 text-red-700 border-red-200',
                      navTarget: 'donors',
                    })
                  }
                  className={`p-3 rounded-xl border transition-all text-center group cursor-pointer ${
                    isCurrentActive
                      ? 'bg-red-50 border-red-500 ring-2 ring-red-500/20 shadow-xs scale-105'
                      : 'bg-gradient-to-b from-slate-50 to-slate-100/50 border-slate-200/80 hover:border-red-300 hover:bg-red-50/20 hover:scale-102'
                  }`}
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
                    {isCurrentActive ? 'সক্রিয়' : `${percent}%`}
                  </span>
                </button>
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
              <span>শাখা ও আঞ্চলিক ডোনার ফিল্টার</span>
            </h2>
            <span className="text-xs font-semibold text-slate-500">
              {branches.length}টি সক্রিয় শাখা
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {branches.map((branch) => {
              const branchDonors = donors.filter(
                (d) => d.district === branch.district || d.upazila === branch.upazila
              ).length;
              const pct = totalDonors > 0 ? Math.round((branchDonors / totalDonors) * 100) : 0;
              const isCurrentActive =
                activeFilter?.type === 'branch' && activeFilter.branchName === branch.nameBn;

              return (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() =>
                    handleSelectFilter({
                      type: 'branch',
                      branchName: branch.nameBn,
                      upazila: branch.upazila,
                      district: branch.district,
                      title: `${branch.nameBn} শাখা (${branch.upazila})`,
                      subTitle: `${branch.nameBn} অঞ্চলের নিবন্ধিত ডোনার ও কার্যক্রম`,
                      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                      navTarget: 'donors',
                    })
                  }
                  className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isCurrentActive
                      ? 'bg-indigo-50/60 border-indigo-400 ring-2 ring-indigo-500/20'
                      : 'hover:bg-slate-50 border-transparent hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isCurrentActive ? 'bg-indigo-600 animate-ping' : 'bg-red-500'
                        }`}
                      />
                      <span className="font-bold">{branch.nameBn}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({branch.upazila})
                      </span>
                    </div>
                    <span className="font-mono font-bold text-slate-700">
                      {branchDonors} জন <span className="text-slate-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60 mt-1.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCurrentActive
                          ? 'bg-indigo-600'
                          : 'bg-gradient-to-r from-red-500 to-rose-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Real-time Filter Results Panel */}
      {activeFilter && (
        <div
          ref={resultsRef}
          className="bg-white rounded-2xl border border-red-200/90 shadow-md p-5 sm:p-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 relative overflow-hidden"
        >
          {/* Top Red-Rose Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500" />

          {/* Panel Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-xs">
                <Filter className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200">
                    রিয়েলটাইম ফিল্টার
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                    {activeFilter.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{activeFilter.subTitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              {/* Count Pill */}
              <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                {activeFilter.type === 'requests_active' || activeFilter.type === 'requests_critical'
                  ? `${filteredRequests.length}টি আবেদন`
                  : activeFilter.type === 'donations_all'
                  ? `${filteredDonations.length}টি রক্তদান`
                  : `${filteredDonors.length} জন ডোনার`}
              </span>

              {/* Jump to Full Module */}
              {onNavigateToTab && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab(activeFilter.navTarget)}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 transition-colors cursor-pointer"
                >
                  <span>সম্পূর্ণ মডিউলে যান</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Close / Reset Filter */}
              <button
                type="button"
                onClick={handleClearFilter}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>রিসেট</span>
              </button>
            </div>
          </div>

          {/* Quick Search within Filtered Results */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="এই ফিল্টারের মধ্যে সার্চ করুন (নাম, ফোন, আইডি, এলাকা)..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none transition-all placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* Data Tables Based on Filter Type */}
          {(activeFilter.type === 'donors_all' ||
            activeFilter.type === 'donors_verified' ||
            activeFilter.type === 'donors_pending' ||
            activeFilter.type === 'blood_group' ||
            activeFilter.type === 'branch') && (
            <div className="overflow-x-auto no-scrollbar border border-slate-200/80 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">ডোনার আইডি</th>
                    <th className="py-2.5 px-3">নাম</th>
                    <th className="py-2.5 px-3">রক্তের গ্রুপ</th>
                    <th className="py-2.5 px-3">অবস্থান</th>
                    <th className="py-2.5 px-3">মোবাইল</th>
                    <th className="py-2.5 px-3">স্ট্যাটাস</th>
                    <th className="py-2.5 px-3 text-right">শেষ রক্তদান</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDonors.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        কোনো ডোনার পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredDonors.slice(0, 50).map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                          {d.donorId}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{d.fullName}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            {d.bloodGroup}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {d.area}, {d.upazila}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-mono">{d.phone}</td>
                        <td className="py-2.5 px-3">
                          {d.verificationStatus === 'verified' ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Verified
                            </span>
                          ) : (
                            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium border border-amber-200">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-500 font-mono">
                          {d.lastDonationDate || 'কখনও দেননি'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Blood Requests Table */}
          {(activeFilter.type === 'requests_active' || activeFilter.type === 'requests_critical') && (
            <div className="overflow-x-auto no-scrollbar border border-slate-200/80 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">আইডি</th>
                    <th className="py-2.5 px-3">রোগীর নাম</th>
                    <th className="py-2.5 px-3">রক্তের গ্রুপ</th>
                    <th className="py-2.5 px-3">হাসপাতাল</th>
                    <th className="py-2.5 px-3">জরুরি মাত্রা</th>
                    <th className="py-2.5 px-3">পরিমাণ</th>
                    <th className="py-2.5 px-3 text-right">স্ট্যাটাস</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        কোনো রক্তের আবেদন পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.slice(0, 50).map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                          {r.requestId}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{r.patientName}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            {r.bloodGroup}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 truncate max-w-[160px]">
                          {r.hospital}
                        </td>
                        <td className="py-2.5 px-3">
                          {r.emergencyLevel === 'CRITICAL' ? (
                            <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded font-bold border border-red-200 inline-flex items-center gap-1">
                              <Flame className="w-3 h-3 text-red-600" />
                              CRITICAL
                            </span>
                          ) : (
                            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium border border-amber-200">
                              {r.emergencyLevel}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">
                          {r.requiredUnits} ব্যাগ
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded font-semibold capitalize ${
                              r.status === 'active'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : r.status === 'matched'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Donations Table */}
          {activeFilter.type === 'donations_all' && (
            <div className="overflow-x-auto no-scrollbar border border-slate-200/80 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">ডোনেশন আইডি</th>
                    <th className="py-2.5 px-3">ডোনার নাম</th>
                    <th className="py-2.5 px-3">রক্তের গ্রুপ</th>
                    <th className="py-2.5 px-3">হাসপাতাল</th>
                    <th className="py-2.5 px-3">তারিখ</th>
                    <th className="py-2.5 px-3 text-right">যাচাইকারী</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDonations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                        কোনো রক্তদান হিস্ট্রি পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredDonations.slice(0, 50).map((dn) => (
                      <tr key={dn.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                          {dn.id}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{dn.donorName}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            {dn.bloodGroup}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 truncate max-w-[180px]">
                          {dn.hospital}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-mono">{dn.donationDate}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-700">
                          {dn.verifiedBy || 'ভেরিফাইড'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


