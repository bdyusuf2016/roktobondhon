import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Droplets,
  Heart,
  ShieldCheck,
  PhoneCall,
  Clock,
  ArrowRight,
  CheckCircle,
  MapPin,
  Building2,
  Users,
  Award,
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useOrgConfig } from '../contexts/OrgConfigContext';
import { BloodRequestCard } from '../components/BloodRequestCard';
import { DonorCard } from '../components/DonorCard';
import { SearchableSelect } from '../components/common/SearchableSelect';
import type { BloodGroup } from '../types';
import { BANGLADESH_DISTRICTS, getUpazilasForDistrict } from '../data/bangladeshGeoData';

const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { config } = useOrgConfig();
  const { donors, bloodRequests, donations, branches } = useData();

  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedUpazila, setSelectedUpazila] = useState<string>('');

  const availableUpazilas = useMemo(() => {
    return selectedDistrict ? getUpazilasForDistrict(selectedDistrict) : [];
  }, [selectedDistrict]);

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (selectedGroup) params.set('group', selectedGroup);
    if (selectedDistrict) params.set('district', selectedDistrict);
    if (selectedUpazila) params.set('upazila', selectedUpazila);
    navigate(`/find-blood?${params.toString()}`);
  };

  // Metrics
  const verifiedDonorsCount = donors.filter((d) => d.verificationStatus === 'verified').length;
  const activeRequests = bloodRequests.filter((r) => r.status === 'active' || r.status === 'matched');
  const criticalRequests = bloodRequests.filter((r) => r.emergencyLevel === 'CRITICAL' && r.status === 'active');
  const recentVerifiedDonors = donors.filter((d) => d.verificationStatus === 'verified').slice(0, 4);

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section with High-Impact Emergency Form */}
      <section className="relative overflow-hidden bg-slate-950 text-white pt-10 pb-20 px-4 sm:px-6 lg:px-8 border-b border-slate-850 geometric-grid-subtle">
        {/* Background graphic motif */}
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-red-600 blur-3xl"></div>
          <div className="absolute -left-24 -bottom-24 w-96 h-96 rounded-full bg-slate-700 blur-3xl"></div>
        </div>

        <div className="relative max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-700 text-xs font-semibold tracking-wide text-slate-200">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            ধামরাই • সাভার • মানিকগঞ্জ সহ সারা বাংলাদেশ স্বেচ্ছাসেবী নেটওয়ার্ক
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            রক্তের বন্ধনে বাঁচুক প্রতিটি জীবন
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {config.sloganBn}। আপনার প্রয়োজনে দ্রুততম সময়ে নিরাপদ রক্তদাতা খুঁজে নিন।
          </p>

          {/* Quick Smart Search Box */}
          <div className="max-w-4xl mx-auto bg-white rounded-xl p-4 sm:p-6 shadow-xl text-slate-900 border border-slate-200 text-left">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-1.5">
              <Search className="w-4 h-4 text-red-600" />
              তাৎক্ষণিক রক্তদাতা অনুসন্ধান
            </h2>

            <form onSubmit={handleQuickSearch} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Blood Group */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  রক্তের গ্রুপ
                </label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm font-bold text-red-700 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-600 focus:border-red-600 focus:outline-hidden font-mono"
                >
                  <option value="">সকল গ্রুপ</option>
                  {BLOOD_GROUPS.map((g) => (
                    <option key={g} value={g}>{g} গ্রুপ</option>
                  ))}
                </select>
              </div>

              {/* District */}
              <div>
                <SearchableSelect
                  label="জেলা"
                  placeholder="সকল জেলা"
                  searchPlaceholder="জেলা সার্চ করুন..."
                  allOptionLabel="সকল জেলা (৬৪ জেলা)"
                  value={selectedDistrict}
                  onChange={(val) => {
                    setSelectedDistrict(val);
                    setSelectedUpazila('');
                  }}
                  options={BANGLADESH_DISTRICTS.map((d) => ({
                    value: d.nameBn,
                    label: `${d.nameBn} (${d.nameEn})`,
                    subLabel: d.nameEn,
                  }))}
                />
              </div>

              {/* Upazila */}
              <div>
                <SearchableSelect
                  label="উপজেলা"
                  placeholder={selectedDistrict ? 'সকল উপজেলা' : 'প্রথমে জেলা নির্বাচন করুন'}
                  searchPlaceholder="উপজেলা সার্চ করুন..."
                  allOptionLabel={selectedDistrict ? 'সকল উপজেলা' : undefined}
                  disabled={!selectedDistrict}
                  value={selectedUpazila}
                  onChange={(val) => setSelectedUpazila(val)}
                  options={availableUpazilas.map((upa) => ({
                    value: upa,
                    label: upa,
                  }))}
                />
              </div>

              {/* Action Button */}
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-sm border border-red-700/60 flex items-center justify-center gap-2 transition-transform active:scale-98"
                >
                  <Search className="w-4 h-4" />
                  অনুসন্ধান করুন
                </button>
              </div>
            </form>

            {/* Quick blood group chips */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-500 font-medium mr-1">গ্রুপ অনুযায়ী দেখুন:</span>
              {BLOOD_GROUPS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => navigate(`/find-blood?group=${encodeURIComponent(g)}`)}
                  className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-slate-100 hover:bg-red-50 text-slate-800 hover:text-red-700 border border-slate-200 transition-colors"
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/request-blood"
              className="px-5 py-3 rounded-lg bg-red-600 text-white hover:bg-red-700 font-bold text-sm shadow-md border border-red-700/60 transition-colors flex items-center gap-2"
            >
              <Droplets className="w-4 h-4 text-white" />
              জরুরি রক্তের আবেদন করুন
            </Link>
            <Link
              to="/become-donor"
              className="px-5 py-3 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-700 font-bold text-sm backdrop-blur-xs transition-colors flex items-center gap-2"
            >
              <Heart className="w-4 h-4 text-red-500" />
              রক্তদাতা হিসেবে যুক্ত হোন
            </Link>
          </div>
        </div>
      </section>

      {/* Impact Statistics */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/90 shadow-xs text-center">
            <span className="text-2xl sm:text-3xl font-mono font-black text-red-600 block">
              {donors.length}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-slate-800 mt-1 block">
              নিবন্ধিত রক্তদাতা
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {verifiedDonorsCount} জন ভেরিফাইড
            </span>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/90 shadow-xs text-center">
            <span className="text-2xl sm:text-3xl font-mono font-black text-emerald-600 block">
              {donations.length}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-slate-800 mt-1 block">
              সফল রক্তদান
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              জীবনের প্রয়োজনে পাশে
            </span>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/90 shadow-xs text-center">
            <span className="text-2xl sm:text-3xl font-mono font-black text-amber-600 block">
              {activeRequests.length}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-slate-800 mt-1 block">
              চলমান রক্তের আবেদন
            </span>
            <span className="text-[11px] text-red-600 font-medium block mt-0.5">
              {criticalRequests.length} টি জরুরি
            </span>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/90 shadow-xs text-center">
            <span className="text-2xl sm:text-3xl font-mono font-black text-indigo-600 block">
              {branches.length > 0 ? `${branches.length} টি` : 'সক্রিয়'}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-slate-800 mt-1 block">
              সক্রিয় শাখা
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              কালামপুর • ধামরাই • সাভার • মানিকগঞ্জ
            </span>
          </div>
        </div>
      </section>

      {/* New Interactive Feature Cards: Camps, Certificate, AI Screener */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Blood Camps */}
          <Link
            to="/camps"
            className="group relative bg-gradient-to-br from-red-600 to-rose-700 text-white rounded-3xl p-6 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between"
          >
            <div className="space-y-2 relative z-10">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-white/20 uppercase tracking-wider">
                🎪 বিশেষ ইভেন্ট
              </span>
              <h3 className="text-xl font-black text-white pt-2">স্বেচ্ছায় রক্তদান ক্যাম্প</h3>
              <p className="text-xs text-rose-100 leading-relaxed">
                ধামরাই, সাভার ও মানিকগঞ্জে আয়োজিত আসন্ন ব্লাড ড্রাইভ ও ক্যাম্পে রক্ত দিতে প্রি-রেজিস্ট্রেশন করুন।
              </p>
            </div>
            <div className="pt-6 flex items-center justify-between text-xs font-bold text-white relative z-10">
              <span>ক্যাম্প সূচি দেখুন</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 2: Certificate & Badges */}
          <Link
            to="/certificate"
            className="group relative bg-gradient-to-br from-amber-600 to-orange-700 text-white rounded-3xl p-6 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between"
          >
            <div className="space-y-2 relative z-10">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-white/20 uppercase tracking-wider">
                🏆 ডিজিটাল সম্মাননা
              </span>
              <h3 className="text-xl font-black text-white pt-2">রক্তদাতা সার্টিফিকেট ও ব্যাজ</h3>
              <p className="text-xs text-amber-100 leading-relaxed">
                আপনার রক্তদানের সংখ্যা অনুযায়ী অফিশিয়াল প্রশংসাপত্র ও স্মার্ট ডোনার আইডি কার্ড ডাউনলোড করুন।
              </p>
            </div>
            <div className="pt-6 flex items-center justify-between text-xs font-bold text-white relative z-10">
              <span>সনদপত্র সংগ্রহ করুন</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 3: AI Health Screener */}
          <Link
            to="/health-checker"
            className="group relative bg-gradient-to-br from-indigo-700 to-slate-900 text-white rounded-3xl p-6 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between"
          >
            <div className="space-y-2 relative z-10">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-white/20 uppercase tracking-wider">
                ✨ Gemini AI চালিত
              </span>
              <h3 className="text-xl font-black text-white pt-2">AI রক্তদান যোগ্যতা চেকার</h3>
              <p className="text-xs text-indigo-100 leading-relaxed">
                মাত্র ১ মিনিটে স্বাস্থ্য প্রশ্নের উত্তর দিয়ে নিশ্চিত হোন আপনি আজ রক্তদানের জন্য প্রস্তুত কিনা।
              </p>
            </div>
            <div className="pt-6 flex items-center justify-between text-xs font-bold text-white relative z-10">
              <span>স্বাস্থ্য পরীক্ষা করুন</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </section>

      {/* Live Blood Requests Stream */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                জরুরি রক্তের আবেদনসমূহ
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              হাসপাতালে ভর্তি রোগীদের জরুরি প্রয়োজনে এগিয়ে আসুন
            </p>
          </div>
          <Link
            to="/find-blood"
            className="text-xs sm:text-sm font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
          >
            সব দেখুন ({bloodRequests.length})
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeRequests.slice(0, 6).map((req) => (
            <BloodRequestCard key={req.id} request={req} />
          ))}
        </div>
      </section>

      {/* Our Chapters & Coverage */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-950 text-white rounded-2xl p-6 sm:p-10 relative overflow-hidden border border-slate-850">
          <div className="max-w-3xl space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-red-500">
              শাখা ও কার্যক্রম
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              ধামরাই, সাভার ও মানিকগঞ্জে নিবেদিতপ্রাণ স্বেচ্ছাসেবী টিম
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              প্রতিটি উপজেলায় আমাদের স্থানীয় সমন্বয়ক ও ভলান্টিয়ার টিম কাজ করছেন। হাসপাতালগুলোতে সঠিক সময়ে রক্তদাতার উপস্থিতি নিশ্চিত করতে আমরা সর্বদা প্রস্তুত।
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
              {branches.map((b) => (
                <div
                  key={b.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-1 text-xs"
                >
                  <p className="font-bold text-white text-sm">{b.nameBn}</p>
                  <p className="text-slate-400">{b.district} • {b.upazila}</p>
                  <div className="pt-2 flex items-center justify-between border-t border-slate-800 text-[11px]">
                    <span className="text-slate-300">{b.coordinatorName}</span>
                    <a href={`tel:${b.coordinatorPhone}`} className="text-red-400 font-bold hover:underline font-mono">
                      কল
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Recent Verified Donors */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              নিকটবর্তী ভেরিফাইড রক্তদাতা
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              নিরাপত্তা রক্ষার্থে পূর্ণ ঠিকানা ও ব্যক্তিগত তথ্য সুরক্ষিত
            </p>
          </div>
          <Link
            to="/find-blood"
            className="text-xs sm:text-sm font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
          >
            ডোনার ডিরেক্টরি
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {recentVerifiedDonors.map((donor) => (
            <DonorCard key={donor.id} donor={donor} />
          ))}
        </div>
      </section>

      {/* Safe Blood Donation Educational Guidance */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-100 border border-slate-200 rounded-2xl p-6 sm:p-8">
          <div className="text-center max-w-2xl mx-auto space-y-2 mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              রক্তদানের যোগ্যতা ও জরুরি তথ্য
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              রক্তদান একটি সম্পূর্ণ নিরাপদ প্রক্রিয়া যা হৃদরোগের ঝুঁকি কমায় ও নতুন রক্তকণিকা তৈরিতে সহায়তা করে
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-700">
            <div className="bg-white p-5 rounded-xl border border-slate-200/90 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm">
                ১
              </div>
              <h3 className="font-bold text-sm text-slate-900">শারীরিক যোগ্যতা</h3>
              <p className="text-slate-600 leading-relaxed">
                বয়স ১৮ থেকে ৬০ বছর এবং ওজন কমপক্ষে ৫০ কেজি (পুরুষ) অথবা ৪৫ কেজি (নারী) হতে হবে।
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/90 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm">
                ২
              </div>
              <h3 className="font-bold text-sm text-slate-900">রক্তদানের বিরতি</h3>
              <p className="text-slate-600 leading-relaxed">
                একবার রক্তদানের পর পুরুষরা ৩ মাস এবং নারীরা ৪ মাস পর পুনরায় রক্তদান করতে পারবেন।
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/90 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm">
                ৩
              </div>
              <h3 className="font-bold text-sm text-slate-900">প্রস্তুতি ও সতর্কতা</h3>
              <p className="text-slate-600 leading-relaxed">
                রক্তদানের আগে পর্যাপ্ত পানি পান করুন, পুষ্টিকর খাবার খান এবং ভালো ঘুম নিশ্চিত করুন।
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
