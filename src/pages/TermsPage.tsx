import React from 'react';
import { useOrgConfig } from '../contexts/OrgConfigContext';

export const TermsPage: React.FC = () => {
  const { config } = useOrgConfig();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          ব্যবহারের শর্তাবলী (Terms of Service)
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          {config.name} প্ল্যাটফর্ম ব্যবহারের সাধারণ নীতিমালা
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6 text-xs text-slate-700 leading-relaxed">
        <div className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">
            ১. স্বেচ্ছাসেবী ও অলাভজনক নীতি
          </h2>
          <p>
            {config.name} একটি সম্পূর্ণ স্বেচ্ছাসেবী ও অবাণিজ্যিক রক্তদান নেটওয়ার্ক। রক্তদান বা রক্ত গ্রহণের বিনিময়ে কোনো ধরনের আর্থিক লেনদেন বা দালালি সম্পূর্ণ নিষিদ্ধ। কেউ অর্থ দাবি করলে অবিলম্বে এডমিন টিম অথবা আইন প্রয়োগকারী সংস্থাকে অবহিত করুন।
          </p>
        </div>

        <div className="space-y-2 pt-4 border-t border-slate-100">
          <h2 className="text-base font-bold text-slate-900">
            ২. তথ্যের নির্ভুলতা
          </h2>
          <p>
            আবেদনকারী ও রক্তদাতা উভয়কেই সঠিক ও সত্য তথ্য প্রদান করতে হবে। ভুয়া রক্তের আবেদন তৈরি করা অথবা রক্তদাতার পরিচয়ে বিভ্রান্তিকর তথ্য দেওয়া আইনত দণ্ডনীয়।
          </p>
        </div>

        <div className="space-y-2 pt-4 border-t border-slate-100">
          <h2 className="text-base font-bold text-slate-900">
            ৩. চিকিৎসা সংক্রান্ত সতর্কতা
          </h2>
          <p>
            সংগঠন রক্তদাতা ও গ্রহীতার মধ্যে যোগাযোগের একটি সেতু হিসেবে কাজ করে। রক্ত সঞ্চালনের পূর্বে ক্রস-ম্যাচিং ও স্ক্রিনিং পরীক্ষা অনুমোদিত হাসপাতাল বা ডায়াগনস্টিক সেন্টারে সম্পন্ন করা গ্রহীতা ও চিকিৎসকদের দায়িত্ব।
          </p>
        </div>
      </div>
    </div>
  );
};
