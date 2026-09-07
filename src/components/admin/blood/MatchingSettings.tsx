import React, { useState, useEffect } from 'react';
import { Sliders, Save, Target, CheckCircle2, AlertCircle, Sparkles, Settings2 } from 'lucide-react';
import { useSystemConfig } from '../../../contexts/SystemConfigContext';
import { useDialog } from '../../../contexts/DialogContext';
import { MatchingEngineSimulator } from './MatchingEngineSimulator';
import type { MatchingWeightsConfig } from '../../../types/config';

export const MatchingSettings: React.FC = () => {
  const { config, updateSection } = useSystemConfig();
  const dialog = useDialog();

  const [activeMode, setActiveMode] = useState<'settings' | 'simulator'>('settings');
  const [formData, setFormData] = useState<MatchingWeightsConfig>(config.matching);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData(config.matching);
  }, [config.matching]);

  const totalWeight =
    formData.compatibilityWeight +
    formData.distanceWeight +
    formData.availabilityWeight +
    formData.eligibilityWeight +
    formData.verificationWeight +
    formData.reliabilityWeight +
    formData.responseRateWeight +
    formData.emergencyWeight;

  const handleWeightChange = (field: keyof MatchingWeightsConfig, val: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: Math.max(0, val),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalWeight !== 100) {
      const proceed = await dialog.confirm({
        title: 'ওজন শতভাগ নয় (Weight != 100%)',
        message: `সকল স্কোরিং বিষয়ের মোট যোগফল ${totalWeight}% হয়েছে। প্রমিত হিসাবের জন্য ১০০% হওয়া বাঞ্ছনীয়। আপনি কি এই সেটিংসে সংরক্ষণ করতে চান?`,
        confirmText: 'হ্যাঁ, সংরক্ষণ করুন',
        confirmTheme: 'warning',
      });
      if (!proceed) return;
    }

    setIsSaving(true);
    const res = await updateSection('matching', formData);
    setIsSaving(false);

    if (res.success) {
      dialog.alert({
        title: 'ম্যাচিং স্কোরিং সংরক্ষিত',
        message: 'ডোনার সার্চ ও র‍্যাঙ্কিং অ্যালগরিদমের প্যারামিটার সফলভাবে আপডেট করা হয়েছে।',
        theme: 'success',
      });
    } else {
      dialog.alert({
        title: 'সংরক্ষণ ব্যর্থ',
        message: res.error || 'ম্যাচিং সেটিংস সংরক্ষণ করতে সমস্যা হয়েছে।',
        theme: 'danger',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveMode('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
            activeMode === 'settings'
              ? 'bg-red-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Settings2 className="w-4 h-4" />
          <span>স্কোরিং ওয়েটস কনফিগারেশন</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('simulator')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
            activeMode === 'simulator'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>লাইভ স্যান্ডবক্স ও সিমুলেটর</span>
        </button>
      </div>

      {activeMode === 'simulator' ? (
        <MatchingEngineSimulator />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/90 text-xs flex items-start gap-2.5">
            <Target className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 block text-sm">
                ডোনার ম্যাচিং ও র‍্যাঙ্কিং ইঞ্জিন স্কোরিং (Donor Matching Weights)
              </span>
              <p className="text-slate-600 mt-0.5 leading-relaxed">
                রক্তের আবেদনকারীকে সবচেয়ে উপযুক্ত ও দ্রুত রক্ত দিতে সক্ষম ডোনারের তালিকা তৈরিতে কোন বিষয়ে কত পয়েন্ট গুরুত্ব পাবে তা কনফিগার করুন।
              </p>
            </div>
          </div>

      {/* Total Weight Status Bar */}
      <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold ${
        totalWeight === 100
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
          : 'bg-amber-50 border-amber-200 text-amber-900'
      }`}>
        <div className="flex items-center gap-2">
          {totalWeight === 100 ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-600" />
          )}
          <span>মোট স্কোরিং ওজন (Total Weight): {totalWeight}%</span>
        </div>
        <span className="text-[11px] font-normal">
          {totalWeight === 100 ? 'নিখুঁত শতভাগ বিন্যাস' : 'প্রস্তাবিত লক্ষ্য: ১০০%'}
        </span>
      </div>

      {/* Weights Inputs Grid */}
      <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4 text-xs shadow-2xs">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Sliders className="w-4 h-4 text-red-600" />
          আলাদা আলাদা ফ্যাক্টরের স্কোরিং পয়েন্ট (Weight Distribution)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 space-y-1.5">
            <div className="flex justify-between items-center font-bold text-slate-800">
              <label>রক্তের গ্রুপের সামঞ্জস্যতা (Compatibility)</label>
              <span className="font-mono text-red-700">{formData.compatibilityWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.compatibilityWeight}
              onChange={(e) => handleWeightChange('compatibilityWeight', Number(e.target.value))}
              className="w-full accent-red-600"
            />
          </div>

          <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 space-y-1.5">
            <div className="flex justify-between items-center font-bold text-slate-800">
              <label>দূরত্ব ও ভৌগোলিক নৈকট্য (Distance/Proximity)</label>
              <span className="font-mono text-red-700">{formData.distanceWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.distanceWeight}
              onChange={(e) => handleWeightChange('distanceWeight', Number(e.target.value))}
              className="w-full accent-red-600"
            />
          </div>

          <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 space-y-1.5">
            <div className="flex justify-between items-center font-bold text-slate-800">
              <label>তাত্ক্ষণিক প্রাপ্যতা (Current Availability)</label>
              <span className="font-mono text-red-700">{formData.availabilityWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.availabilityWeight}
              onChange={(e) => handleWeightChange('availabilityWeight', Number(e.target.value))}
              className="w-full accent-red-600"
            />
          </div>

          <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 space-y-1.5">
            <div className="flex justify-between items-center font-bold text-slate-800">
              <label>মেডিকেল ও ইন্টারভ্যাল যোগ্যতা (Eligibility)</label>
              <span className="font-mono text-red-700">{formData.eligibilityWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.eligibilityWeight}
              onChange={(e) => handleWeightChange('eligibilityWeight', Number(e.target.value))}
              className="w-full accent-red-600"
            />
          </div>

          <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 space-y-1.5">
            <div className="flex justify-between items-center font-bold text-slate-800">
              <label>ভেরিফাইড ডোনার ব্যাজ (Verification Status)</label>
              <span className="font-mono text-red-700">{formData.verificationWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.verificationWeight}
              onChange={(e) => handleWeightChange('verificationWeight', Number(e.target.value))}
              className="w-full accent-red-600"
            />
          </div>

          <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 space-y-1.5">
            <div className="flex justify-between items-center font-bold text-slate-800">
              <label>অতীত নির্ভরযোগ্যতা ও দান সংখ্যা (Reliability)</label>
              <span className="font-mono text-red-700">{formData.reliabilityWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.reliabilityWeight}
              onChange={(e) => handleWeightChange('reliabilityWeight', Number(e.target.value))}
              className="w-full accent-red-600"
            />
          </div>

          <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 space-y-1.5">
            <div className="flex justify-between items-center font-bold text-slate-800">
              <label>রেসপন্স রেট ও সক্রিয়তা (Response Rate)</label>
              <span className="font-mono text-red-700">{formData.responseRateWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.responseRateWeight}
              onChange={(e) => handleWeightChange('responseRateWeight', Number(e.target.value))}
              className="w-full accent-red-600"
            />
          </div>

          <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 space-y-1.5">
            <div className="flex justify-between items-center font-bold text-slate-800">
              <label>জরুরি ক্রাইসিস প্রস্তুতি (Emergency Ready)</label>
              <span className="font-mono text-red-700">{formData.emergencyWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.emergencyWeight}
              onChange={(e) => handleWeightChange('emergencyWeight', Number(e.target.value))}
              className="w-full accent-red-600"
            />
          </div>
        </div>

        {/* Operational Scope */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              সর্বোচ্চ সার্চ ব্যাসার্ধ (Max Search Radius in KM)
            </label>
            <input
              type="number"
              min="1"
              max="500"
              value={formData.maxSearchRadiusKm}
              onChange={(e) => setFormData((p) => ({ ...p, maxSearchRadiusKm: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">ডিফল্ট: ৫০ কিমি (ধামরাই, সাভার, মানিকগঞ্জ জোন)</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
            <div>
              <span className="font-bold text-slate-900 block">কড়া মেডিকেল যাচাইকরণ</span>
              <span className="text-[11px] text-slate-500">অনুপযুক্ত বা ডেফার্ড ডোনারদের তালিকায় প্রদর্শন বন্ধ রাখা</span>
            </div>
            <input
              type="checkbox"
              checked={formData.strictEligibility}
              onChange={(e) => setFormData((p) => ({ ...p, strictEligibility: e.target.checked }))}
              className="w-4 h-4 text-red-600 rounded"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end pt-4 border-t border-slate-200">
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-xs transition-colors border border-red-700/60 text-xs flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'ম্যাচিং স্কোরিং সংরক্ষণ করুন'}</span>
        </button>
      </div>
    </form>
      )}
    </div>
  );
};
