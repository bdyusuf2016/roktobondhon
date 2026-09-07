import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Sliders,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  MapPin,
  Clock,
  ShieldCheck,
  Save,
  RotateCcw,
} from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useSystemConfig } from '../../../contexts/SystemConfigContext';
import { useDialog } from '../../../contexts/DialogContext';
import { findCompatibleDonors, calculateMatchScore } from '../../../services/matchingService';
import type { BloodGroup, Donor } from '../../../types';
import type { MatchingWeightsConfig } from '../../../types/config';

export const MatchingEngineSimulator: React.FC = () => {
  const { donors, bloodRequests } = useData();
  const { config, updateSection } = useSystemConfig();
  const dialog = useDialog();

  // Test Criteria State
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<BloodGroup>('A+');
  const [testDistrict, setTestDistrict] = useState<string>('ঢাকা');
  const [testUpazila, setTestUpazila] = useState<string>('মিরপুর');
  const [isEmergency, setIsEmergency] = useState<boolean>(true);
  const [minScore, setMinScore] = useState<number>(20);

  // Live simulation weights
  const [weights, setWeights] = useState<MatchingWeightsConfig>(config.matching);
  const [isSaving, setIsSaving] = useState(false);

  const bloodGroups: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const matchedResults = useMemo(() => {
    return findCompatibleDonors(
      donors,
      {
        patientBloodGroup: selectedBloodGroup,
        district: testDistrict,
        upazila: testUpazila,
        isEmergency,
      },
      {
        weights,
        eligibilityConfig: config.donorEligibility,
        minScore,
      }
    );
  }, [donors, selectedBloodGroup, testDistrict, testUpazila, isEmergency, weights, config.donorEligibility, minScore]);

  const handleWeightChange = (key: keyof MatchingWeightsConfig, val: number) => {
    setWeights((prev) => ({
      ...prev,
      [key]: Math.max(0, val),
    }));
  };

  const handleSaveWeights = async () => {
    setIsSaving(true);
    const res = await updateSection('matching', weights);
    setIsSaving(false);

    if (res.success) {
      dialog.alert({
        title: 'ম্যাচিং স্কোরিং সংরক্ষিত',
        message: 'সিমুলেটরের বর্তমান স্কোরিং প্যারামিটারগুলো সেন্ট্রাল সিস্টেমে সফলভাবে সংরক্ষিত হয়েছে।',
        theme: 'success',
      });
    } else {
      dialog.alert({
        title: 'সংরক্ষণ ব্যর্থ',
        message: res.error || 'সংরক্ষণ করতে সমস্যা হয়েছে।',
        theme: 'error',
      });
    }
  };

  const totalWeightsSum =
    weights.compatibilityWeight +
    weights.distanceWeight +
    weights.availabilityWeight +
    weights.eligibilityWeight +
    weights.verificationWeight +
    weights.reliabilityWeight +
    weights.responseRateWeight +
    weights.emergencyWeight;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 p-4 rounded-xl border border-indigo-100 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <h3 className="font-bold text-slate-900 text-sm">
            স্মার্ট ম্যাচিং সিমুলেটর ও স্যান্ডবক্স (Matching Engine Sandbox)
          </h3>
          <p className="text-slate-600">
            বাস্তব ডোনার ডাটাবেজে রক্তের আবেদন টেস্ট করুন। তাৎক্ষণিক বিভিন্ন ওয়েট ও প্যারামিটার পরিবর্তন করে অ্যালগরিদমের র‍্যাঙ্কিং আচরণ পর্যবেক্ষণ করুন।
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Test Request Parameters */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-4 text-xs">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
            <Search className="w-4 h-4 text-red-600" />
            টেস্ট আবেদনের বিবরণ (Test Criteria)
          </h4>

          <div className="space-y-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">প্রয়োজনীয় রক্তের গ্রুপ</label>
              <div className="grid grid-cols-4 gap-1.5">
                {bloodGroups.map((bg) => (
                  <button
                    key={bg}
                    type="button"
                    onClick={() => setSelectedBloodGroup(bg)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedBloodGroup === bg
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {bg}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">জেলা (District)</label>
                <input
                  type="text"
                  value={testDistrict}
                  onChange={(e) => setTestDistrict(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">উপজেলা / এলাকা</label>
                <input
                  type="text"
                  value={testUpazila}
                  onChange={(e) => setTestUpazila(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEmergency}
                  onChange={(e) => setIsEmergency(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500"
                />
                <span className="font-bold text-red-700">জরুরি প্রয়োজন (Critical Emergency)</span>
              </label>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">ন্যূনতম স্কোর কাট-অফ (Min Score)</label>
                <span className="font-bold text-slate-900">{minScore} pts</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                step="5"
                value={minScore}
                onChange={(e) => setMinScore(parseInt(e.target.value) || 0)}
                className="w-full accent-red-600 cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <h5 className="font-bold text-slate-900 text-xs mb-2">দ্রুত টেস্ট আবেদন লোড করুন:</h5>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {bloodRequests.slice(0, 4).map((req) => (
                <button
                  key={req.id}
                  type="button"
                  onClick={() => {
                    setSelectedBloodGroup(req.bloodGroup);
                    setTestDistrict(req.district);
                    setTestUpazila(req.upazila || '');
                    setIsEmergency(req.emergencyLevel === 'CRITICAL' || req.emergencyLevel === 'URGENT');
                  }}
                  className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors text-[11px]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{req.bloodGroup} — {req.hospital}</span>
                    <span className="text-slate-500">{req.district}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Middle Column: Interactive Weight Sliders */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              লাইভ ওয়েট অ্যাডজাস্টমেন্ট
            </h4>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                totalWeightsSum === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              মোট: {totalWeightsSum}%
            </span>
          </div>

          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-0.5">
                <span>রক্তের সামঞ্জস্য (Blood Compatibility)</span>
                <span className="font-bold text-indigo-600">{weights.compatibilityWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                value={weights.compatibilityWeight}
                onChange={(e) => handleWeightChange('compatibilityWeight', parseInt(e.target.value) || 0)}
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-0.5">
                <span>দূরত্ব ও ভৌগোলিক অবস্থান (Distance)</span>
                <span className="font-bold text-indigo-600">{weights.distanceWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                value={weights.distanceWeight}
                onChange={(e) => handleWeightChange('distanceWeight', parseInt(e.target.value) || 0)}
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-0.5">
                <span>প্রাপ্যতা স্ট্যাটাস (Availability)</span>
                <span className="font-bold text-indigo-600">{weights.availabilityWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={weights.availabilityWeight}
                onChange={(e) => handleWeightChange('availabilityWeight', parseInt(e.target.value) || 0)}
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-0.5">
                <span>স্বাস্থ্য ও মেডিকেল যোগ্যতা (Eligibility)</span>
                <span className="font-bold text-indigo-600">{weights.eligibilityWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={weights.eligibilityWeight}
                onChange={(e) => handleWeightChange('eligibilityWeight', parseInt(e.target.value) || 0)}
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-0.5">
                <span>যাচাইকরণ স্ট্যাটাস (Verification)</span>
                <span className="font-bold text-indigo-600">{weights.verificationWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={weights.verificationWeight}
                onChange={(e) => handleWeightChange('verificationWeight', parseInt(e.target.value) || 0)}
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-0.5">
                <span>জরুরি প্রস্তুতি (Emergency Readiness)</span>
                <span className="font-bold text-indigo-600">{weights.emergencyWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                value={weights.emergencyWeight}
                onChange={(e) => handleWeightChange('emergencyWeight', parseInt(e.target.value) || 0)}
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-0.5">
                <span>রক্তদান অতীত ট্র্যাক রেকর্ড (Reliability)</span>
                <span className="font-bold text-indigo-600">{weights.reliabilityWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                value={weights.reliabilityWeight}
                onChange={(e) => handleWeightChange('reliabilityWeight', parseInt(e.target.value) || 0)}
                className="w-full accent-indigo-600"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleSaveWeights}
              disabled={isSaving}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors text-xs"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'সংরক্ষণ হচ্ছে...' : 'এই স্কোরিং সক্রিয় করুন'}
            </button>
            <button
              type="button"
              onClick={() => setWeights(config.matching)}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
              title="রিসেট"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Column: Matched Donors Ranking Results */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 text-xs flex flex-col h-[520px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 shrink-0">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <h4 className="font-bold text-slate-900 text-sm">
                ম্যাচ ফলাফল ({matchedResults.length} জন রক্তদাতা)
              </h4>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">র‍্যাঙ্কিং ক্রম</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {matchedResults.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400">
                <Search className="w-8 h-8 mb-2 stroke-slate-300" />
                <p className="font-semibold text-slate-600">কোন রক্তদাতা ম্যাচ করেনি</p>
                <p className="text-[11px] mt-1">কাট-অফ স্কোর কমান অথবা বিকল্প রক্তের গ্রুপ নির্বাচন করুন।</p>
              </div>
            ) : (
              matchedResults.map((result, idx) => (
                <div
                  key={result.donor.id}
                  className={`p-3 rounded-xl border transition-all ${
                    idx === 0
                      ? 'bg-gradient-to-r from-amber-50/70 to-emerald-50/70 border-emerald-300 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                          idx === 0
                            ? 'bg-amber-500 text-white'
                            : idx === 1
                            ? 'bg-slate-400 text-white'
                            : idx === 2
                            ? 'bg-amber-700 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{result.donor.fullName || result.donor.name}</span>
                          <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-black text-[10px]">
                            {result.donor.bloodGroup}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {result.donor.upazila ? `${result.donor.upazila}, ` : ''}{result.donor.district}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="px-2 py-1 bg-slate-900 text-white rounded-lg font-black text-xs inline-block">
                        {result.matchScore} pts
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {result.eligibilityStatus === 'eligible' ? (
                          <span className="text-emerald-600 font-bold">✓ যোগ্য</span>
                        ) : (
                          <span className="text-amber-600 font-bold">! অযোগ্য/স্থগিত</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Micro Breakdown Badges */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1 text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold">
                      রক্ত: {result.breakdown.bloodCompatibility}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">
                      দূরত্ব: {result.breakdown.location}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
                      প্রাপ্যতা: {result.breakdown.availability}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold">
                      যাচাই: {result.breakdown.verified}
                    </span>
                    {result.breakdown.emergency ? (
                      <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-semibold">
                        জরুরি: {result.breakdown.emergency}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
