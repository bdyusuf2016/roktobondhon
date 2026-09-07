import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Save,
  Clock,
  Scale,
  Calendar,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import { useSystemConfig } from '../../../contexts/SystemConfigContext';
import { useDialog } from '../../../contexts/DialogContext';
import type { DonorEligibilityConfig } from '../../../types/config';

const DEFAULT_ELIGIBILITY: DonorEligibilityConfig = {
  minimumDonationIntervalDays: 90,
  femaleMinimumDonationIntervalDays: 120,
  minimumAge: 18,
  maximumAge: 65,
  minimumWeightKg: 45,
  temporaryDeferralEnabled: true,
  requireVerification: false,
  requireAvailability: true,
};

export const DonorEligibilitySettings: React.FC = () => {
  const { config, updateSection } = useSystemConfig();
  const dialog = useDialog();

  const [formData, setFormData] = useState<DonorEligibilityConfig>(config.donorEligibility || DEFAULT_ELIGIBILITY);
  const [isSaving, setIsSaving] = useState(false);

  // Test Calculator State
  const [testGender, setTestGender] = useState<'male' | 'female'>('male');
  const [testAge, setTestAge] = useState<number>(25);
  const [testWeight, setTestWeight] = useState<number>(60);
  const [testDaysSinceDonation, setTestDaysSinceDonation] = useState<number>(100);
  const [testIsVerified, setTestIsVerified] = useState<boolean>(true);
  const [testIsAvailable, setTestIsAvailable] = useState<boolean>(true);
  const [testIsDeferred, setTestIsDeferred] = useState<boolean>(false);

  useEffect(() => {
    if (config.donorEligibility) {
      setFormData(config.donorEligibility);
    }
  }, [config.donorEligibility]);

  const handleChange = <K extends keyof DonorEligibilityConfig>(key: K, value: DonorEligibilityConfig[K]) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleReset = async () => {
    const confirmed = await dialog.confirm({
      title: 'ডিফল্ট সেটিংসে রিসেট করবেন?',
      message: 'রক্তদাতা যোগ্যতার সমস্ত নিয়ম স্বাস্থ্য নীতিমালার প্রমিত ডিফল্ট মানে রিসেট করা হবে।',
      confirmText: 'হ্যাঁ, রিসেট করুন',
      confirmTheme: 'warning',
    });
    if (confirmed) {
      setFormData(DEFAULT_ELIGIBILITY);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.minimumAge >= formData.maximumAge) {
      dialog.alert({
        title: 'ভুল ইনপুট',
        message: 'সর্বনিম্ন বয়স অবশ্যই সর্বোচ্চ বয়সের চেয়ে কম হতে হবে।',
        theme: 'error',
      });
      return;
    }

    if (formData.minimumDonationIntervalDays < 30 || formData.femaleMinimumDonationIntervalDays < 30) {
      dialog.alert({
        title: 'অস্বাভাবিক রক্তদানের বিরতি',
        message: 'রক্তদানের সর্বনিম্ন ব্যবধান ৩০ দিনের নিচে নির্ধারণ করা অনুচিত ও অনিরাপদ।',
        theme: 'warning',
      });
      return;
    }

    setIsSaving(true);
    const res = await updateSection('donorEligibility', formData);
    setIsSaving(false);

    if (res.success) {
      dialog.alert({
        title: 'যোগ্যতা নীতি সংরক্ষিত',
        message: 'রক্তদাতার মেডিকেল ও স্বাস্থ্য যোগ্যতা কনফিগারেশন সফলভাবে আপডেট হয়েছে।',
        theme: 'success',
      });
    } else {
      dialog.alert({
        title: 'সংরক্ষণ ব্যর্থ',
        message: res.error || 'যোগ্যতা সেটিংস সংরক্ষণ করতে সমস্যা হয়েছে।',
        theme: 'error',
      });
    }
  };

  // Run Real-time Simulation
  const requiredInterval =
    testGender === 'female'
      ? formData.femaleMinimumDonationIntervalDays
      : formData.minimumDonationIntervalDays;
  const isIntervalOk = testDaysSinceDonation >= requiredInterval;
  const isAgeOk = testAge >= formData.minimumAge && testAge <= formData.maximumAge;
  const isWeightOk = testWeight >= formData.minimumWeightKg;
  const isVerificationOk = !formData.requireVerification || testIsVerified;
  const isAvailabilityOk = !formData.requireAvailability || testIsAvailable;
  const isDeferralOk = !formData.temporaryDeferralEnabled || !testIsDeferred;

  const isEligible =
    isIntervalOk && isAgeOk && isWeightOk && isVerificationOk && isAvailabilityOk && isDeferralOk;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header card */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 p-4 rounded-xl border border-red-100 flex items-start gap-3">
        <UserCheck className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <h3 className="font-bold text-slate-900 text-sm">রক্তদাতা স্বাস্থ্য ও যোগ্যতা নীতি (Donor Eligibility Policy)</h3>
          <p className="text-slate-600">
            রক্তদাতার নিরাপদ রক্তদান বিরতি, বয়স সীমা, ওজন এবং সাময়িক অনুপলব্ধতা ও যাচাইকরণ সম্পর্কিত সেন্ট্রাল রুলস কনফিগার করুন।
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Donation Intervals */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-4">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
            <Clock className="w-4 h-4 text-red-600" />
            রক্তদান বিরতি সময়কাল (Donation Interval)
          </h4>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                সাধারণ / পুরুষ রক্তদানের বিরতি (দিন)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="30"
                  max="365"
                  value={formData.minimumDonationIntervalDays}
                  onChange={(e) => handleChange('minimumDonationIntervalDays', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 font-bold text-slate-800"
                  required
                />
                <span className="absolute right-3 top-2 text-slate-400 font-medium">দিন (ডিফল্ট: ৯০)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">প্রতিটি রক্তদানের পর সর্বনিম্ন ৯০ দিন বিরতি আদর্শ।</p>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                নারী রক্তদানের বিশেষ বিরতি (দিন)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="30"
                  max="365"
                  value={formData.femaleMinimumDonationIntervalDays}
                  onChange={(e) => handleChange('femaleMinimumDonationIntervalDays', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 font-bold text-slate-800"
                  required
                />
                <span className="absolute right-3 top-2 text-slate-400 font-medium">দিন (ডিফল্ট: ১২০)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">নারী রক্তদাতাদের আয়রন রিকভারির জন্য ১২০ দিন সুপারিশকৃত।</p>
            </div>
          </div>
        </div>

        {/* Age & Weight Constraints */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-4">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
            <Scale className="w-4 h-4 text-amber-600" />
            শারীরিক পরিমাপ ও বয়স সীমা (Age & Weight)
          </h4>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">সর্বনিম্ন বয়স</label>
                <div className="relative">
                  <input
                    type="number"
                    min="16"
                    max="100"
                    value={formData.minimumAge}
                    onChange={(e) => handleChange('minimumAge', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 font-bold text-slate-800"
                    required
                  />
                  <span className="absolute right-3 top-2 text-slate-400 font-medium">বছর</span>
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">সর্বোচ্চ বয়স</label>
                <div className="relative">
                  <input
                    type="number"
                    min="18"
                    max="100"
                    value={formData.maximumAge}
                    onChange={(e) => handleChange('maximumAge', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 font-bold text-slate-800"
                    required
                  />
                  <span className="absolute right-3 top-2 text-slate-400 font-medium">বছর</span>
                </div>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                সর্বনিম্ন ওজন (কেজি)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="35"
                  max="200"
                  value={formData.minimumWeightKg}
                  onChange={(e) => handleChange('minimumWeightKg', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 font-bold text-slate-800"
                  required
                />
                <span className="absolute right-3 top-2 text-slate-400 font-medium">কেজি (ডিফল্ট: ৪৫)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">রক্তদানের জন্য রক্তদাতার ওজন কমপক্ষে ৪৫ কেজি হতে হবে।</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enforcement & Deferral Controls */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-4">
        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          বাধ্যতামূলক শর্ত ও স্থগিতাদেশ নীতি (Policy Enforcement)
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={formData.temporaryDeferralEnabled}
              onChange={(e) => handleChange('temporaryDeferralEnabled', e.target.checked)}
              className="mt-0.5 rounded text-red-600 focus:ring-red-500"
            />
            <div>
              <span className="font-bold text-slate-800 block">সাময়িক স্থগিতাদেশ (Temporary Deferral)</span>
              <span className="text-[11px] text-slate-500">অসুস্থতা বা অ্যান্টিবায়োটিক গ্রহণের কারণে সাময়িক বিরতি সক্রিয় রাখবে</span>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={formData.requireVerification}
              onChange={(e) => handleChange('requireVerification', e.target.checked)}
              className="mt-0.5 rounded text-red-600 focus:ring-red-500"
            />
            <div>
              <span className="font-bold text-slate-800 block">ভেরিফায়েড রক্তদাতা বাধ্যতামূলক</span>
              <span className="text-[11px] text-slate-500">শুধুমাত্র অ্যাডমিন দ্বারা যাচাইকৃত প্রোফাইল সার্চে আসবে</span>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={formData.requireAvailability}
              onChange={(e) => handleChange('requireAvailability', e.target.checked)}
              className="mt-0.5 rounded text-red-600 focus:ring-red-500"
            />
            <div>
              <span className="font-bold text-slate-800 block">প্রস্তুত স্ট্যাটাস বাধ্যতামূলক (Available)</span>
              <span className="text-[11px] text-slate-500">অনুপলব্ধ বা ছুটি নেওয়া রক্তদাতাদের স্বয়ংক্রিয়ভাবে বাদ রাখবে</span>
            </div>
          </label>
        </div>
      </div>

      {/* Real-time Eligibility Rule Simulator */}
      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-emerald-600" />
            লাইভ রুল সিমুলেটর (Live Eligibility Test Simulator)
          </h4>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
              isEligible
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-red-100 text-red-800 border border-red-300'
            }`}
          >
            {isEligible ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> রক্তদানের জন্য যোগ্য (Eligible)
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5 text-red-600" /> অযোগ্য (Ineligible)
              </>
            )}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="text-[11px] text-slate-600 font-semibold block mb-1">লিঙ্গ</label>
            <select
              value={testGender}
              onChange={(e) => setTestGender(e.target.value as 'male' | 'female')}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
            >
              <option value="male">পুরুষ</option>
              <option value="female">নারী</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-600 font-semibold block mb-1">বয়স (বছর)</label>
            <input
              type="number"
              value={testAge}
              onChange={(e) => setTestAge(parseInt(e.target.value) || 0)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-600 font-semibold block mb-1">ওজন (কেজি)</label>
            <input
              type="number"
              value={testWeight}
              onChange={(e) => setTestWeight(parseInt(e.target.value) || 0)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-600 font-semibold block mb-1">শেষ রক্তদান (দিন আগে)</label>
            <input
              type="number"
              value={testDaysSinceDonation}
              onChange={(e) => setTestDaysSinceDonation(parseInt(e.target.value) || 0)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
            />
          </div>
        </div>

        {/* Rule breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
          <div className={`p-2 rounded-lg border ${isIntervalOk ? 'bg-white border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            <span className="font-bold block">বিরতি: {isIntervalOk ? '✓ পাস' : '✗ ফেল'}</span>
            <span>প্রয়োজন: {requiredInterval} দিন</span>
          </div>

          <div className={`p-2 rounded-lg border ${isAgeOk ? 'bg-white border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            <span className="font-bold block">বয়স: {isAgeOk ? '✓ পাস' : '✗ ফেল'}</span>
            <span>সীমা: {formData.minimumAge}-{formData.maximumAge} বছর</span>
          </div>

          <div className={`p-2 rounded-lg border ${isWeightOk ? 'bg-white border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            <span className="font-bold block">ওজন: {isWeightOk ? '✓ পাস' : '✗ ফেল'}</span>
            <span>ন্যূনতম: {formData.minimumWeightKg} কেজি</span>
          </div>

          <div className={`p-2 rounded-lg border ${isVerificationOk && isAvailabilityOk && isDeferralOk ? 'bg-white border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            <span className="font-bold block">স্ট্যাটাস ও ভেরিফিকেশন</span>
            <span>{isVerificationOk && isAvailabilityOk && isDeferralOk ? '✓ সব শর্ত পূরণ' : '✗ শর্ত অপূর্ণ'}</span>
          </div>
        </div>
      </div>

      {/* Submit / Reset Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
        <button
          type="button"
          onClick={handleReset}
          className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          ডিফল্টে রিসেট
        </button>

        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl shadow-xs flex items-center gap-2 transition-colors"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'সংরক্ষণ হচ্ছে...' : 'যোগ্যতা নীতি সংরক্ষণ করুন'}
        </button>
      </div>
    </form>
  );
};
