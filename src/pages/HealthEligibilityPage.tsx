import React, { useState, useRef, useEffect } from 'react';
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
  User,
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

import { useDialog } from '../contexts/DialogContext';

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

const INITIAL_HEALTH_FORM: HealthFormState = {
  age: 0,
  weight: 0,
  gender: 'male',
  lastDonationMonths: 0,
  hasFeverOrCold: false,
  takingAntibiotics: false,
  recentTattooOrSurgery: false,
  hasChronicIllness: false,
  isPregnantOrLactating: false,
  feelingHealthyToday: false,
};

export const HealthEligibilityPage: React.FC = () => {
  const dialog = useDialog();
  const [form, setForm] = useState<HealthFormState>({ ...INITIAL_HEALTH_FORM });
  const [step, setStep] = useState<number>(1);
  const [isCalculated, setIsCalculated] = useState<boolean>(false);

  const handleResetForm = () => {
    setForm({ ...INITIAL_HEALTH_FORM });
    setIsCalculated(false);
    dialog.alert({
      title: 'ফর্ম রিসেট সম্পন্ন',
      message: 'স্বাস্থ্য স্ক্রিনিং ফর্মের সকল তথ্য সফলভাবে রিসেট করা হয়েছে।',
      theme: 'success',
    });
  };

  // Gemini AI Conversational Chat State
  interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    time: string;
  }

  const [aiQuestion, setAiQuestion] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: `আসসালামু আলাইকুম! আমি 'রক্ত দান পরিবার কালামপুর'-এর AI রক্তদান স্বাস্থ্য সহকারী। রক্তদানের যোগ্যতা, প্রস্তুতি, খাদ্যাভ্যাস বা যেকোনো স্বাস্থ্য বিষয়ে আমাকে নির্দ্বিধায় প্রশ্ন করতে পারেন।`,
      time: 'এখন',
    },
  ]);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiLoading]);

  // Evaluate Eligibility
  const reasons: string[] = [];
  let isEligible = true;

  if (form.age <= 0) {
    isEligible = false;
    reasons.push('অনুগ্রহ করে আপনার সঠিক বয়স উল্লেখ করুন (সর্বনিম্ন ১৮ বছর)।');
  } else if (form.age < 18) {
    isEligible = false;
    reasons.push('রক্তদানের জন্য সর্বনিম্ন বয়স ১৮ বছর হতে হবে।');
  } else if (form.age > 65) {
    isEligible = false;
    reasons.push('সাধারণত ৬৫ বছরের বেশি বয়সে নিয়মিত রক্তদান নিরুৎসাহিত করা হয়।');
  }

  if (form.weight <= 0) {
    isEligible = false;
    reasons.push('অনুগ্রহ করে আপনার শরীরের সঠিক ওজন উল্লেখ করুন (সর্বনিম্ন ৪৫ কেজি)।');
  } else if (form.weight < 45) {
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

  const handleSendMessage = async (customPrompt?: string) => {
    const query = (customPrompt || aiQuestion).trim();
    if (!query || isAiLoading) return;

    const now = new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      text: query,
      time: now,
    };

    setMessages((prev) => [...prev, userMsg]);
    setAiQuestion('');
    setIsAiLoading(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
        const ai = new GoogleGenAI({ apiKey });

        const historyText = messages
          .slice(-6)
          .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
          .join('\n');

        const prompt = `You are a friendly, caring, and expert blood donation medical advisor for 'রক্ত দান পরিবার কালামপুর' blood platform in Bangladesh.
Answer the user's queries in natural, fluent, empathetic, and polite Bengali.

User's Current Screening Profile:
- Age: ${form.age} years
- Weight: ${form.weight} kg
- Gender: ${form.gender === 'male' ? 'পুরুষ' : 'নারী'}
- Last Donation: ${form.lastDonationMonths} months ago
- Current Health: ${form.feelingHealthyToday ? 'Feeling healthy' : 'Feeling unwell'}

Recent Conversation:
${historyText}
User: ${query}

Behavior Instructions:
1. If the user greets (e.g. "hi", "hello", "হাই", "হ্যালো", "কেমন আছেন", "সালাম"), greet them warmly and naturally, and ask how you can help them regarding blood donation. Do not output a generic canned speech.
2. If the user asks questions about blood donation, give clear, medically sound, and reassuring advice in bullet points or short paragraphs.
3. Keep the conversation lively, friendly, and natural.`;

        let aiText = '';
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: prompt,
          });
          aiText = response.text || '';
        } catch {
          const fallbackResp = await ai.models.generateContent({
            model: 'gemini-3.5-flash-lite',
            contents: prompt,
          });
          aiText = fallbackResp.text || '';
        }

        if (aiText) {
          setMessages((prev) => [
            ...prev,
            {
              id: 'ai-' + Date.now(),
              role: 'assistant',
              text: aiText,
              time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
          return;
        }
      }

      // Smart Conversational Fallback if no API key or offline
      await new Promise((r) => setTimeout(r, 600));
      const lower = query.toLowerCase();
      let smartResponse = '';

      if (
        lower.includes('hi') ||
        lower.includes('hello') ||
        lower.includes('হাই') ||
        lower.includes('হ্যালো') ||
        lower.includes('কেমন') ||
        lower.includes('সালাম')
      ) {
        smartResponse = `হ্যালো! আসসালামু আলাইকুম। আমি 'রক্ত দান পরিবার কালামপুর'-এর AI স্বাস্থ্য সহকারী। আপনাকে কীভাবে সাহায্য করতে পারি? রক্তদানের প্রস্তুতি, খাদ্যতালিকা, কিংবা রক্তদান সংক্রান্ত যেকোনো প্রশ্ন আমাকে করতে পারেন।`;
      } else if (
        lower.includes('খাবার') ||
        lower.includes('খাদ্য') ||
        lower.includes('আয়রন') ||
        lower.includes('পানি')
      ) {
        smartResponse = `🥦 **রক্তদানের আগে ও পরের আদর্শ খাদ্যাভ্যাস:**\n• **রক্তদানের আগে:** প্রচুর পানি ও স্যালাইন পান করুন। আয়রন সমৃদ্ধ খাবার যেমন—কচু শাক, ডিম, কলিজা, ডালিম, বেদানা ও খেজুর খান। খালি পেটে রক্ত দেবেন না।\n• **রক্তদানের পরে:** ফলের জুস বা মিষ্টি শরবত পান করুন এবং ১৫-২০ মিনিট বিশ্রাম নিন। অন্তত ২ ঘণ্টা ধূমপান ও ভারী ওজন উত্তোলন থেকে বিরত থাকুন।`;
      } else if (
        lower.includes('উপকারিতা') ||
        lower.includes('লাভ') ||
        lower.includes('সুবিধা') ||
        lower.includes('কেন')
      ) {
        smartResponse = `💪 **নিয়মিত রক্তদানের স্বাস্থ্য উপকারিতা:**\n1. শরীরে নতুন রক্তকণিকা দ্রুত তৈরি হয় এবং অস্থিমজ্জা সতেজ থাকে।\n2. হৃদরোগ ও হার্ট অ্যাটাকের ঝুঁকি বহুলাংশে হ্রাস পায়।\n3. শরীরে অতিরিক্ত ক্ষতিকর আয়রনের মাত্রা নিয়ন্ত্রণে থাকে।\n4. বিনামূল্যে হেপাটাইটিস, সিফিলিস, এইচআইভি ইত্যাদি রোগ স্ক্রিনিং হয়ে যায়।`;
      } else if (
        lower.includes('যোগ্য') ||
        lower.includes('পারব') ||
        lower.includes('ওজন') ||
        lower.includes('বয়স')
      ) {
        smartResponse = `🩸 **রক্তদানের প্রাথমিক যোগ্যতা:**\n• বয়স: ১৮ থেকে ৬০ বছর।\n• ওজন: কমপক্ষে ৪৫ কেজি (পুরুষদের ৫০ কেজি আদর্শ)।\n• বিরতি: পুরুষদের ক্ষেত্রে অন্তত ৩ মাস, নারীদের ক্ষেত্রে ৪ মাস।\n• সুস্থতা: রক্তচাপ ও হিমোগ্লোবিন স্বাভাবিক থাকতে হবে।`;
      } else {
        smartResponse = `ধন্যবাদ আপনার বার্তার জন্য! রক্তদান একটি সম্পূর্ণ নিরাপদ ও মানবিক কাজ। আপনার স্বাস্থ্য স্ক্রিনিং অনুযায়ী (বয়স: ${form.age}, ওজন: ${form.weight} কেজি), আপনি যদি নিজেকে শারীরিকভাবে সুস্থ বোধ করেন এবং কোনো জটিল ওষুধ না খান, তবে রক্তদানে কোনো বাধা নেই। আপনার সুনির্দিষ্ট কোনো বিষয়ে জানার থাকলে বলুন!`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: 'ai-' + Date.now(),
          role: 'assistant',
          text: smartResponse,
          time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: 'ai-' + Date.now(),
          role: 'assistant',
          text: 'দুঃখিত, সংযোগে কিছুটা বিলম্ব হয়েছে। রক্তদান সংক্রান্ত যেকোনো প্রয়োজনে প্রচুর পানি পান করুন ও সুস্থ থাকুন।',
          time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome-' + Date.now(),
        role: 'assistant',
        text: `আসসালামু আলাইকুম! আমি 'রক্ত দান পরিবার কালামপুর'-এর AI রক্তদান স্বাস্থ্য সহকারী। রক্তদানের যোগ্যতা, প্রস্তুতি, খাদ্যাভ্যাস বা যেকোনো বিষয়ে আমাকে প্রশ্ন করতে পারেন।`,
        time: 'এখন',
      },
    ]);
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
              type="button"
              onClick={handleResetForm}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200/80 active:scale-95 shadow-2xs"
              title="ফর্মের সকল তথ্য রিসেট করুন"
            >
              <RotateCcw className="w-3.5 h-3.5 text-red-500" />
              রিসেট
            </button>
          </div>

          <div className="space-y-4">
            {/* Age & Weight */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">বয়স (বছর) *</label>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={form.age === 0 ? '' : form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value === '' ? 0 : Number(e.target.value) })}
                  placeholder="0"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-red-500 font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">ওজন (কেজি) *</label>
                <input
                  type="number"
                  min={0}
                  max={200}
                  value={form.weight === 0 ? '' : form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value === '' ? 0 : Number(e.target.value) })}
                  placeholder="0"
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
                  value={form.lastDonationMonths === 0 ? '' : form.lastDonationMonths}
                  onChange={(e) => setForm({ ...form, lastDonationMonths: e.target.value === '' ? 0 : Number(e.target.value) })}
                  placeholder="0 (প্রথমবার হলে ০)"
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

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setIsCalculated(true)}
                className="flex-1 py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold rounded-2xl shadow-lg transition transform active:scale-98 cursor-pointer text-sm flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                যোগ্যতা ফলাফল দেখুন
              </button>
              <button
                type="button"
                onClick={handleResetForm}
                className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl border border-slate-200 transition active:scale-98 cursor-pointer text-sm flex items-center justify-center gap-1.5"
                title="ফর্ম রিসেট করুন"
              >
                <RotateCcw className="w-4 h-4 text-slate-500" />
                রিসেট
              </button>
            </div>
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
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-extrabold uppercase tracking-wider text-emerald-100">
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" /> চমৎকার!
                  </div>
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="text-xs text-emerald-100 hover:text-white flex items-center gap-1 font-bold underline cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> পুনরায় পরীক্ষা
                  </button>
                </div>
                <h3 className="text-2xl font-black text-white leading-tight">
                  অভিনন্দন! আপনি আজ রক্তদানের জন্য পুরোপুরি যোগ্য।
                </h3>
                <p className="text-xs text-emerald-100 leading-relaxed">
                  আপনার বয়স, ওজন এবং শারীরিক অবস্থা রক্তদানের উপযুক্ত নির্দেশ করে। আপনার রক্তদান একজন মুমূর্ষু রোগীর প্রাণ ফিরিয়ে দিতে পারে।
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <a
                    href="/find-blood"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-emerald-800 font-bold rounded-xl text-xs shadow hover:bg-emerald-50 transition"
                  >
                    জরুরি রক্তের আবেদনগুলো দেখুন <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white/15 hover:bg-white/25 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> রিসেট
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-extrabold uppercase tracking-wider text-rose-100">
                    <XCircle className="w-4 h-4 text-rose-200" /> সাময়িক স্থগিত
                  </div>
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="text-xs text-rose-100 hover:text-white flex items-center gap-1 font-bold underline cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> পুনরায় পরীক্ষা
                  </button>
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

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> নতুন করে যাচাই করুন (রিসেট)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* AI Conversational Advisor Card */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm space-y-4 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shadow-2xs">
                  <Bot className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-tight">
                    AI রক্তদান স্বাস্থ্য গাইড
                  </h3>
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>সক্রিয় অনলাইন সহকারী</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetChat}
                title="নতুন চ্যাট শুরু করুন"
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium hidden sm:inline">নতুন চ্যাট</span>
              </button>
            </div>

            {/* Quick Suggestion Chips */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleSendMessage('হাই, আপনি কেমন আছেন?')}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-[11px] font-medium transition cursor-pointer"
              >
                👋 হাই, কেমন আছেন?
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('রক্তদানের আগে ও পরে কোন খাবারগুলো খাওয়া উচিত?')}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-[11px] font-medium transition cursor-pointer"
              >
                🥗 আদর্শ খাবার তালিকা
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('রক্ত দিলে শরীরে কী কী স্বাস্থ্যগত উপকারিতা পাওয়া যায়?')}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-[11px] font-medium transition cursor-pointer"
              >
                💪 রক্তদানের উপকারিতা
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('রক্তদানের পরে কী কী সতর্কতা অবলম্বন করা উচিত?')}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-[11px] font-medium transition cursor-pointer"
              >
                ⚠️ রক্তদানের পর করণীয়
              </button>
            </div>

            {/* Conversation Messages Container */}
            <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3 sm:p-4 min-h-[220px] max-h-[360px] overflow-y-auto space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-start gap-2 ${
                    m.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {m.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-tr-none shadow-xs font-medium'
                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none shadow-2xs whitespace-pre-line'
                    }`}
                  >
                    <p>{m.text}</p>
                    <div
                      className={`text-[9px] mt-1 text-right ${
                        m.role === 'user' ? 'text-red-100' : 'text-slate-400'
                      }`}
                    >
                      {m.time}
                    </div>
                  </div>

                  {m.role === 'user' && (
                    <div className="w-6 h-6 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              ))}

              {isAiLoading && (
                <div className="flex items-start gap-2 justify-start">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-none px-3.5 py-2 text-xs text-slate-600 shadow-2xs flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    <span>AI উত্তর লিখছে...</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Chat Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2 pt-1"
            >
              <input
                type="text"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                placeholder="রক্তদান বা স্বাস্থ্য বিষয়ে যেকোনো প্রশ্ন লিখুন (যেমন: 'hi')..."
                disabled={isAiLoading}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none bg-white transition-all placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={isAiLoading || !aiQuestion.trim()}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
                title="পাঠান"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
