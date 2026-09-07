import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Droplets,
  AlertCircle,
  Download,
  Calendar,
  CheckCircle2,
  MapPin,
  Heart,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Printer,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Activity
} from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useOrgConfig } from '../../../contexts/OrgConfigContext';
import { useDialog } from '../../../contexts/DialogContext';
import {
  calculateBloodSupplyDemandIndex,
  calculateFulfillmentMetrics,
  calculateRegionalAnalytics,
  calculateFinancialAnalytics,
  generateComprehensiveReport,
  type BloodGroupSupplyDemand
} from '../../../services/analyticsService';
import type { BloodGroup } from '../../../types';

export const AdminAnalyticsTab: React.FC = () => {
  const {
    donors,
    bloodRequests,
    donations,
    fundDonations,
    fundDisbursements,
    branches,
    locations,
  } = useData();
  const { config } = useOrgConfig();
  const dialog = useDialog();

  const [timeWindow, setTimeWindow] = useState<'7d' | '30d' | '90d' | 'all'>('all');

  // Filter requests & donations by selected time window if needed
  const filterByDate = (dateStr: string) => {
    if (timeWindow === 'all') return true;
    const itemDate = new Date(dateStr).getTime();
    const now = Date.now();
    const days = timeWindow === '7d' ? 7 : timeWindow === '30d' ? 30 : 90;
    return now - itemDate <= days * 24 * 60 * 60 * 1000;
  };

  const filteredRequests = bloodRequests.filter((r) => filterByDate(r.createdAt));
  const filteredDonations = donations.filter((d) => filterByDate(d.donationDate));
  const filteredFundDonations = fundDonations.filter((d) => filterByDate(d.createdAt));
  const filteredDisbursements = fundDisbursements.filter((d) => filterByDate(d.date));

  // Run analytics engine
  const supplyDemandIndex = calculateBloodSupplyDemandIndex(donors, filteredRequests);
  const fulfillmentMetrics = calculateFulfillmentMetrics(filteredRequests);
  const regionalAnalytics = calculateRegionalAnalytics(donors, filteredRequests, filteredDonations, branches);
  const financialMetrics = calculateFinancialAnalytics(filteredFundDonations, filteredDisbursements);

  const criticalGroups = supplyDemandIndex.filter((s) => s.shortageLevel === 'CRITICAL_SHORTAGE');
  const moderateShortageGroups = supplyDemandIndex.filter((s) => s.shortageLevel === 'MODERATE_SHORTAGE');

  const handleExportJSON = () => {
    const report = generateComprehensiveReport({
      donors,
      requests: filteredRequests,
      donations: filteredDonations,
      fundDonations: filteredFundDonations,
      fundDisbursements: filteredDisbursements,
      branches,
      timeWindow,
    });

    const jsonStr = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roktobondon_analytics_report_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    dialog.alert({
      title: 'রিপোর্ট এক্সপোর্ট সফল',
      message: 'সম্পূর্ণ এনালিটিক্স ও পারফরম্যান্স রিপোর্ট JSON ফাইলে ডাউনলোড হয়েছে।',
      theme: 'success',
    });
  };

  const handleExportCSV = () => {
    // Generate CSV for Blood Group Supply-Demand Matrix
    let csv = 'Blood Group,Total Donors,Available Donors,Request Count,Fulfilled Count,Shortage Level,Ratio\n';
    supplyDemandIndex.forEach((s) => {
      csv += `"${s.group}",${s.donorCount},${s.availableDonors},${s.requestCount},${s.fulfilledCount},"${s.shortageLevel}",${s.ratio}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roktobondon_supply_demand_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    dialog.alert({
      title: 'CSV এক্সপোর্ট সফল',
      message: 'রক্তের গ্রুপভিত্তিক সাপ্লাই-ডিমান্ড ইনডেক্স CSV আকারে ডাউনলোড হয়েছে।',
      theme: 'success',
    });
  };

  const getShortageBadge = (level: BloodGroupSupplyDemand['shortageLevel']) => {
    switch (level) {
      case 'CRITICAL_SHORTAGE':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300 animate-pulse">
            🚨 তীব্র সংকট
          </span>
        );
      case 'MODERATE_SHORTAGE':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            ⚠️ ঘাটতি
          </span>
        );
      case 'SURPLUS':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            ✓ পর্যাপ্ত
          </span>
        );
      case 'BALANCED':
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            ● স্বাভাবিক
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-red-600" />
            এনালিটিক্স ও অপারেশনাল রিপোর্টিং ইঞ্জিন
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            রক্তের চাহিদা-সরবরাহ অনুপাত, রিকোয়েস্ট সমাধান হার ও আঞ্চলিক পারফরম্যান্স রিপোর্ট
          </p>
        </div>

        {/* Time Window Buttons & Export */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTimeWindow('7d')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                timeWindow === '7d' ? 'bg-white text-red-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ৭ দিন
            </button>
            <button
              type="button"
              onClick={() => setTimeWindow('30d')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                timeWindow === '30d' ? 'bg-white text-red-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ৩০ দিন
            </button>
            <button
              type="button"
              onClick={() => setTimeWindow('90d')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                timeWindow === '90d' ? 'bg-white text-red-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ৩ মাস
            </button>
            <button
              type="button"
              onClick={() => setTimeWindow('all')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                timeWindow === 'all' ? 'bg-white text-red-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              সর্বকালীন
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 flex items-center gap-1 transition-colors"
              title="CSV ডাটা ডাউনলোড"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              CSV
            </button>
            <button
              type="button"
              onClick={handleExportJSON}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs border border-red-700/60 flex items-center gap-1 transition-colors"
              title="সম্পূর্ণ রিপোর্ট ডাউনলোড"
            >
              <Download className="w-3.5 h-3.5" />
              রিপোর্ট এক্সপোর্ট
            </button>
          </div>
        </div>
      </div>

      {/* Critical Shortage Alert Banner (If Any) */}
      {criticalGroups.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-900 text-xs">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <div className="flex-1">
            <span className="font-bold">সতর্কবার্তা: তীব্র রক্তের সংকট দেখা দিয়েছে!</span>
            <p className="text-red-700 text-[11px] mt-0.5">
              বর্তমানে রক্তের গ্রুপ <strong className="font-mono font-bold text-red-900">{criticalGroups.map((c) => c.group).join(', ')}</strong> এর চাহিদা অনুপাতে পর্যাপ্ত সক্রিয় ডোনার নেই। অনতিবিলম্বে ব্রডকাস্ট ক্যাম্পেইন পরিচালনার পরামর্শ দেওয়া হচ্ছে।
            </p>
          </div>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">রিকোয়েস্ট সমাধান হার</span>
          <span className="text-2xl font-black text-emerald-600 block mt-1 tracking-tight font-mono">
            {fulfillmentMetrics.fulfillmentRate}%
          </span>
          <span className="text-[10px] text-slate-500">
            {fulfillmentMetrics.fulfilledRequests} / {fulfillmentMetrics.totalRequests} টি সম্পন্ন
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">জরুরি ক্রাইসিস সমাধান</span>
          <span className="text-2xl font-black text-red-600 block mt-1 tracking-tight font-mono">
            {fulfillmentMetrics.emergencyFulfillmentRate}%
          </span>
          <span className="text-[10px] text-slate-500">ক্রিটিক্যাল কেস সমাধান</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">রক্তদান সরবরাহ ভলিউম</span>
          <span className="text-2xl font-black text-purple-600 block mt-1 tracking-tight font-mono">
            {filteredDonations.reduce((sum, d) => sum + d.units, 0)} ব্যাগ
          </span>
          <span className="text-[10px] text-slate-500">মোট সফল পরিসঞ্চালন</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">চলতি রিজার্ভ তহবিল</span>
          <span className={`text-2xl font-black block mt-1 tracking-tight font-mono ${financialMetrics.netReserve >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            ৳ {financialMetrics.netReserve.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500">রোগী সহায়তা তহবিল উদ্বৃত্ত</span>
        </div>
      </div>

      {/* Section 1: Blood Group Supply vs Demand Matrix */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Droplets className="w-4 h-4 text-red-600" />
              রক্তের গ্রুপভিত্তিক চাহিদা ও সরবরাহ ম্যাট্রিক্স (Supply-Demand Index)
            </h3>
            <p className="text-xs text-slate-500">
              প্রতিটি গ্রুপের বর্তমান সক্রিয় ডোনার সংখ্যা বনাম আবেদন ভলিউমের ভারসাম্য বিশ্লেষণ
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {supplyDemandIndex.map((s) => (
            <div
              key={s.group}
              className={`p-3.5 rounded-xl border transition-all ${
                s.shortageLevel === 'CRITICAL_SHORTAGE'
                  ? 'border-red-300 bg-red-50/50'
                  : s.shortageLevel === 'MODERATE_SHORTAGE'
                  ? 'border-amber-300 bg-amber-50/50'
                  : 'border-slate-200 bg-slate-50/70'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-black text-lg font-mono text-slate-900">{s.group}</span>
                {getShortageBadge(s.shortageLevel)}
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200/80 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>সক্রিয় রক্তদাতা:</span>
                  <strong className="font-mono text-emerald-700">{s.availableDonors} জন</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>চাহিদা / আবেদন:</span>
                  <strong className="font-mono text-red-700">{s.requestCount} টি</strong>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px] pt-1">
                  <span>অনুপাত সূচক:</span>
                  <span className="font-mono font-bold text-slate-800">{s.ratio}x</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Regional Performance & Financial Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Regional Performance Table */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-600" />
            আঞ্চলিক কভারেজ ও কার্যকারিতা বিশ্লেষণ
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-y border-slate-200 text-slate-600">
                <tr>
                  <th className="py-2 px-2.5 font-semibold">শাখা / উপজেলা</th>
                  <th className="py-2 px-2.5 font-semibold">ডোনার সংখ্যা</th>
                  <th className="py-2 px-2.5 font-semibold">আবেদন</th>
                  <th className="py-2 px-2.5 font-semibold text-right">সমাধানের হার</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {regionalAnalytics.map((reg) => (
                  <tr key={reg.regionName} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-2.5 font-semibold text-slate-900">{reg.regionName}</td>
                    <td className="py-2.5 px-2.5 font-mono text-slate-700">{reg.donorCount} জন</td>
                    <td className="py-2.5 px-2.5 font-mono text-slate-700">{reg.requestCount} টি</td>
                    <td className="py-2.5 px-2.5 text-right font-mono font-bold text-emerald-600">
                      {reg.fulfillmentRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Flow & Patient Assistance */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-600" />
            আর্থিক তহবিল সংগ্রহ বনাম রোগী সহায়তা অনুপাত
          </h3>
          <div className="space-y-4 pt-1">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600 font-semibold">মোট সংগ্রহ:</span>
                <span className="font-mono font-bold text-emerald-700">৳ {financialMetrics.totalCollected.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-semibold">রোগী সহায়তা ব্যয়:</span>
                <span className="font-mono font-bold text-red-700">৳ {financialMetrics.totalDisbursed.toLocaleString()}</span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-600 h-full"
                  style={{
                    width: `${Math.min(100, Math.max(0, financialMetrics.totalCollected > 0 ? (financialMetrics.netReserve / financialMetrics.totalCollected) * 100 : 100))}%`
                  }}
                  title="রিজার্ভ তহবিল"
                />
                <div
                  className="bg-red-600 h-full"
                  style={{
                    width: `${Math.min(100, Math.max(0, financialMetrics.totalCollected > 0 ? (financialMetrics.totalDisbursed / financialMetrics.totalCollected) * 100 : 0))}%`
                  }}
                  title="ব্যয়িত তহবিল"
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>সবুজ: উদ্বৃত্ত তহবিল</span>
                <span>লাল: রোগী সহায়তায় ব্যয়</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <span className="text-[11px] text-slate-400 block">গড় অনুদান পরিমাণ</span>
                <span className="font-mono font-bold text-slate-900 text-base mt-1 block">
                  ৳ {financialMetrics.averageDonationAmount.toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <span className="text-[11px] text-slate-400 block">মোট ব্যয় ভাউচার</span>
                <span className="font-mono font-bold text-slate-900 text-base mt-1 block">
                  {financialMetrics.disbursementCount} টি
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
