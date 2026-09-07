import React, { useState } from 'react';
import {
  Heart,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Bot,
  Sparkles,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  Apple,
  Droplets,
  Activity,
  Send,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

interface HealthFormState {
  age: number;
  weight: number;
  gender: 'male' | 'female';
  lastDonationMonths: number;
  hasFeverOrCold: boolean;
  takingAntibiotics: boolean;
  recentTattooOrSurgery: boolean;
  hasChronicIllness: boolean; // diabetes on insulin, heart disease, hepatitis
  isPregnantOrLactating: boolean;
  feelingHealthyToday: boolean;
}

export const HealthEligibilityPage: React.FC = () => {
  const [form, setForm] = useState<HealthFormState>({
    age: 24,
    weight: 58,
    gender: 'male',
    lastDonationMonths: 4,
    hasFeverOrCold: false,
    takingAntibiotics: false,
    recentTattooOrSurgery: false,
    hasChronicIllness: false,
    isPregnantOrLactating: false,
    feelingHealthyToday: true,
  });

  const [step, setStep] = useState<number>(1);
  const [isCalculated, setIsCalculated] = useState<boolean>(false);

  // Gemini AI Chat / Tips State
  const [aiQuestion, setAiQuestion] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // Evaluate Eligibility
  const reasons: string[] = [];
  let isEligible = true;

  if (form.age < 18) {
    isEligible = false;
    reasons.push('রক্তদানের জন্য সর্বনিম্ন বয়স ১৮ বছর হতে হবে।');
  } else if (form.age > 65) {
    isEligible = false;
    reasons.push('সাধারণত ৬৫ বছরের বেশি বয়সে নিয়মিত রক্তদান নিরুৎসাহিত করা হয়।');
  }

  if (form.weight < 45) {
    isEligible = false;
    reasons.push('রক্তদানের জন্য ন্যূনতম ওজন ৪৫ কেজি (পুরুষদের ক্ষেত্রে ৫০ কেজি আদর্শ) হতে হবে।');
  }

  const minMonths = form.gender === 'male' ? 3 : 4;
  if (form.lastDonationMonths > 0 && form.lastDonationMonths < minMonths) {
    isEligible = false;
    reasons.push(`শেষ রক্তদানের পর পুরুষদের অন্তত ৩ মাস এবং নারীদের ৪ মাস বিরতি প্রয়োজন (আপনার বর্তমান বিরতি: ${form.lastDonationMonths} মাস)।`);
  }

  if (form.hasFeverOrCold) {
    isEligible = false;
    reasons.push('বর্তমানে জ্বর, সর্দি বা কাশি থাকলে পুরোপুরি সুস্থ হওয়ার অন্তত ৭ দিন পর রক্ত দেওয়া উচিত।');
  }

  if (form.takingAntibiotics) {
    isEligible = false;
    reasons.push('অ্যান্টিবায়োটিক বা জটিল কোনো ওষুধ সেবনরত থাকলে কোর্স শেষ হওয়ার ৭ দিন পর রক্ত দিন।');
  }

  if (form.recentTattooOrSurgery) {
    isEligible = false;
    reasons.push('গত ৬ মাসের মধ্যে কোনো বড় সার্জারি, রক্তগ্রহণ বা ট্যাটু আঁকা হয়ে থাকলে রক্তদান সাময়িক স্থগিত রাখুন।');
  }

  if (form.hasChronicIllness) {
    isEligible = false;
    reasons.push('অনিয়ন্ত্রিত উচ্চ রক্তচাপ, ইনসুলিন নির্ভর ডায়াবেটিস, হেপাটাইটিস বা হৃদরোগ থাকলে রক্তদান করা যায় না।');
  }

  if (form.gender === 'female' && form.isPregnantOrLactating) {
    isEligible = false;
    reasons.push('গর্ভকালীন ও দুগ্ধদানকারী সময়ে মায়েদের রক্তদান করা নিষেধ।');
  }

  if (!form.feelingHealthyToday) {
    isEligible = false;
    reasons.push('রক্তদানের দিনে নিজেকে শারীরিক ও মানসিকভাবে সম্পূর্ণ সুস্থ ও উদ্যমী বোধ করা প্রয়োজন।');
  }

  const handleAskAI = async (customPrompt?: string) => {
    const query = customPrompt || aiQuestion;
    if (!query.trim()) return;

    setIsAiLoading(true);
    setAiResponse('');

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `You are an expert blood donation medical advisor for 'রক্ত দান পরিবার কালামপুর' blood platform in Bangladesh.
          Answer the following blood donation health query in clear, reassuring, and fluent Bengali.
          User Health Profile: Age ${form.age}, Weight ${form.weight}kg, Gender ${form.gender}.
          Query: ${query}`,
        });
        setAiResponse(response.text || 'পরামর্শ তৈরি করা সম্ভব হয়নি।');
      } else {
        // High quality medical guidance fallback
        await new Promise((r) => setTimeout(r, 800));
        if (query.includes('খাবার') || query.includes('আয়রন')) {
          setAiResponse(`🥦 **রক্তদানের পূর্বে ও পরে আদর্শ খাদ্যাভ্যাস:**
1. **রক্তদানের আগে:** প্রচুর পানি ও স্যালাইন পান করুন। আয়রন সমৃদ্ধ খাবার যেমন—কচু শাক, ডিম, কলিজা, ডালিম, বেদানা ও খেজুর খান। খালি পেটে রক্ত দেবেন না।
2. **রক্তদানের পরে:** ফলের জুস বা মিষ্টি শরবত পান করুন এবং ১৫-২০ মিনিট বিশ্রাম নিন। অন্তত ২ ঘণ্টা ধূমপান ও ভারী ওজন উত্তোলন থেকে বিরত থাকুন।`);
        } else {
          setAiResponse(`🩺 **রক্তদান ও স্বাস্থ্য সংক্রান্ত পরামর্শ:**
রক্তদান একটি সম্পূর্ণ নিরাপদ ও মহৎ প্রক্রিয়া। একজন সুস্থ ব্যক্তি প্রতি ৩-৪ মাস পর পর রক্ত দিলে শরীরের অস্থিমজ্জা সক্রিয় হয় এবং নতুন রক্তকণিকা তৈরি বৃদ্ধি পায়, যা হৃদরোগের ঝুঁকি কমাতেও সাহায্য করে। পর্যাপ্ত ঘুম (৬-৮ ঘণ্টা) ও হালকা খাবার খেয়ে রক্তদান কেন্দ্রে আসুন।`);
        }
      }
    } catch (err) {
      console.error(err);
      setAiResponse('রক্তদান পূর্ববর্তী পরামর্শ: পর্যাপ্ত পানি পান করুন, পুষ্টিকর খাবার গ্রহণ করুন এবং কোনো অসুস্থতা বোধ করলে রক্তদান পিছিয়ে দিন।');
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Hero Header */}
      <div className="relative rounded-3xl bg-gradient-to-r from-red-600 via-rose-700 to-indigo-800 text-white p-8 md:p-12 shadow-xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs md:text-sm font-semibold text-rose-100">
            <Bot className="w-4 h-4 text-amber-300" /> AI রক্তদান স্বাস্থ্য ও যোগ্যতা সহকারী
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
            আপনি কি রক্তদানের জন্য যোগ্য?
          </h1>
          <p className="text-rose-100 text-sm md:text-base leading-relaxed">
            মাত্র ১ মিনিটে সাধারণ স্বাস্থ্য প্রশ্নাবলির উত্তর দিয়ে জানুন আপনি আজ রক্ত দিতে প্রস্তুত কিনা এবং গ্রহণ করুন AI পরিচালিত ব্যক্তিগত পরামর্শ।
          </p>
        </div>
      </div>

      {/* Main Screener Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Questionnaire Form (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-red-600" />
              প্রাথমিক স্বাস্থ্য স্ক্রিনিং
            </h2>
            <button
              onClick={() => {
                setIsCalculated(false);
                setForm({
                  age: 24,
                  weight: 58,
                  gender: 'male',
                  lastDonationMonths: 4,
                  hasFeverOrCold: false,
                  takingAntibiotics: false,
                  recentTattooOrSurgery: false,
                  hasChronicIllness: false,
                  isPregnantOrLactating: false,
                  feelingHealthyToday: true,
                });
              }}
              className="text-xs text-slate-500 hover:text-red-600 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> রিসেট
            </button>
          </div>

          <div className="space-y-4">
            {/* Age & Weight */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">বয়স (বছর) *</label>
                <input
                  type="number"
                  min={10}
                  max={90}
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-red-500 font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">ওজন (কেজি) *</label>
                <input
                  type="number"
                  min={30}
                  max={150}
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-red-500 font-bold text-slate-800"
                />
              </div>
            </div>

            {/* Gender & Last Donation */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">লিঙ্গ *</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value as 'male' | 'female' })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-red-500"
                >
                  <option value="male">পুরুষ (Male)</option>
                  <option value="female">নারী (Female)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">শেষ রক্তদান (মাস আগে)</label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={form.lastDonationMonths}
                  onChange={(e) => setForm({ ...form, lastDonationMonths: Number(e.target.value) })}
                  placeholder="প্রথমবার হলে ০ দিন"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            {/* Checkbox Questions */}
            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition border border-slate-100">
                <input
                  type="checkbox"
                  checked={form.feelingHealthyToday}
                  onChange={(e) => setForm({ ...form, feelingHealthyToday: e.target.checked })}
                  className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                />
                <span className="text-xs font-semibold text-slate-800">
                  আমি আজ শারীরিকভাবে সম্পূর্ণ সুস্থ ও ফিট বোধ করছি।
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition border border-slate-100">
                <input
                  type="checkbox"
                  checked={form.hasFeverOrCold}
                  onChange={(e) => setForm({ ...form, hasFeverOrCold: e.target.checked })}
                  className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                />
                <span className="text-xs font-semibold text-slate-800">
                  গত ১ সপ্তাহের মধ্যে জ্বর, ঠান্ডা বা সর্দি-কাশি হয়েছে।
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition border border-slate-100">
                <input
                  type="checkbox"
                  checked={form.takingAntibiotics}
                  onChange={(e) => setForm({ ...form, takingAntibiotics: e.target.checked })}
                  className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                />
                <span className="text-xs font-semibold text-slate-800">
                  বর্তমানে কোনো অ্যান্টিবায়োটিক বা চিকিৎসকের প্রেসক্রিপশনের ওষুধ চলছে।
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition border border-slate-100">
                <input
                  type="checkbox"
                  checked={form.recentTattooOrSurgery}
                  onChange={(e) => setForm({ ...form, recentTattooOrSurgery: e.target.checked })}
                  className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                />
                <span className="text-xs font-semibold text-slate-800">
                  গত ৬ মাসের মধ্যে কোনো বড় সার্জারি বা ট্যাটু করানো হয়েছে।
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition border border-slate-100">
                <input
                  type="checkbox"
                  checked={form.hasChronicIllness}
                  onChange={(e) => setForm({ ...form, hasChronicIllness: e.target.checked })}
                  className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                />
                <span className="text-xs font-semibold text-slate-800">
                  হৃদরোগ, হেপাটাইটিস বা অনিয়ন্ত্রিত ডায়াবেটিসের সমস্যা রয়েছে।
                </span>
              </label>

              {form.gender === 'female' && (
                <label className="flex items-center gap-3 p-3 rounded-2xl bg-rose-50 hover:bg-rose-100 cursor-pointer transition border border-rose-100">
                  <input
                    type="checkbox"
                    checked={form.isPregnantOrLactating}
                    onChange={(e) => setForm({ ...form, isPregnantOrLactating: e.target.checked })}
                    className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                  />
                  <span className="text-xs font-semibold text-rose-900">
                    বর্তমানে গর্ভবতী বা শিশুকে দুগ্ধপান করাচ্ছেন।
                  </span>
                </label>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsCalculated(true)}
              className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold rounded-2xl shadow-lg transition transform active:scale-98 cursor-pointer text-sm flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              যোগ্যতা ফলাফল দেখুন
            </button>
          </div>
        </div>

        {/* Right: Instant Verdict & AI Assistant (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Verdict Box */}
          <div
            className={`rounded-3xl p-6 md:p-8 border shadow-sm transition-all duration-300 ${
              !isCalculated
                ? 'bg-slate-50 border-slate-200 text-slate-600'
                : isEligible
                ? 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white border-emerald-400 shadow-emerald-200'
                : 'bg-gradient-to-br from-rose-500 to-red-700 text-white border-rose-400 shadow-rose-200'
            }`}
          >
            {!isCalculated ? (
              <div className="text-center space-y-3 py-6">
                <HelpCircle className="w-12 h-12 text-slate-400 mx-auto" />
                <h3 className="font-bold text-slate-800 text-lg">ফলাফল দেখতে ফর্মটি পূরণ করুন</h3>
                <p className="text-xs text-slate-500">
                  বাম পাশের শর্তাবলি পূরণ করে ‘যোগ্যতা ফলাফল দেখুন’ বাটনে চাপুন।
                </p>
              </div>
            ) : isEligible ? (
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-extrabold uppercase tracking-wider text-emerald-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" /> চমৎকার!
                </div>
                <h3 className="text-2xl font-black text-white leading-tight">
                  অভিনন্দন! আপনি আজ রক্তদানের জন্য পুরোপুরি যোগ্য।
                </h3>
                <p className="text-xs text-emerald-100 leading-relaxed">
                  আপনার বয়স, ওজন এবং শারীরিক অবস্থা রক্তদানের উপযুক্ত নির্দেশ করে। আপনার রক্তদান একজন মুমূর্ষু রোগীর প্রাণ ফিরিয়ে দিতে পারে।
                </p>

                <div className="pt-2">
                  <a
                    href="/find-blood"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-emerald-800 font-bold rounded-xl text-xs shadow hover:bg-emerald-50 transition"
                  >
                    জরুরি রক্তের আবেদনগুলো দেখুন <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-extrabold uppercase tracking-wider text-rose-100">
                  <XCircle className="w-4 h-4 text-rose-200" /> সাময়িক স্থগিত
                </div>
                <h3 className="text-xl font-black text-white leading-tight">
                  আপনি এই মুহূর্তে রক্তদানের জন্য উপযুক্ত নন
                </h3>
                <div className="space-y-1.5 text-xs text-rose-100 bg-white/10 p-3 rounded-2xl">
                  {reasons.map((r, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="font-bold">•</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Advisor Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-800">
              <Bot className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-base text-slate-900">AI রক্তদান স্বাস্থ্য গাইড</h3>
            </div>

            {/* Quick Prompts */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleAskAI('রক্তদানের আগে ও পরে কোন কোন খাবার খাওয়া উচিত?')}
                className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer"
              >
                🥗 আদর্শ খাবার তালিকা
              </button>
              <button
                onClick={() => handleAskAI('রক্ত দিলে শরীরে কী কী স্বাস্থ্যগত উপকারিতা পাওয়া যায়?')}
                className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer"
              >
                💪 রক্তদানের উপকারিতা
              </button>
              <button
                onClick={() => handleAskAI('রক্তদানের পরে কী কী সতর্কতা অবলম্বন করা উচিত?')}
                className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer"
              >
                ⚠️ রক্তদানের পর করণীয়
              </button>
            </div>

            {/* AI Response Display */}
            {isAiLoading && (
              <div className="flex items-center justify-center gap-2 py-6 text-slate-500 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                AI স্বাস্থ্য পরামর্শ তৈরি হচ্ছে...
              </div>
            )}

            {aiResponse && !isAiLoading && (
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                {aiResponse}
              </div>
            )}

            {/* Chat Input */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                placeholder="রক্তদান সংক্রান্ত যেকোনো প্রশ্ন লিখুন..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
              <button
                onClick={() => handleAskAI()}
                disabled={isAiLoading || !aiQuestion.trim()}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
