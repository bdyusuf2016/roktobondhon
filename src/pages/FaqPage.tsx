import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

const FAQS = [
  {
    q: 'কারা রক্ত দিতে পারবেন?',
    a: '১৮ থেকে ৬০ বছর বয়সী যেকোনো সুস্থ নারী ও পুরুষ রক্ত দিতে পারেন। পুরুষের ক্ষেত্রে ওজন কমপক্ষে ৫০ কেজি এবং নারীর ক্ষেত্রে কমপক্ষে ৪৫ কেজি হতে হবে।'
  },
  {
    q: 'কতদিন পর পর রক্ত দেওয়া যায়?',
    a: 'একজন সুস্থ পুরুষ প্রতি ৩ মাস পর পর এবং একজন সুস্থ নারী প্রতি ৪ মাস পর পর নিরাপদে রক্তদান করতে পারেন।'
  },
  {
    q: 'রক্ত দিলে কি কোনো শারীরিক ক্ষতি বা দুর্বলতা হয়?',
    a: 'না, রক্তদানে কোনো ক্ষতি হয় না। রক্ত দেওয়ার পর মানবদেহে দ্রুত নতুন রক্তকণিকা তৈরি হয়। মাত্র ১-২ দিনের মধ্যে রক্তের জলীয় অংশ এবং কয়েক সপ্তাহের মধ্যে রক্তকণিকা পূরণ হয়ে যায়।'
  },
  {
    q: 'রক্তদাতার ফোন নম্বর কি জনসম্মুখে দেখা যাবে?',
    a: 'না। আমাদের প্ল্যাটফর্মে রক্তদাতার গোপনীয়তা সর্বোচ্চ অগ্রাধিকার পায়। আপনি প্রোফাইল সেটিংসে ফোন নম্বর গোপন রাখতে পারবেন। গ্রহীতারা সরাসরি প্ল্যাটফর্মের নোটিফিকেশনের মাধ্যমে অনুরোধ পাঠাতে পারবেন।'
  },
  {
    q: 'রক্তের জন্য কি কোনো অর্থ বা টাকা দিতে হয়?',
    a: 'একদমই না! রক্ত দান পরিবার কালামপুর একটি সম্পূর্ণ স্বেচ্ছাসেবী ও অলাভজনক মানবিক সংগঠন। রক্তদান বা গ্রহণের ক্ষেত্রে যেকোনো প্রকার আর্থিক লেনদেন সম্পূর্ণ নিষিদ্ধ এবং দণ্ডনীয় অপরাধ।'
  },
  {
    q: 'ধামরাই, সাভার ও মানিকগঞ্জের বাইরে কি সেবা পাওয়া যাবে?',
    a: 'বর্তমানে আমাদের ফোকাস ও স্থানীয় সমন্বয়ক টিম ধামরাই, সাভার এবং মানিকগঞ্জে কাজ করছে। তবে জরুরি প্রয়োজনে এবং পর্যায়ক্রমে সারা বাংলাদেশে এই সেবা বিস্তৃত করা হচ্ছে।'
  },
];

export const FaqPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-bold">
          <HelpCircle className="w-3.5 h-3.5" />
          সচরাচর জিজ্ঞাসা
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          সাধারণ প্রশ্নোত্তর (FAQ)
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          রক্তদান সংক্রান্ত দরকারি তথ্য ও স্বাস্থ্যগত নির্দেশিকা
        </p>
      </div>

      <div className="space-y-3">
        {FAQS.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs transition-all"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-slate-900 hover:text-red-600 transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-red-600' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
