import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { CertificateCard } from '../components/CertificateCard';
import { DONOR_BADGES_LIST } from '../data/seedData';
import { Award, Search, Droplet, CheckCircle2, ShieldCheck, Heart, Sparkles, UserCheck, ChevronRight } from 'lucide-react';

export const CertificatePage: React.FC = () => {
  const { donors } = useData();
  const { currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  // Default to current user's donor record or first verified donor with donations
  const initialDonor = donors.find((d) => d.userId === currentUser?.id) ||
    donors.find((d) => d.totalDonations > 0) ||
    donors[0];

  const [selectedDonorId, setSelectedDonorId] = useState<string>(initialDonor?.id || '');

  const filteredDonors = donors.filter((d) => {
    if (!searchQuery.trim()) return false;
    const query = searchQuery.toLowerCase().trim();
    return (
      d.donorId.toLowerCase().includes(query) ||
      d.fullName.toLowerCase().includes(query) ||
      d.phone.includes(query) ||
      d.district.toLowerCase().includes(query) ||
      d.upazila.toLowerCase().includes(query)
    );
  });

  const activeDonor = donors.find((d) => d.id === selectedDonorId) || initialDonor;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Hero Header */}
      <div className="relative rounded-3xl bg-gradient-to-r from-red-700 via-rose-800 to-amber-700 text-white p-8 md:p-12 shadow-xl overflow-hidden print:hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs md:text-sm font-semibold text-amber-200">
            <Sparkles className="w-4 h-4" /> ডিজিটাল রক্তদাতা সম্মাননা ও সনদপত্র
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
            রক্তদাতা সার্টিফিকেট ও ব্যাজ সম্মাননা
          </h1>
          <p className="text-rose-100 text-sm md:text-base leading-relaxed">
            স্বেচ্ছায় রক্ত দিয়ে যারা বাঁচাচ্ছেন হাজারো প্রাণ, তাদের প্রতি আমাদের পরম শ্রদ্ধা। আপনার রক্তদান সনদপত্র এবং অর্জন মেডেল দেখুন ও ডাউনলোড করুন।
          </p>
        </div>
      </div>

      {/* Badges Showcase Grid */}
      <div className="space-y-4 print:hidden">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-500" />
            রক্ত দান পরিবার কালামপুর অর্জন পদক ও সম্মাননা স্তর (Donor Milestone Badges)
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {DONOR_BADGES_LIST.map((badge) => (
            <div
              key={badge.id}
              className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition flex flex-col items-center text-center space-y-3"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg"
                style={{ backgroundColor: badge.color }}
              >
                <Award className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">{badge.titleBn}</h3>
                <span className="inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  ন্যূনতম {badge.minDonations} বার রক্তদান
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{badge.descriptionBn}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Search & Verification Section */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm space-y-6 print:hidden">
        <div className="max-w-2xl mx-auto text-center space-y-3">
          <h2 className="text-2xl font-black text-slate-800">সনদপত্র অনুসন্ধান ও যাচাই</h2>
          <p className="text-slate-600 text-sm">
            রক্তদাতার নাম, ডোনার আইডি (যেমন: <code>DNR-DHM-000101</code>) বা মোবাইল নম্বর দিয়ে সার্চ করুন।
          </p>

          <div className="relative mt-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="ডোনার আইডি, নাম বা ফোন নম্বর লিখুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm bg-slate-50 transition"
            />
          </div>

          {/* Quick Search Dropdown Results */}
          {searchQuery.trim() && (
            <div className="mt-2 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-h-60 overflow-y-auto text-left divide-y divide-slate-100">
              {filteredDonors.length > 0 ? (
                filteredDonors.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setSelectedDonorId(d.id);
                      setSearchQuery('');
                    }}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-red-50/50 transition cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-red-100 text-red-700 font-black flex items-center justify-center text-xs">
                        {d.bloodGroup}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{d.fullName}</div>
                        <div className="text-xs text-slate-500">
                          {d.donorId} • {d.upazila}, {d.district}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                      {d.totalDonations} বার রক্তদান
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-slate-500 text-sm">
                  কোনো রক্তদাতা খুঁজে পাওয়া যায়নি।
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Sample Selector */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-500 font-medium">নমুনা ডোনার সার্টিফিকেট দেখুন:</span>
          {donors.slice(0, 5).map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDonorId(d.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                activeDonor?.id === d.id
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {d.fullName} ({d.bloodGroup})
            </button>
          ))}
        </div>
      </div>

      {/* Certificate Viewer */}
      {activeDonor ? (
        <CertificateCard donor={activeDonor} />
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-500 border border-slate-100">
          কোনো ডোনার রেকর্ড পাওয়া যায়নি।
        </div>
      )}
    </div>
  );
};
