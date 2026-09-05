import React from 'react';
import { ShieldCheck, Lock, EyeOff, UserCheck } from 'lucide-react';
import { useOrgConfig } from '../contexts/OrgConfigContext';

export const PrivacyPage: React.FC = () => {
  const { config } = useOrgConfig();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
          <ShieldCheck className="w-3.5 h-3.5" />
          গোপনীয়তা সুরক্ষা অঙ্গীকার
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          প্রাইভেসি ও ডেটা সুরক্ষা নীতি (Privacy Policy)
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          {config.name} প্ল্যাটফর্মে প্রতিটি রক্তদাতা ও গ্রহীতার ব্যক্তিগত তথ্য সুরক্ষায় আমরা প্রতিশ্রুতিবদ্ধ।
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6 text-xs text-slate-700 leading-relaxed">
        <div className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-red-600" />
            ১. সংগৃহীত তথ্যাবলী ও উদ্দেশ্য
          </h2>
          <p>
            আমরা শুধুমাত্র রক্তদান ও গ্রহণের জরুরি সমন্বয় নিশ্চিত করতে প্রয়োজনীয় তথ্য (যেমন: নাম, রক্তের গ্রুপ, মোবাইল নম্বর, উপজেলা ও এলাকা) সংগ্রহ করি। কোনো বাণিজ্যিক উদ্দেশ্যে তথ্যের ব্যবহার সম্পূর্ণরূপে নিষিদ্ধ।
          </p>
        </div>

        <div className="space-y-2 pt-4 border-t border-slate-100">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-red-600" />
            ২. সুরক্ষিত ও গোপন তথ্য (Strictly Non-Public Data)
          </h2>
          <p>নিম্নলিখিত তথ্যগুলো কখনোই সাধারণ ইন্টারনেট ব্যবহারকারী বা সর্বসাধারণের জন্য উন্মুক্ত করা হবে না:</p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>জাতীয় পরিচয়পত্র (NID) নম্বর ও জন্মসনদ সংক্রান্ত নথি।</li>
            <li>রক্তদাতার পূর্ণ বা সুনির্দিষ্ট বাড়ির ঠিকানা ও সঠিক জিপিএস অবস্থান।</li>
            <li>ব্যক্তিগত ফোন নম্বর (যদি রক্তদাতা গোপনীয়তা সেটিংসে ফোন নম্বর গোপন রাখেন)।</li>
            <li>ব্যক্তিগত চিকিৎসাগত বা পারিবারিক সংবেদনশীল তথ্য।</li>
          </ul>
        </div>

        <div className="space-y-2 pt-4 border-t border-slate-100">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-red-600" />
            ৩. রক্তদাতার পূর্ণ নিয়ন্ত্রণ
          </h2>
          <p>
            প্রতিটি রক্তদাতা যেকোনো সময় তাঁর প্রোফাইল থেকে রক্তদানের স্ট্যাটাস (Available / Unavailable) পরিবর্তন করতে পারেন। আপনি চাইলে সাময়িকভাবে কল বা নোটিফিকেশন বন্ধ রাখতে পারেন অথবা আপনার অ্যাকাউন্ট মুছে ফেলার আবেদন জানাতে পারেন।
          </p>
        </div>

        <div className="space-y-2 pt-4 border-t border-slate-100">
          <h2 className="text-base font-bold text-slate-900">
            ৪. নিরাপত্তা নিশ্চয়তা
          </h2>
          <p>
            আমাদের ডেটাবেজ গুগল ক্লাউড ফায়ারস্টোর এনক্রিপশন ও হার্ডেনড সিকিউরিটি রুলসের মাধ্যমে সুরক্ষিত। কোনো অননুমোদিত তৃতীয় পক্ষ ডেটায় অনুপ্রবেশ করতে পারবে না।
          </p>
        </div>
      </div>
    </div>
  );
};
