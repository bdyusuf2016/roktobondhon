import React, { useState } from 'react';
import { BaseModal, ModalTheme } from './BaseModal';
import { CheckCircle, XCircle, Activity, RefreshCw } from 'lucide-react';

interface EligibilityCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: ModalTheme;
  onProceedToRegister?: () => void;
}

export const EligibilityCheckModal: React.FC<EligibilityCheckModalProps> = ({
  isOpen,
  onClose,
  theme = 'modern',
  onProceedToRegister,
}) => {
  const [age, setAge] = useState<number | ''>(24);
  const [weight, setWeight] = useState<number | ''>(58);
  const [lastDonatedMonths, setLastDonatedMonths] = useState<number | 'never'>(4);
  const [hasFeverOrCold, setHasFeverOrCold] = useState<boolean>(false);
  const [hasChronicDisease, setHasChronicDisease] = useState<boolean>(false);
  const [recentSurgeryOrTattoo, setRecentSurgeryOrTattoo] = useState<boolean>(false);

  const isAgeValid = typeof age === 'number' && age >= 18 && age <= 65;
  const isWeightValid = typeof weight === 'number' && weight >= 45;
  const isIntervalValid = lastDonatedMonths === 'never' || lastDonatedMonths >= 3;
  const isHealthValid = !hasFeverOrCold && !hasChronicDisease && !recentSurgeryOrTattoo;

  const isFullyEligible = isAgeValid && isWeightValid && isIntervalValid && isHealthValid;

  const handleReset = () => {
    setAge(24);
    setWeight(58);
    setLastDonatedMonths(4);
    setHasFeverOrCold(false);
    setHasChronicDisease(false);
    setRecentSurgeryOrTattoo(false);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      theme={theme}
      size="xl"
      icon={
        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
          <Activity className="w-5 h-5" />
        </div>
      }
      title="রক্তদানের যোগ্যতা যাচাইকরণ (Eligibility Quiz)"
      subtitle="চিকিৎসাবিজ্ঞান অনুযায়ী আপনি এখন রক্তদান করতে পারবেন কিনা তা কয়েক সেকেন্ডে পরীক্ষা করুন"
      footer={
        <div className="w-full flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> রিসেট করুন
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              বন্ধ করুন
            </button>
            {isFullyEligible && onProceedToRegister && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onProceedToRegister();
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
              >
                রক্তদাতা হিসেবে যুক্ত হোন
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div
          className={`p-4 rounded-2xl border transition-all ${
            isFullyEligible
              ? 'bg-emerald-50/90 border-emerald-300 text-emerald-900'
              : 'bg-amber-50/90 border-amber-300 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-3">
            {isFullyEligible ? (
              <CheckCircle className="w-8 h-8 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-8 h-8 text-amber-600 shrink-0" />
            )}
            <div>
              <h4 className="font-bold text-sm sm:text-base">
                {isFullyEligible
                  ? 'অভিনন্দন! আপনি রক্তদানের জন্য শারীরিকভাবে যোগ্য 🎉'
                  : 'আপনি এই মুহূর্তে রক্তদানের জন্য পুরোপুরি প্রস্তুত নন'}
              </h4>
              <p className="text-xs mt-0.5 opacity-90">
                {isFullyEligible
                  ? 'আপনার স্বাস্থ্য সুস্থ এবং উপযুক্ত রক্তদানের শর্তাবলী পূরণ হয়েছে।'
                  : 'নিচের শর্তগুলো লক্ষ্য করুন এবং প্রয়োজনীয় সময় অতিবাহিত হওয়ার পর চেষ্টা করুন।'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-800">আপনার বয়স (বছর)</label>
              <span className={`font-bold ${isAgeValid ? 'text-emerald-600' : 'text-red-600'}`}>
                {isAgeValid ? '✓ ১৮-৬৫ বছরের মধ্যে' : '✗ অনুপযুক্ত'}
              </span>
            </div>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="১৮ - ৬৫"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
            <p className="text-[11px] text-slate-500 mt-1">সর্বনিম্ন ১৮ এবং সর্বোচ্চ ৬৫ বছর গ্রহণযোগ্য।</p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-800">আপনার ওজন (কেজি)</label>
              <span className={`font-bold ${isWeightValid ? 'text-emerald-600' : 'text-red-600'}`}>
                {isWeightValid ? '✓ ৪৫+ কেজি' : '✗ সর্বনিম্ন ৪৫ কেজি'}
              </span>
            </div>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="কমপক্ষে ৪৫ কেজি"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
            <p className="text-[11px] text-slate-500 mt-1">নারী ও পুরুষ উভয়ের ক্ষেত্রে ওজন ন্যূনতম ৪৫ কেজি হতে হবে।</p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 sm:col-span-2">
            <label className="font-bold text-slate-800 block mb-1.5">
              সর্বশেষ কবে রক্তদান করেছেন?
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setLastDonatedMonths('never')}
                className={`p-2 rounded-lg border font-medium transition-all ${
                  lastDonatedMonths === 'never'
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                আগে কখনো দেইনি
              </button>
              <button
                type="button"
                onClick={() => setLastDonatedMonths(4)}
                className={`p-2 rounded-lg border font-medium transition-all ${
                  lastDonatedMonths === 4
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                ৩ মাসের বেশি আগে (যোগ্য)
              </button>
              <button
                type="button"
                onClick={() => setLastDonatedMonths(1)}
                className={`p-2 rounded-lg border font-medium transition-all ${
                  lastDonatedMonths === 1
                    ? 'bg-red-600 text-white border-red-700'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                ৩ মাসের কম আগে
              </button>
            </div>
            {!isIntervalValid && (
              <p className="text-[11px] text-red-600 font-semibold mt-1.5">
                রক্তদানের পর শরীরে লোহিত রক্তকণিকা পুরোপুরি গঠিত হতে কমপক্ষে ৩-৪ মাস সময় লাগে।
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2 pt-1 border-t border-slate-100">
          <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            স্বাস্থ্য সংক্রান্ত সতর্কবার্তা
          </h5>
          <div className="space-y-2">
            <label className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200">
              <input
                type="checkbox"
                checked={hasFeverOrCold}
                onChange={(e) => setHasFeverOrCold(e.target.checked)}
                className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
              />
              <span className="text-xs text-slate-700">
                বর্তমানে সর্দি, জ্বর বা অ্যান্টিবায়োটিক সেবন করছেন
              </span>
            </label>
            <label className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200">
              <input
                type="checkbox"
                checked={hasChronicDisease}
                onChange={(e) => setHasChronicDisease(e.target.checked)}
                className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
              />
              <span className="text-xs text-slate-700">
                হেপাটাইটিস বি/সি, এইডস বা কোনো দীর্ঘমেয়াদি সংক্রামক রোগ রয়েছে
              </span>
            </label>
            <label className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200">
              <input
                type="checkbox"
                checked={recentSurgeryOrTattoo}
                onChange={(e) => setRecentSurgeryOrTattoo(e.target.checked)}
                className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
              />
              <span className="text-xs text-slate-700">
                গত ৬ মাসের মধ্যে বড় অপারেশন বা শরীরে ট্যাটু/পিয়ার্সিং করিয়েছেন
              </span>
            </label>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};
