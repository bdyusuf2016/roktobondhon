import React from 'react';
import { Link } from 'react-router-dom';
import { Search, PlusCircle, Bell, Heart, ShieldCheck, Award } from 'lucide-react';

export const HowItWorksPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          কার্যপ্রণালী ও নির্দেশিকা
        </h1>
        <p className="text-sm text-slate-600 max-w-xl mx-auto">
          কীভাবে রক্তদাতা খুঁজবেন বা রক্তদাতা হিসেবে জীবন বাঁচাবেন—তার সহজ নির্দেশিকা
        </p>
      </div>

      {/* For Recipients */}
      <div className="bg-white rounded-xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-3">
          <span className="text-xs font-bold text-red-600 uppercase tracking-wider">গ্রহীতাদের জন্য</span>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            জরুরি প্রয়োজনে রক্ত পাওয়ার ৩টি সহজ ধাপ
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
            <span className="w-7 h-7 rounded-lg bg-red-600 text-white font-bold flex items-center justify-center">
              ১
            </span>
            <h3 className="font-bold text-sm text-slate-800">আবেদন তৈরি করুন</h3>
            <p className="text-slate-600 leading-relaxed">
              রোগীর নাম, রক্তের গ্রুপ, প্রয়োজনীয় ব্যাগ, হাসপাতালের নাম ও তারিখ উল্লেখ করে ফর্ম পূরণ করুন।
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
            <span className="w-7 h-7 rounded-lg bg-red-600 text-white font-bold flex items-center justify-center">
              ২
            </span>
            <h3 className="font-bold text-sm text-slate-800">স্মার্ট ম্যাচিং ফলাফল</h3>
            <p className="text-slate-600 leading-relaxed">
              সিস্টেম তাৎক্ষণিকভাবে ধামরাই, সাভার ও মানিকগঞ্জের উপযুক্ত ডোনারদের ১০০ পয়েন্ট স্কেলে স্কোর করে দেখাবে।
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
            <span className="w-7 h-7 rounded-lg bg-red-600 text-white font-bold flex items-center justify-center">
              ৩
            </span>
            <h3 className="font-bold text-sm text-slate-800">অনুরোধ পাঠান বা কল</h3>
            <p className="text-slate-600 leading-relaxed">
              সরাসরি রক্তদাতাকে অনুরোধ পাঠান। রক্তদাতা সাড়া দিলে হাসপাতালে রক্তদান নিশ্চিত করুন।
            </p>
          </div>
        </div>

        <div className="text-center pt-2">
          <Link
            to="/request-blood"
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg inline-flex items-center gap-2 shadow-xs transition-colors border border-red-700/60"
          >
            <PlusCircle className="w-4 h-4" />
            এখনই রক্তের আবেদন করুন
          </Link>
        </div>
      </div>

      {/* For Donors */}
      <div className="bg-white rounded-xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-3">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">রক্তদাতাদের জন্য</span>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            রক্তদাতা হিসেবে অংশগ্রহণের নিয়ম
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
            <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center">
              ১
            </span>
            <h3 className="font-bold text-sm text-slate-800">নিবন্ধন ও প্রোফাইল</h3>
            <p className="text-slate-600 leading-relaxed">
              আপনার রক্তের গ্রুপ, উপজেলা (ধামরাই/সাভার/মানিকগঞ্জ) এবং যোগাযোগের তথ্য দিয়ে সহজে যোগ দিন।
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
            <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center">
              ২
            </span>
            <h3 className="font-bold text-sm text-slate-800">ভেরিফিকেশন ও নিরাপত্তা</h3>
            <p className="text-slate-600 leading-relaxed">
              স্বেচ্ছাসেবী টিম আপনার তথ্য যাচাই করবে এবং আপনার ব্যক্তিগত ফোন নম্বর সর্বদা নিরাপদে রাখবে।
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
            <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center">
              ৩
            </span>
            <h3 className="font-bold text-sm text-slate-800">অনুরোধে সাড়া ও রক্তদান</h3>
            <p className="text-slate-600 leading-relaxed">
              জরুরি রক্তের বিজ্ঞপ্তি পেলে সম্মতি (Accept) দিন এবং সুবিধাজনক সময়ে রোগীকে রক্ত দিয়ে জীবন বাঁচান।
            </p>
          </div>
        </div>

        <div className="text-center pt-2">
          <Link
            to="/become-donor"
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg inline-flex items-center gap-2 shadow-xs transition-colors border border-emerald-700/60"
          >
            <Heart className="w-4 h-4" />
            রক্তদাতা হিসেবে নিবন্ধন করুন
          </Link>
        </div>
      </div>
    </div>
  );
};
