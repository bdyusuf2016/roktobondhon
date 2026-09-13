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
  LayoutGrid,
  List,
  Sparkles,
  Activity,
  ChevronDown,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useOrgConfig } from '../contexts/OrgConfigContext';
import { BloodRequestCard } from '../components/BloodRequestCard';
import { DonorCard } from '../components/DonorCard';
import { SearchableSelect } from '../components/common/SearchableSelect';
import type { BloodGroup } from '../types';
import { BANGLADESH_DISTRICTS, getUpazilasForDistrict } from '../data/bangladeshGeoData';
import { toBengaliNumber } from '../utils/bengali';

const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function formatDonationDateBn(dateStr?: string): string {
  if (!dateStr) return 'তারিখ উল্লেখ নেই';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = toBengaliNumber(d.getDate());
    const monthsBn = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];
    const month = monthsBn[d.getMonth()];
    const year = toBengaliNumber(d.getFullYear());
    return `${day} ${month}, ${year}`;
  } catch {
    return dateStr;
  }
}

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
  const [visibleVerifiedCount, setVisibleVerifiedCount] = useState(8);
  const verifiedDonorsCount = donors.filter((d) => d.verificationStatus === 'verified').length;
  const activeRequests = bloodRequests.filter((r) => r.status === 'active' || r.status === 'matched');
  const criticalRequests = bloodRequests.filter((r) => r.emergencyLevel === 'CRITICAL' && r.status === 'active');
  const recentVerifiedDonors = donors.filter((d) => d.verificationStatus === 'verified').slice(0, visibleVerifiedCount);

  // Successful Donations Section State
  const [visibleDonationsCount, setVisibleDonationsCount] = useState(6);
  const [donationGroupFilter, setDonationGroupFilter] = useState<string>('all');

  const filteredDonations = useMemo(() => {
    return donations.filter((don) => {
      if (donationGroupFilter !== 'all' && don.bloodGroup !== donationGroupFilter) return false;
      return true;
    });
  }, [donations, donationGroupFilter]);

  const recentDonations = useMemo(() => {
    return filteredDonations.slice(0, visibleDonationsCount);
  }, [filteredDonations, visibleDonationsCount]);

  // Smooth Interactive Section Scroll with subtle highlight pulse
  const scrollToSection = (sectionId: string, pulseClass: string = 'ring-4 ring-red-500/40') => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const classes = pulseClass.split(' ');
      el.classList.add(...classes, 'transition-all', 'duration-700', 'rounded-3xl');
      setTimeout(() => {
        el.classList.remove(...classes);
      }, 2500);
    }
  };

  // Live Blood Group Dashboard State & Computations
  const [activeDashboardGroup, setActiveDashboardGroup] = useState<BloodGroup | 'all'>('A+');
  const [summaryViewMode, setSummaryViewMode] = useState<'grid' | 'list'>('grid');

  const bloodGroupStats = useMemo(() => {
    return BLOOD_GROUPS.map((group) => {
      const gDonors = donors.filter(
        (d) => d.bloodGroup.trim().toUpperCase() === group
      );
      const availableCount = gDonors.filter((d) => d.availability).length;
      const requestsCount = bloodRequests.filter(
        (r) =>
          r.bloodGroup.trim().toUpperCase() === group &&
          (r.status === 'active' || r.status === 'matched')
      ).length;
      return {
        group,
        total: gDonors.length,
        available: availableCount,
        requests: requestsCount,
      };
    });
  }, [donors, bloodRequests]);

  const dashboardDonorsList = useMemo(() => {
    if (!activeDashboardGroup || activeDashboardGroup === 'all') {
      return donors.filter((d) => d.availability).slice(0, 8);
    }
    return donors.filter(
      (d) =>
        d.bloodGroup.trim().toUpperCase() === activeDashboardGroup && d.availability
    );
  }, [donors, activeDashboardGroup]);

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

      {/* Impact Statistics - Interactive Clickable Quick Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. নিবন্ধিত রক্তদাতা */}
          <button
            type="button"
            onClick={() => scrollToSection('donors-section', 'ring-4 ring-red-500/40')}
            title="নিবন্ধিত রক্তদাতাদের লাইভ ড্যাশবোর্ড দেখুন"
            className="group bg-white rounded-xl p-4 sm:p-5 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-red-400 hover:-translate-y-1 transition-all text-center cursor-pointer active:scale-98 relative overflow-hidden flex flex-col justify-between"
          >
            <div className="flex items-center justify-center gap-1.5 mb-1 text-red-500">
              <Users className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-red-600 transition-colors">ডোনার ডিরেক্টরি</span>
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-mono font-black text-red-600 block group-hover:scale-105 transition-transform">
                {toBengaliNumber(donors.length)}
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-800 mt-1 block group-hover:text-red-700 transition-colors">
                নিবন্ধিত রক্তদাতা
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                {toBengaliNumber(verifiedDonorsCount)} জন ভেরিফাইড
              </span>
            </div>
            <span className="inline-flex items-center justify-center gap-1 text-[11px] font-bold text-red-600 opacity-85 group-hover:opacity-100 mt-2.5 bg-red-50 py-0.5 px-2 rounded-md">
              তালিকা দেখুন ↓
            </span>
          </button>

          {/* 2. সফল রক্তদান */}
          <button
            type="button"
            onClick={() => scrollToSection('successful-donations', 'ring-4 ring-emerald-500/40')}
            title="সফল রক্তদানের ইতিহাস ও তালিকা দেখুন"
            className="group bg-white rounded-xl p-4 sm:p-5 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-emerald-400 hover:-translate-y-1 transition-all text-center cursor-pointer active:scale-98 relative overflow-hidden flex flex-col justify-between"
          >
            <div className="flex items-center justify-center gap-1.5 mb-1 text-emerald-500">
              <Award className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-emerald-600 transition-colors">রক্তদান ইতিহাস</span>
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-mono font-black text-emerald-600 block group-hover:scale-105 transition-transform">
                {toBengaliNumber(donations.length)}
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-800 mt-1 block group-hover:text-emerald-700 transition-colors">
                সফল রক্তদান
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                জীবনের প্রয়োজনে পাশে
              </span>
            </div>
            <span className="inline-flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-600 opacity-85 group-hover:opacity-100 mt-2.5 bg-emerald-50 py-0.5 px-2 rounded-md">
              ইতিহাস দেখুন ↓
            </span>
          </button>

          {/* 3. চলমান রক্তের আবেদন */}
          <button
            type="button"
            onClick={() => scrollToSection('urgent-requests', 'ring-4 ring-amber-500/40')}
            title="চলমান জরুরি রক্তের আবেদনসমূহ দেখুন"
            className="group bg-white rounded-xl p-4 sm:p-5 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-amber-400 hover:-translate-y-1 transition-all text-center cursor-pointer active:scale-98 relative overflow-hidden flex flex-col justify-between"
          >
            <div className="flex items-center justify-center gap-1.5 mb-1 text-amber-500">
              <Droplets className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-amber-600 transition-colors">লাইভ ফিড</span>
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-mono font-black text-amber-600 block group-hover:scale-105 transition-transform">
                {toBengaliNumber(activeRequests.length)}
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-800 mt-1 block group-hover:text-amber-700 transition-colors">
                চলমান রক্তের আবেদন
              </span>
              <span className="text-[11px] text-red-600 font-medium block mt-0.5">
                {toBengaliNumber(criticalRequests.length)} টি জরুরি
              </span>
            </div>
            <span className="inline-flex items-center justify-center gap-1 text-[11px] font-bold text-amber-700 opacity-85 group-hover:opacity-100 mt-2.5 bg-amber-50 py-0.5 px-2 rounded-md">
              আবেদন দেখুন ↓
            </span>
          </button>

          {/* 4. সক্রিয় শাখা */}
          <button
            type="button"
            onClick={() => scrollToSection('branches-section', 'ring-4 ring-indigo-500/40')}
            title="শাখা ও সমন্বয়ক টিমের বিবরণ দেখুন"
            className="group bg-white rounded-xl p-4 sm:p-5 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-indigo-400 hover:-translate-y-1 transition-all text-center cursor-pointer active:scale-98 relative overflow-hidden flex flex-col justify-between"
          >
            <div className="flex items-center justify-center gap-1.5 mb-1 text-indigo-500">
              <MapPin className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-indigo-600 transition-colors">শাখা কার্যালয়</span>
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-mono font-black text-indigo-600 block group-hover:scale-105 transition-transform">
                {branches.length > 0 ? `${toBengaliNumber(branches.length)} টি` : 'সক্রিয়'}
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-800 mt-1 block group-hover:text-indigo-700 transition-colors">
                সক্রিয় শাখা
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                কালামপুর • ধামরাই • সাভার • মানিকগঞ্জ
              </span>
            </div>
            <span className="inline-flex items-center justify-center gap-1 text-[11px] font-bold text-indigo-600 opacity-85 group-hover:opacity-100 mt-2.5 bg-indigo-50 py-0.5 px-2 rounded-md">
              সমন্বয়ক টিম ↓
            </span>
          </button>
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
      <section id="urgent-requests" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
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
            সব দেখুন ({toBengaliNumber(bloodRequests.length)})
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeRequests.slice(0, 6).map((req) => (
            <BloodRequestCard key={req.id} request={req} />
          ))}
        </div>
      </section>

      {/* Blood Group Summary Live Dashboard & Interactive Filter */}
      <section id="donors-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 scroll-mt-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-red-100 text-red-600">
                <Activity className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                রক্তের গ্রুপভিত্তিক লাইভ ড্যাশবোর্ড
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              রক্তদাতাদের তাৎক্ষণিক প্রাপ্যতা ও জরুরি আবেদন — যেকোনো গ্রুপে ক্লিক করে সরাসরি ফিল্টার তালিকা দেখুন
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveDashboardGroup('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeDashboardGroup === 'all'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              সকল গ্রুপ ({toBengaliNumber(donors.filter((d) => d.availability).length)} জন প্রস্তুত)
            </button>

            <Link
              to={activeDashboardGroup && activeDashboardGroup !== 'all' ? `/find-blood?group=${encodeURIComponent(activeDashboardGroup)}` : '/find-blood'}
              className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 shrink-0 ml-1"
            >
              <span>সম্পূর্ণ তালিকা</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 8 Blood Group Summary Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {bloodGroupStats.map((stat) => {
            const isSelected = activeDashboardGroup === stat.group;
            return (
              <button
                key={stat.group}
                type="button"
                onClick={() => setActiveDashboardGroup(isSelected ? 'all' : stat.group)}
                className={`relative p-3 sm:p-3.5 rounded-2xl border transition-all text-center cursor-pointer group flex flex-col justify-between ${
                  isSelected
                    ? 'bg-gradient-to-b from-red-50 to-white border-red-500 shadow-md ring-2 ring-red-500/30 scale-102 -translate-y-0.5'
                    : 'bg-white hover:bg-slate-50/80 border-slate-200/90 shadow-2xs hover:border-red-300 hover:shadow-xs'
                }`}
              >
                {stat.requests > 0 && (
                  <span className="absolute -top-2 -right-1.5 px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-mono font-black animate-pulse shadow-xs">
                    {toBengaliNumber(stat.requests)} জরুরি
                  </span>
                )}

                <div>
                  <span className={`text-xl sm:text-2xl font-black font-mono block transition-transform group-hover:scale-110 ${
                    isSelected ? 'text-red-600' : 'text-slate-900'
                  }`}>
                    {stat.group}
                  </span>

                  <div className="mt-1 flex items-center justify-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${stat.available > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                    <span className="text-xs font-black text-slate-800 font-mono">
                      {toBengaliNumber(stat.available)} জন
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    প্রস্তুত ডোনার
                  </span>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] flex items-center justify-between text-slate-500">
                  <span>মোট: {toBengaliNumber(stat.total)}</span>
                  <span className={`font-semibold ${isSelected ? 'text-red-600 font-bold' : 'group-hover:text-red-600'}`}>
                    {isSelected ? '✓ সক্রিয়' : 'দেখুন →'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Filtered Donors Live Panel */}
        <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-8 h-8 rounded-lg bg-red-600 text-white font-mono font-black flex items-center justify-center text-sm shadow-xs">
                {activeDashboardGroup === 'all' ? 'ALL' : activeDashboardGroup}
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>
                    {activeDashboardGroup === 'all'
                      ? 'সকল গ্রুপের প্রস্তুত রক্তদাতাবৃন্দ'
                      : `কাঙ্ক্ষিত ${activeDashboardGroup} গ্রুপের প্রস্তুত রক্তদাতাবৃন্দ`}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold">
                    {toBengaliNumber(dashboardDonorsList.length)} জন প্রস্তুত
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  সরাসরি যোগাযোগ বা WhatsApp-এর মাধ্যমে রক্তদানে সহায়তা নিন
                </p>
              </div>
            </div>

            {/* View Mode & Actions */}
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setSummaryViewMode('grid')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    summaryViewMode === 'grid'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">গ্রিড</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSummaryViewMode('list')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    summaryViewMode === 'list'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">লিস্ট</span>
                </button>
              </div>

              <Link
                to={activeDashboardGroup && activeDashboardGroup !== 'all' ? `/find-blood?group=${encodeURIComponent(activeDashboardGroup)}` : '/find-blood'}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold transition-all shadow-2xs hover:border-red-300 hover:text-red-700 flex items-center gap-1"
              >
                <span>অনুসন্ধান ফিল্টারে দেখুন</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Donor List */}
          {dashboardDonorsList.length > 0 ? (
            <div className={
              summaryViewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'
                : 'space-y-3'
            }>
              {dashboardDonorsList.map((donor) => (
                <DonorCard key={donor.id} donor={donor} viewMode={summaryViewMode} />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 space-y-3">
              <Droplets className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">
                এই মুহূর্তে {activeDashboardGroup} গ্রুপের কোনো প্রস্তুত রক্তদাতা পাওয়া যায়নি
              </p>
              <Link
                to="/request-blood"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white font-bold text-xs shadow-xs hover:bg-red-700 transition-colors"
              >
                <Droplets className="w-3.5 h-3.5" />
                জরুরি রক্তের আবেদন সাবমিট করুন
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Recent Verified Donors */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4 sm:mb-6">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                নিকটবর্তী ভেরিফাইড রক্তদাতা
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                {toBengaliNumber(recentVerifiedDonors.length)} জন প্রদর্শিত
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              নিরাপত্তা রক্ষার্থে পূর্ণ ঠিকানা ও ব্যক্তিগত তথ্য সুরক্ষিত
            </p>
          </div>
          <Link
            to="/find-blood"
            className="text-xs sm:text-sm font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 self-start sm:self-auto shrink-0"
          >
            সব রক্তদাতা দেখুন ({toBengaliNumber(verifiedDonorsCount)})
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {recentVerifiedDonors.map((donor) => (
            <DonorCard key={donor.id} donor={donor} compact />
          ))}
        </div>

        {verifiedDonorsCount > visibleVerifiedCount && (
          <div className="text-center mt-5">
            <button
              type="button"
              onClick={() => setVisibleVerifiedCount((prev) => prev + 4)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs hover:shadow-xs transition-all cursor-pointer"
            >
              আরও রক্তদাতা দেখুন (+৪)
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        )}
      </section>

      {/* Successful Blood Donations Showcase */}
      <section id="successful-donations" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600">
                <Award className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                সফল রক্তদান ও বীর রক্তদাতাদের কার্যক্রম
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              মুমূর্ষু রোগীর জীবন বাঁচাতে আমাদের নিবন্ধিত রক্তদাতাদের সফল অনুদান ও সেবার গল্প
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              মোট {toBengaliNumber(donations.length)} টি সফল রক্তদান সম্পন্ন
            </span>

            <Link
              to="/certificate"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1 ml-1"
            >
              <span>ডিজিটাল সনদপত্র</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Quick Blood Group Filter Chips for Donations */}
        <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setDonationGroupFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              donationGroupFilter === 'all'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            সকল গ্রুপ ({toBengaliNumber(donations.length)})
          </button>
          {BLOOD_GROUPS.map((g) => {
            const count = donations.filter((d) => d.bloodGroup === g).length;
            if (count === 0 && donationGroupFilter !== g) return null;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setDonationGroupFilter(donationGroupFilter === g ? 'all' : g)}
                className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold transition-all cursor-pointer ${
                  donationGroupFilter === g
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {g} ({toBengaliNumber(count)})
              </button>
            );
          })}
        </div>

        {/* Donations Cards Grid */}
        {recentDonations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentDonations.map((don) => (
              <div
                key={don.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between space-y-3 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center font-mono font-black text-sm shadow-2xs">
                      {don.bloodGroup}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                        {don.donorName}
                      </h4>
                      <span className="text-[11px] text-slate-400 block font-mono">
                        {don.donorId ? `আইডি: ${don.donorId}` : 'ভেরিফাইড ডোনার'}
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    সফল দান
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{don.hospital || 'ধামরাই রক্তদান কেন্দ্র'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{formatDonationDateBn(don.donationDate)}</span>
                    </div>
                    <span className="font-mono font-semibold text-slate-700">
                      {toBengaliNumber(don.units || 1)} ব্যাগ ({don.donationType || 'Whole Blood'})
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-slate-400">
                    যাচাইকারী: <strong className="text-slate-600 font-semibold">{don.verifiedBy || 'এডমিন'}</strong>
                  </span>
                  <Link
                    to="/certificate"
                    className="text-emerald-600 hover:text-emerald-700 font-bold hover:underline inline-flex items-center gap-0.5"
                  >
                    <span>সনদপত্র দেখুন</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 space-y-2">
            <Award className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">
              এই মুহূর্তে নির্বাচিত গ্রুপে কোনো রক্তদানের তথ্য প্রদর্শিত নেই
            </p>
          </div>
        )}

        {/* Expand / Show More Donations Button */}
        {filteredDonations.length > visibleDonationsCount && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setVisibleDonationsCount((prev) => prev + 6)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-lg shadow-2xs hover:shadow-xs transition-all cursor-pointer"
            >
              আরও সফল রক্তদান দেখুন (+৬)
              <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />
            </button>
          </div>
        )}
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

      {/* Our Chapters & Coverage (Relocated to bottom section) */}
      <section id="branches-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
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
    </div>
  );
};
