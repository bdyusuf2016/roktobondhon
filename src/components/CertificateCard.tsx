import React, { useRef } from 'react';
import type { Donor, DonorBadge } from '../types';
import { Award, ShieldCheck, Heart, Droplet, Download, Printer, Share2, CheckCircle2, Sparkles, Calendar, MapPin, User as UserIcon } from 'lucide-react';
import { DONOR_BADGES_LIST } from '../data/seedData';
import { useSystemConfig } from '../contexts/SystemConfigContext';

interface CertificateCardProps {
  donor: Donor;
  onClose?: () => void;
}

export const CertificateCard: React.FC<CertificateCardProps> = ({ donor, onClose }) => {
  const { config } = useSystemConfig();
  const gamificationConfig = config?.gamification;

  const certificateRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const signatoryName =
    gamificationConfig?.organizationSignatoryNameBn ||
    gamificationConfig?.organizationSignatoryName ||
    'রক্ত দান পরিবার কালামপুর';

  const signatoryTitle =
    gamificationConfig?.organizationSignatoryTitleBn ||
    gamificationConfig?.organizationSignatoryTitle ||
    'অনুমোদিত কেন্দ্রীয় সমন্বয়ক';

  // Calculate earned badges
  const earnedBadges = DONOR_BADGES_LIST.filter(
    (badge) => donor.totalDonations >= badge.minDonations
  );
  const currentBadge = earnedBadges[earnedBadges.length - 1] || null;

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const text = `🩸 আমি রক্ত দান পরিবার কালামপুর প্ল্যাটফর্মে ভেরিফাইড রক্তদাতা হিসেবে ${donor.totalDonations} বার রক্তদান করেছি! আমার ডোনার আইডি: ${donor.donorId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'আমার রক্ত দান পরিবার কালামপুর ডোনার সার্টিফিকেট',
          text,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share canceled', err);
      }
    } else {
      navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      alert('সার্টিফিকেট শেয়ার লিংক ও তথ্য ক্লিপবোর্ডে কপি হয়েছে!');
    }
  };

  return (
    <div className="space-y-8 print:m-0 print:p-0">
      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 print:hidden">
        <div className="flex items-center gap-2">
          <Award className="w-6 h-6 text-amber-500 animate-pulse" />
          <h2 className="font-bold text-slate-800 text-lg">ডিজিটাল রক্তদাতা সনদপত্র ও আইডি</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition shadow-sm text-sm cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-slate-600" />
            শেয়ার করুন
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-medium rounded-xl transition shadow-md hover:shadow-lg text-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            প্রিন্ট / PDF সংরক্ষণ
          </button>
        </div>
      </div>

      {/* Main Certificate Sheet (A4 Proportion) */}
      <div
        ref={certificateRef}
        className="relative bg-gradient-to-br from-amber-50/40 via-white to-red-50/30 p-8 md:p-12 rounded-3xl border-8 border-double border-amber-500/30 shadow-2xl overflow-hidden print:border-amber-600 print:shadow-none print:p-8 print:w-full print:rounded-none"
      >
        {/* Background Watermark & Motifs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Certificate Header */}
        <div className="relative z-10 text-center space-y-3 pb-6 border-b border-amber-200/80">
          <div className="inline-flex items-center justify-center">
            {config?.branding?.logoUrl ? (
              <img
                src={config.branding.logoUrl}
                alt="Logo"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover shadow-lg ring-2 ring-amber-300"
              />
            ) : (
              <div className="p-3 bg-red-600 text-white rounded-2xl shadow-lg shadow-red-200">
                <Droplet className="w-8 h-8 fill-current" />
              </div>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-red-700 via-rose-800 to-amber-700 bg-clip-text text-transparent">
            {config?.organization?.organizationNameBn || config?.organization?.organizationName || 'রক্ত দান পরিবার কালামপুর'}
          </h1>
          <p className="text-xs md:text-sm font-semibold text-slate-500 tracking-widest uppercase">
            {config?.organization?.sloganBn || config?.organization?.slogan || 'স্বেচ্ছাসেবী রক্তদান প্ল্যাটফর্ম'} • Certificate of Appreciation
          </p>
          <div className="inline-block px-4 py-1 rounded-full bg-amber-100/80 border border-amber-300 text-amber-800 font-bold text-sm tracking-wide">
            ★ মানবতার সম্মাননা সনদপত্র ★
          </div>
        </div>

        {/* Certificate Body */}
        <div className="relative z-10 my-8 text-center space-y-6">
          <p className="text-slate-600 text-base md:text-lg font-serif italic">
            এই প্রশংসাপত্রটি অত্যন্ত কৃতজ্ঞতা ও শ্রদ্ধার সাথে প্রদান করা হচ্ছে—
          </p>

          {/* Donor Name */}
          <div className="py-2">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-normal border-b-2 border-dashed border-red-300 inline-block px-8 pb-2">
              {donor.fullName}
            </h2>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
              <span className="px-3.5 py-1 bg-red-100 text-red-700 font-bold text-sm rounded-full flex items-center gap-1.5 shadow-sm">
                <Droplet className="w-4 h-4 fill-current" /> ব্লাড গ্রুপ: {donor.bloodGroup}
              </span>
              <span className="px-3.5 py-1 bg-slate-100 text-slate-700 font-semibold text-sm rounded-full">
                আইডি: {donor.donorId}
              </span>
              {donor.verificationStatus === 'verified' && (
                <span className="px-3.5 py-1 bg-emerald-100 text-emerald-700 font-bold text-sm rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> অফিশিয়াল ভেরিফাইড
                </span>
              )}
            </div>
          </div>

          <p className="max-w-2xl mx-auto text-slate-700 text-base md:text-lg leading-relaxed font-normal">
            স্বেচ্ছায় <strong>{donor.totalDonations} বার</strong> রক্তদান করে মুমূর্ষু রোগীর জীবন রক্ষা ও মানবতার সেবায় অনন্য সাধারণ অবদান রাখার জন্য ‘রক্ত দান পরিবার কালামপুর’ প্ল্যাটফর্মের পক্ষ থেকে এই বিশেষ সম্মাননা স্বীকৃতি প্রদান করা হলো।
          </p>

          {/* Achievement Badge Banner */}
          {currentBadge && (
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 shadow-sm text-slate-800">
              <Award className="w-7 h-7 text-amber-600 animate-bounce" />
              <div className="text-left">
                <span className="text-xs uppercase font-bold text-amber-700 tracking-wider">অর্জিত পদক</span>
                <p className="text-base font-extrabold text-amber-900">{currentBadge.titleBn}</p>
              </div>
            </div>
          )}
        </div>

        {/* Certificate Footer / Signature Grid */}
        <div className="relative z-10 pt-8 border-t border-amber-200/80 grid grid-cols-3 items-end gap-4 text-center">
          {/* Issue Date & Location */}
          <div className="space-y-1 text-left">
            <p className="text-xs text-slate-500 font-medium">ইস্যুর তারিখ:</p>
            <p className="text-sm font-bold text-slate-800">
              {new Date().toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-xs text-slate-500">{donor.upazila}, {donor.district}</p>
          </div>

          {/* Official Golden Seal */}
          <div className="flex flex-col items-center justify-center">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-dashed border-amber-500 flex flex-col items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-xl rotate-[-6deg]">
              <ShieldCheck className="w-8 h-8 md:w-10 md:h-10" />
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-tighter">ভেরিফাইড সিল</span>
            </div>
          </div>

          {/* Authority Signature */}
          <div className="space-y-1 text-right">
            <div className="inline-block border-b-2 border-slate-700 pb-1 px-4">
              <span className="font-serif italic text-slate-800 font-bold text-sm md:text-base">{signatoryName}</span>
            </div>
            <p className="text-xs text-slate-500">{signatoryTitle}</p>
          </div>
        </div>
      </div>

      {/* Digital Donor Wallet Card Preview */}
      <div className="pt-4 print:hidden">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-red-600" />
          ডিজিটাল রক্তদাতা স্মার্ট কার্ড (Pocket Card Preview)
        </h3>

        <div
          ref={cardRef}
          className="max-w-md mx-auto relative rounded-3xl bg-gradient-to-tr from-slate-900 via-rose-950 to-red-900 text-white p-6 shadow-2xl border border-rose-500/30 overflow-hidden"
        >
          {/* Card Glass Accent */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/20 rounded-full blur-2xl pointer-events-none" />

          {/* Card Top */}
          <div className="flex items-center justify-between border-b border-rose-500/20 pb-4 mb-4">
            <div className="flex items-center gap-2">
              {config?.branding?.logoUrl ? (
                <img
                  src={config.branding.logoUrl}
                  alt="Logo"
                  className="w-7 h-7 rounded-full object-cover border border-rose-400/50 shrink-0"
                />
              ) : (
                <div className="p-1.5 bg-red-600 rounded-lg">
                  <Droplet className="w-5 h-5 fill-current" />
                </div>
              )}
              <div>
                <h4 className="font-black text-sm tracking-wide">রক্ত দান পরিবার কালামপুর</h4>
                <p className="text-[10px] text-rose-300">DONOR DIGITAL CARD</p>
              </div>
            </div>
            <div className="text-right">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-500/30 border border-red-400 text-red-200">
                {donor.bloodGroup}
              </span>
            </div>
          </div>

          {/* Card Center Info */}
          <div className="flex items-center gap-4 my-2">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border-2 border-rose-400 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
              {donor.photoUrl ? (
                <img src={donor.photoUrl} alt={donor.fullName} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-8 h-8 text-rose-300" />
              )}
            </div>
            <div>
              <h5 className="font-bold text-lg text-white leading-tight">{donor.fullName}</h5>
              <p className="text-xs text-rose-200 mt-0.5">আইডি: {donor.donorId}</p>
              <p className="text-xs text-slate-300 flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5 text-rose-400" /> {donor.upazila}, {donor.district}
              </p>
            </div>
          </div>

          {/* Card Bottom Badges & Stats */}
          <div className="mt-4 pt-3 border-t border-rose-500/20 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-rose-300 block">মোট রক্তদান</span>
              <strong className="text-sm font-bold text-white">{donor.totalDonations} বার</strong>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-rose-300 block">স্ট্যাটাস</span>
              <strong className="text-sm font-bold text-emerald-400">
                {donor.availability ? 'প্রস্তুত (Active)' : 'বিরতিতে'}
              </strong>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-rose-300 block">অর্জিত পদক</span>
              <strong className="text-xs font-bold text-amber-300">
                {currentBadge ? currentBadge.titleBn.split(' ')[0] : 'নবীন'}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
