import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, ShieldCheck, AlertCircle, RefreshCw, MapPin } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { DonorCard } from '../components/DonorCard';
import type { BloodGroup } from '../types';
import {
  BANGLADESH_DIVISIONS,
  BANGLADESH_DISTRICTS,
  getDistrictsByDivision,
  getUpazilasForDistrict,
  isDistrictMatch,
  isUpazilaMatch,
} from '../data/bangladeshGeoData';

const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const FindBloodPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { donors } = useData();

  // Filters state from URL or default
  const [bloodGroup, setBloodGroup] = useState<string>(searchParams.get('group') || '');
  const [division, setDivision] = useState<string>(searchParams.get('division') || '');
  const [district, setDistrict] = useState<string>(searchParams.get('district') || '');
  const [upazila, setUpazila] = useState<string>(searchParams.get('upazila') || '');
  const [availableOnly, setAvailableOnly] = useState<boolean>(true);
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
  const [emergencyOnly, setEmergencyOnly] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Update query params as user selects
  const handleGroupSelect = (group: string) => {
    const next = group === bloodGroup ? '' : group;
    setBloodGroup(next);
    if (next) searchParams.set('group', next);
    else searchParams.delete('group');
    setSearchParams(searchParams);
  };

  const availableDistricts = useMemo(() => {
    return getDistrictsByDivision(division);
  }, [division]);

  const availableUpazilas = useMemo(() => {
    return district ? getUpazilasForDistrict(district) : [];
  }, [district]);

  const filteredDonors = useMemo(() => {
    return donors.filter((d) => {
      if (bloodGroup && d.bloodGroup !== bloodGroup) return false;
      if (district && !isDistrictMatch(d.district, district)) return false;
      if (upazila && !isUpazilaMatch(d.upazila, upazila)) return false;
      if (availableOnly && !d.availability) return false;
      if (verifiedOnly && d.verificationStatus !== 'verified') return false;
      if (emergencyOnly && !d.emergencyAvailable) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesName = d.fullName.toLowerCase().includes(term);
        const matchesArea = d.area.toLowerCase().includes(term);
        const matchesDonorId = d.donorId.toLowerCase().includes(term);
        if (!matchesName && !matchesArea && !matchesDonorId) return false;
      }
      return true;
    });
  }, [donors, bloodGroup, district, upazila, availableOnly, verifiedOnly, emergencyOnly, searchTerm]);

  const resetFilters = () => {
    setBloodGroup('');
    setDivision('');
    setDistrict('');
    setUpazila('');
    setAvailableOnly(false);
    setVerifiedOnly(false);
    setEmergencyOnly(false);
    setSearchTerm('');
    setSearchParams({});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            রক্তদাতা অনুসন্ধান (Smart Donor Search)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            সারা বাংলাদেশে (৬৪ জেলা ও সকল উপজেলায়) রক্তদানের জন্য প্রস্তুত স্বেচ্ছাসেবী ডোনার তালিকা
          </p>
        </div>

        {/* Privacy Note Badge */}
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>রক্তদাতাদের ব্যক্তিগত গোপনীয়তা ও নিরাপত্তা নিশ্চিত করা হয়েছে</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs space-y-4">
        {/* Blood Group Quick Buttons */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            রক্তের গ্রুপ নির্বাচন করুন:
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:flex md:flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleGroupSelect('')}
              className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-colors text-center ${
                !bloodGroup
                  ? 'bg-red-600 text-white shadow-xs border border-red-700/60'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              সকল গ্রুপ
            </button>
            {BLOOD_GROUPS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => handleGroupSelect(g)}
                className={`py-2 px-2.5 rounded-lg text-xs font-black font-mono transition-colors text-center ${
                  bloodGroup === g
                    ? 'bg-red-600 text-white shadow-xs border border-red-700/60 scale-102'
                    : 'bg-slate-100 text-slate-700 hover:bg-red-50 hover:text-red-700 border border-slate-200'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Division, District & Upazila Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              বিভাগ (Division)
            </label>
            <select
              value={division}
              onChange={(e) => {
                setDivision(e.target.value);
                setDistrict('');
                setUpazila('');
              }}
              className="w-full px-3 py-2 rounded-lg text-xs border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-600 focus:border-red-600 focus:outline-hidden font-medium"
            >
              <option value="">সকল বিভাগ (৮ বিভাগ)</option>
              {BANGLADESH_DIVISIONS.map((div) => (
                <option key={div.id} value={div.id}>
                  {div.nameBn} ({div.nameEn})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              জেলা ({availableDistricts.length} জেলা)
            </label>
            <select
              value={district}
              onChange={(e) => {
                setDistrict(e.target.value);
                setUpazila('');
              }}
              className="w-full px-3 py-2 rounded-lg text-xs border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-600 focus:border-red-600 focus:outline-hidden font-medium"
            >
              <option value="">সকল জেলা</option>
              {availableDistricts.map((dist) => (
                <option key={dist.id} value={dist.nameBn}>
                  {dist.nameBn} ({dist.nameEn})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              উপজেলা / থানা
            </label>
            <select
              value={upazila}
              onChange={(e) => setUpazila(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-xs border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-600 focus:border-red-600 focus:outline-hidden font-medium"
            >
              <option value="">{district ? 'সকল উপজেলা' : 'প্রথমে জেলা নির্বাচন করুন'}</option>
              {availableUpazilas.map((upa) => (
                <option key={upa} value={upa}>
                  {upa}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              নাম অথবা এলাকা দিয়ে অনুসন্ধান
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="যেমন: কুশুরা, আশুলিয়া, বালিয়া..."
                className="w-full pl-8 pr-3 py-2 rounded-lg text-xs border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-600 focus:border-red-600 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(e) => setAvailableOnly(e.target.checked)}
                className="rounded border-slate-300 text-red-600 focus:ring-red-500"
              />
              <span className="font-medium text-slate-700">শুধুমাত্র প্রস্তুত রক্তদাতা (Available)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-medium text-slate-700">ভেরিফাইড ডোনার</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={emergencyOnly}
                onChange={(e) => setEmergencyOnly(e.target.checked)}
                className="rounded border-slate-300 text-red-600 focus:ring-red-500"
              />
              <span className="font-medium text-red-700">২৪/৭ জরুরি রক্তদানে প্রস্তুত</span>
            </label>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-800 font-medium transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            ফিল্টার রিসেট
          </button>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
        <span>মোট <strong className="font-mono text-slate-800">{filteredDonors.length}</strong> জন রক্তদাতা পাওয়া গেছে</span>
        {bloodGroup && (
          <span className="text-red-700 font-semibold font-mono">
            নির্বাচিত গ্রুপ: {bloodGroup}
          </span>
        )}
      </div>

      {/* Donors Grid */}
      {filteredDonors.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDonors.map((donor) => (
            <DonorCard key={donor.id} donor={donor} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200/90 p-8 space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              কোনো রক্তদাতা খুঁজে পাওয়া যায়নি
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              আপনার ফিল্টার পরিবর্তন করে পুনরায় চেষ্টা করুন অথবা জরুরি রক্তের আবেদন তৈরি করুন।
            </p>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 border border-red-700/60 shadow-xs transition-colors inline-block"
          >
            ফিল্টার রিসেট করুন
          </button>
        </div>
      )}
    </div>
  );
};
