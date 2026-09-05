import React from 'react';
import { Heart, Droplets, Shield, Users, MapPin, Award } from 'lucide-react';
import { useOrgConfig } from '../contexts/OrgConfigContext';

export const AboutPage: React.FC = () => {
  const { config } = useOrgConfig();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-bold">
          <Heart className="w-3.5 h-3.5" />
          আমাদের পরিচয় ও লক্ষ্য
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          {config.name}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          {config.sloganBn}
        </p>
      </div>

      {/* Story & Vision */}
      <div className="bg-white rounded-xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-4 text-slate-700 text-sm leading-relaxed">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Droplets className="w-5 h-5 text-red-600" />
          আমাদের যাত্রা
        </h2>
        <p>
          রক্তের অভাবে যেন কোনো প্রাণ না হারায়—এই দৃঢ় অঙ্গীকার নিয়ে ধামরাই, সাভার এবং মানিকগঞ্জের একদল তরুণ-তরুণী ও মানবিক স্বেচ্ছাসেবকদের উদ্যোগে প্রতিষ্ঠিত হয় <strong>{config.name}</strong>।
        </p>
        <p>
          প্রচলিত সামাজিক যোগাযোগ মাধ্যম বা গ্রুপে রক্ত খোঁজা সময়সাপেক্ষ এবং অনেক সময় তথ্যের সঠিকতা যাচাই করা সম্ভব হয় না। আমরা একটি আধুনিক, স্মার্ট ও প্রাইভেসি-সুরক্ষিত ডিজিটাল প্ল্যাটফর্ম গড়ে তুলেছি, যাতে মুমূর্ষু রোগীর স্বজনরা তাৎক্ষণিকভাবে নিকটস্থ প্রকৃত রক্তদাতাদের সাথে যোগাযোগ করতে পারেন।
        </p>
      </div>

      {/* 3 Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs space-y-2 text-xs">
          <div className="w-10 h-10 rounded-lg bg-red-50 text-red-700 flex items-center justify-center font-bold border border-red-200">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900">নিরাপত্তা ও গোপনীয়তা</h3>
          <p className="text-slate-600">
            রক্তদাতাদের ব্যক্তিগত ফোন নম্বর ও ঠিকানা অনুমতি ব্যতিরেকে জনসম্মুখে প্রকাশ করা হয় না।
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs space-y-2 text-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold border border-emerald-200">
            <Heart className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900">শতভাগ নিঃস্বার্থ ও অলাভজনক</h3>
          <p className="text-slate-600">
            রক্ত কেনাবেচা বা কোনো আর্থিক লেনদেন সম্পূর্ণ নিষিদ্ধ। প্রতিটি রক্তদান একান্তই মানবিক উপহার।
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs space-y-2 text-xs">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold border border-blue-200">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900">স্মার্ট ম্যাচিং ও দ্রুত সেবা</h3>
          <p className="text-slate-600">
            দূরত্ব, সামঞ্জস্য ও সক্রিয়তার ওপর ভিত্তি করে অ্যালগরিদমিক পদ্ধতিতে দ্রুততম সময়ে ডোনার নিশ্চিত করা।
          </p>
        </div>
      </div>

      {/* Coverage Chapters */}
      <div className="bg-slate-900 text-white rounded-xl p-6 sm:p-8 space-y-4 border border-slate-800 shadow-md">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <MapPin className="w-5 h-5 text-red-500" />
          বর্তমান কর্মএলাকা ও ভবিষ্যৎ পরিকল্পনা
        </h2>
        <p className="text-slate-300 text-xs leading-relaxed">
          বর্তমানে আমাদের কার্যক্রম মূলত ঢাকা জেলার <strong>ধামরাই</strong> ও <strong>সাভার</strong> এবং <strong>মানিকগঞ্জ</strong> জেলাজুড়ে পরিচালিত হচ্ছে। প্রতিটি এলাকায় আমাদের ভলান্টিয়ার টিম স্থানীয় হাসপাতালগুলোতে সক্রিয় রয়েছে। পর্যায়ক্রমে আমরা বাংলাদেশের সকল জেলা ও উপজেলায় সাংগঠনিক শাখা বিস্তার করব।
        </p>
      </div>
    </div>
  );
};
