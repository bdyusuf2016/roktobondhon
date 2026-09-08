import React, { useEffect, useState } from 'react';
import {
  Award,
  Download,
  Share2,
  CheckCircle2,
  Droplet,
  ShieldCheck,
  Heart,
  Sparkles,
  QrCode as QrIcon,
  User as UserIcon,
  CreditCard,
  FileText,
  MapPin,
  Printer,
  ExternalLink,
  Globe,
} from 'lucide-react';
import type { Donor } from '../types';
import { DONOR_BADGES_LIST } from '../data/seedData';
import { useDialog } from '../contexts/DialogContext';
import { useOrgConfig } from '../contexts/OrgConfigContext';
import { useSystemConfig } from '../contexts/SystemConfigContext';
import {
  generateDonorQrDataUrl,
  generateDonorVerificationUrl,
  printCertificateInStandaloneWindow,
  PRIMARY_DOMAIN,
} from '../services/certificatePrintService';

interface CertificateCardProps {
  donor: Donor;
  onClose?: () => void;
}

export const CertificateCard: React.FC<CertificateCardProps> = ({ donor }) => {
  const dialog = useDialog();
  const { config: orgConfig } = useOrgConfig();
  const { config: sysConfig } = useSystemConfig();

  const [activeView, setActiveView] = useState<'certificate' | 'idcard'>('certificate');
  const [isSharing, setIsSharing] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Gamification & Signatory configurations
  const gamification = sysConfig.gamification;
  const signatoryName =
    gamification?.organizationSignatoryNameBn ||
    gamification?.organizationSignatoryName ||
    'মোহাম্মদ ইউসুফ';
  const signatoryTitle =
    gamification?.organizationSignatoryTitleBn ||
    gamification?.organizationSignatoryTitle ||
    'সভাপতি ও প্রতিষ্ঠাতা';
  const orgNameBn = orgConfig.name || 'রক্ত দান পরিবার কালামপুর';
  const logoUrl = orgConfig.logoUrl;

  // Determine highest achieved badge tier
  const sortedBadges = [...DONOR_BADGES_LIST].sort(
    (a, b) => b.minDonations - a.minDonations
  );
  const currentBadge = sortedBadges.find(
    (b) => donor.totalDonations >= b.minDonations
  );

  // Verification URL & Certificate Number
  const verifyUrl = generateDonorVerificationUrl(donor.donorId);
  const certNumber = `RDPK-CERT-${donor.donorId}-${donor.totalDonations > 0 ? donor.totalDonations : '1'}`;
  const issueDateBn = new Date().toLocaleDateString('bn-BD', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Generate live QR code on mount or donor change
  useEffect(() => {
    let isMounted = true;
    generateDonorQrDataUrl(donor.donorId).then((url) => {
      if (isMounted) {
        setQrCodeDataUrl(url);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [donor.donorId]);

  // High-fidelity Standalone HTML Print Handler
  const handleStandalonePrint = async () => {
    setIsPrinting(true);
    try {
      await printCertificateInStandaloneWindow({
        donor,
        orgName: orgNameBn,
        logoUrl,
        signatoryName,
        signatoryTitle,
      });
    } catch (err) {
      console.error('Standalone print failed, falling back to window.print():', err);
      window.print();
    } finally {
      setIsPrinting(false);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    const shareText = `মানবতার সেবায় নিবেদিতপ্রাণ রক্তদাতা ${donor.fullName}-এর রক্তদান স্বীকৃতি সনদপত্র ও ডিজিটাল ডোনার কার্ড। অনলাইন ভেরিফিকেশন লিঙ্ক:`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${donor.fullName} - রক্তদান স্বীকৃতি সনদপত্র`,
          text: `${shareText} ${verifyUrl}`,
          url: verifyUrl,
        });
      } catch {
        // User canceled share
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${verifyUrl}`);
        dialog.alert({
          title: 'ভেরিফিকেশন লিঙ্ক কপি হয়েছে!',
          message: 'সনদপত্রের অনলাইন ভেরিফিকেশন লিঙ্ক ক্লিপবোর্ডে কপি করা হয়েছে। যে কাউকে শেয়ার করতে পারেন।',
          theme: 'success',
        });
      } catch {
        dialog.alert({
          title: 'কপি করা যায়নি',
          message: 'দয়া করে ব্রাউজারের অ্যাড্রেস বার থেকে লিঙ্কটি কপি করুন।',
          theme: 'danger',
        });
      }
    }
    setIsSharing(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto print:m-0 print:p-0">
      {/* Control Navigation & Action Bar (Hidden in print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs print:hidden">
        {/* Toggle View: Full A4 Certificate vs Pocket ID Card */}
        <div className="flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveView('certificate')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeView === 'certificate'
                ? 'bg-white text-red-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            পূর্ণাঙ্গ সনদপত্র (A4)
          </button>
          <button
            type="button"
            onClick={() => setActiveView('idcard')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeView === 'idcard'
                ? 'bg-white text-red-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            স্মার্ট ডোনার কার্ড
          </button>
        </div>

        {/* Actions: Share & Print */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            disabled={isSharing}
            className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-500" />
            শেয়ার করুন
          </button>
          <button
            type="button"
            onClick={handleStandalonePrint}
            disabled={isPrinting}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            {isPrinting ? 'প্রস্তুত হচ্ছে...' : 'এইচটিএমএল প্রিন্ট / PDF সংরক্ষণ'}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. FULL OFFICIAL A4 CERTIFICATE (Majestic Full-Page Fill Layout) */}
      {/* ========================================================================= */}
      {activeView === 'certificate' && (
        <div className="flex items-center justify-center w-full py-2">
          <div
            id="official-certificate-sheet"
            className="certificate-sheet relative w-full max-w-[289mm] bg-radial from-white via-amber-50/20 to-orange-50/40 text-slate-900 border-8 border-amber-700 outline outline-3 outline-amber-400 -outline-offset-8 rounded-2xl p-6 sm:p-9 md:p-10 pb-9 sm:pb-12 md:pb-14 shadow-2xl overflow-hidden font-sans transition-all mx-auto"
          >
            {/* Subtle Watermark BG */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] pointer-events-none select-none">
              {logoUrl ? (
                <img src={logoUrl} alt="Watermark" className="w-[450px] h-[450px] object-contain grayscale" />
              ) : (
                <Heart className="w-[450px] h-[450px] text-red-600 fill-red-600" />
              )}
            </div>

            {/* Corner Ornate Accents */}
            <div className="absolute top-2.5 left-2.5 w-8 h-8 border-t-4 border-l-4 border-amber-700 pointer-events-none" />
            <div className="absolute top-2.5 right-2.5 w-8 h-8 border-t-4 border-r-4 border-amber-700 pointer-events-none" />
            <div className="absolute bottom-2.5 left-2.5 w-8 h-8 border-b-4 border-l-4 border-amber-700 pointer-events-none" />
            <div className="absolute bottom-2.5 right-2.5 w-8 h-8 border-b-4 border-r-4 border-amber-700 pointer-events-none" />

            {/* Rosettes */}
            <span className="absolute top-3 left-3 text-amber-600 text-xs select-none pointer-events-none">✦</span>
            <span className="absolute top-3 right-3 text-amber-600 text-xs select-none pointer-events-none">✦</span>
            <span className="absolute bottom-3 left-3 text-amber-600 text-xs select-none pointer-events-none">✦</span>
            <span className="absolute bottom-3 right-3 text-amber-600 text-xs select-none pointer-events-none">✦</span>

            {/* Inner Gold Borders */}
            <div className="absolute inset-2 border border-amber-300/80 rounded-xl pointer-events-none" />
            <div className="absolute inset-3 border border-dashed border-amber-200/90 rounded-lg pointer-events-none" />

            {/* Content Layer */}
            <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
              {/* 1. Header (Bigger typography) */}
              <div className="text-center space-y-2 pb-3 border-b-2 border-amber-200/80">
                <div className="flex items-center justify-center gap-4">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={orgNameBn}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-amber-500 shadow-md shrink-0"
                    />
                  ) : (
                    <div className="p-3 bg-red-600 text-white rounded-full shadow-md shrink-0">
                      <Droplet className="w-7 h-7 fill-current" />
                    </div>
                  )}
                  <div className="text-left">
                    <h2 className="text-2xl sm:text-4xl font-black text-red-900 tracking-tight leading-tight">
                      {orgNameBn}
                    </h2>
                    <p className="text-xs sm:text-sm text-amber-800 font-bold uppercase tracking-wider">
                      স্বেচ্ছাসেবী রক্তদান ও মানবিক কল্যাণ নেটওয়ার্ক • কালামপুর, ধামরাই, সাভার, মানিকগঞ্জ
                    </p>
                  </div>
                </div>

                <div className="pt-1">
                  <span className="inline-block px-7 py-1.5 rounded-full bg-gradient-to-r from-amber-700 via-amber-500 to-amber-700 text-white font-black text-xs sm:text-base tracking-widest shadow-md uppercase border border-amber-200">
                    ★ আজীবন মানবতার সম্মাননা ও স্বীকৃতি সনদপত্র ★
                  </span>
                </div>
              </div>

              {/* 2. Main Body (Prominent & Large with comfortable Line Spacing) */}
              <div className="py-2 text-center space-y-4">
                <p className="text-sm sm:text-base text-slate-700 font-semibold italic tracking-wide">
                  অত্যন্ত গৌরব ও গভীর কৃতজ্ঞতার সহিত এই সম্মাননা প্রশংসাপত্র প্রদান করা হচ্ছে —
                </p>

                {/* Honoree / Donor Name */}
                <div className="inline-block px-8 py-1.5 border-b-2 border-red-600 bg-gradient-to-r from-transparent via-red-50/70 to-transparent">
                  <h3 className="text-3xl sm:text-5xl md:text-6xl font-black text-red-700 tracking-tight leading-snug">
                    {donor.fullName}
                  </h3>
                </div>

                {/* Tags Row */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                  <span className="px-4 py-1 rounded-full bg-red-100 text-red-800 font-black text-xs sm:text-base flex items-center gap-1.5 border border-red-300 shadow-2xs">
                    <Droplet className="w-4 h-4 fill-red-600 text-red-600" /> রক্তের গ্রুপ: {donor.bloodGroup}
                  </span>
                  <span className="px-4 py-1 rounded-full bg-slate-100 text-slate-800 font-mono text-xs sm:text-base font-black border border-slate-300 shadow-2xs">
                    আইডি: {donor.donorId}
                  </span>
                  {donor.upazila && (
                    <span className="px-4 py-1 rounded-full bg-amber-50 text-amber-900 text-xs sm:text-base font-bold border border-amber-200 flex items-center gap-1.5 shadow-2xs">
                      <MapPin className="w-4 h-4 text-amber-600" /> {donor.upazila}, {donor.district}
                    </span>
                  )}
                  <span className="px-4 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs sm:text-base font-black border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> ভেরিফায়েড রক্তদাতা
                  </span>
                </div>

                {/* Commendation Paragraph with enhanced line-height */}
                <p className="max-w-3xl mx-auto text-sm sm:text-base md:text-lg text-slate-900 leading-[1.85] font-medium pt-1.5 pb-1">
                  জরুরি মুহূর্তে মুমূর্ষু রোগীর জীবন রক্ষার্থে নিঃস্বার্থভাবে <strong>{donor.totalDonations} বার রক্তদান</strong> করে মানবতার এক উজ্জ্বল ও অনুপ্রেরণাদায়ী দৃষ্টান্ত স্থাপন করেছেন।
                  সমাজ, দেশ ও মানবজাতির কল্যাণে আপনার এই মহান আত্মত্যাগের স্বীকৃতিস্বরূপ ‘<strong>{orgNameBn}</strong>’-এর পক্ষ থেকে
                  আপনাকে জানাই আন্তরিক মোবারকবাদ, অসীম শ্রদ্ধা ও রক্তিম শুভেচ্ছা।
                </p>

                {/* Achievement Tier Badge Banner */}
                {currentBadge ? (
                  <div className="pt-1">
                    <div className="inline-flex items-center gap-3.5 px-7 py-2.5 rounded-2xl bg-gradient-to-r from-amber-50 via-amber-100 to-orange-100 border-2 border-amber-300 shadow-xs text-slate-900">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-xs text-sm font-bold"
                        style={{ backgroundColor: currentBadge.color }}
                      >
                        <Award className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <span className="text-[11px] uppercase font-bold text-amber-800 tracking-wider block leading-tight">
                          অর্জিত গৌরবময় পদক
                        </span>
                        <p className="text-sm sm:text-base font-black text-amber-950 leading-tight">
                          {currentBadge.titleBn} ({donor.totalDonations} বার সফল রক্তদান সম্পন্ন)
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="pt-1">
                    <div className="inline-flex items-center gap-2.5 px-6 py-2 rounded-xl bg-amber-50 border border-amber-200 text-slate-800">
                      <Sparkles className="w-5 h-5 text-amber-600" />
                      <span className="text-sm font-bold text-amber-900">রক্তদাতা সদস্য • মানবতার সেবায় নিবেদিতপ্রাণ</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Footer / Signature & QR Row (Elevated safely above bottom frame) */}
              <div className="pt-4 pb-2 mb-1 border-t-2 border-amber-200/90 grid grid-cols-3 items-end gap-2 text-center text-xs">
                {/* Left: Dynamic Scannable Live QR Code */}
                <div className="space-y-0.5 text-left">
                  <div className="flex items-center gap-3">
                    {qrCodeDataUrl ? (
                      <img
                        src={qrCodeDataUrl}
                        alt="Verify QR Code"
                        className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl border-2 border-slate-300 bg-white p-1 shadow-xs shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-slate-900 text-white p-2 flex items-center justify-center shrink-0 border border-slate-700">
                        <QrIcon className="w-full h-full" />
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">সনদপত্র নং</p>
                      <p className="text-xs sm:text-sm font-mono font-black text-slate-900 truncate">{certNumber}</p>
                      <p className="text-[10.5px] text-slate-600 mt-0.5 font-medium">ইস্যুর তারিখ: {issueDateBn}</p>
                      <p className="text-[10.5px] text-sky-700 font-mono font-bold">roktodanporibar.com</p>
                      <span className="text-[9.5px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> কিউআর স্ক্যান করে যাচাই করুন
                      </span>
                    </div>
                  </div>
                </div>

                {/* Center: Official Golden Seal */}
                <div className="flex flex-col items-center justify-center">
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full border-2 border-dashed border-amber-600 flex flex-col items-center justify-center bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 text-white shadow-lg rotate-[-4deg]">
                    <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8" />
                    <span className="text-[8.5px] sm:text-[9px] font-black uppercase tracking-tighter text-center leading-tight mt-0.5">
                      ভেরিফাইড সিল<br />কালামপুর ঢাকা
                    </span>
                  </div>
                </div>

                {/* Right: Authorized Signatory */}
                <div className="space-y-0.5 text-right">
                  <div className="inline-block border-b-2 border-slate-800 pb-0.5 px-4">
                    <span className="font-serif italic font-black text-slate-900 text-sm sm:text-lg">
                      {signatoryName}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-800">{signatoryTitle}</p>
                  <p className="text-[11px] text-slate-500 font-semibold">{orgNameBn}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SMART DONOR ID CARD SHEET */}
      {/* ========================================================================= */}
      {activeView === 'idcard' && (
        <div className="id-card-sheet space-y-6 py-4">
          <div className="max-w-md mx-auto relative rounded-3xl bg-gradient-to-tr from-slate-950 via-rose-950 to-red-950 text-white p-6 shadow-2xl border-2 border-rose-500/40 overflow-hidden font-sans">
            {/* Card Accent Glow */}
            <div className="absolute top-0 right-0 w-44 h-44 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />

            {/* Card Top Branding */}
            <div className="flex items-center justify-between border-b border-rose-500/30 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={orgNameBn}
                    className="w-8 h-8 rounded-full object-cover border border-rose-400/60 shrink-0"
                  />
                ) : (
                  <div className="p-1.5 bg-red-600 rounded-lg shadow-xs">
                    <Droplet className="w-5 h-5 fill-current" />
                  </div>
                )}
                <div>
                  <h4 className="font-black text-sm text-white tracking-tight">{orgNameBn}</h4>
                  <p className="text-[10px] text-rose-300 tracking-wider uppercase font-semibold">
                    DIGITAL DONOR SMART CARD
                  </p>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-600 text-white font-mono font-black text-xl flex items-center justify-center shadow-inner border border-red-400">
                {donor.bloodGroup}
              </div>
            </div>

            {/* Card Center Info */}
            <div className="flex items-center gap-4 my-3">
              <div className="w-18 h-18 rounded-2xl bg-slate-900 border-2 border-rose-400/80 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                {donor.photoUrl ? (
                  <img src={donor.photoUrl} alt={donor.fullName} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-9 h-9 text-rose-300" />
                )}
              </div>
              <div className="space-y-1">
                <h5 className="font-black text-lg text-white leading-tight">{donor.fullName}</h5>
                <p className="text-xs text-rose-200 font-mono font-bold">আইডি: {donor.donorId}</p>
                <p className="text-xs text-slate-300 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" /> {donor.upazila}, {donor.district}
                </p>
              </div>
            </div>

            {/* Card Bottom Stats */}
            <div className="mt-4 pt-3 border-t border-rose-500/30 grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-rose-300 block">মোট রক্তদান</span>
                <strong className="text-sm font-bold text-white font-mono">{donor.totalDonations} বার</strong>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-rose-300 block">স্ট্যাটাস</span>
                <strong className="text-xs font-bold text-emerald-400">
                  {donor.availability ? '● প্রস্তুত (Active)' : '○ বিরতিতে'}
                </strong>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-rose-300 block">অর্জিত পদক</span>
                <strong className="text-xs font-bold text-amber-300">
                  {currentBadge ? currentBadge.titleBn.split(' ')[0] : 'নবীন'}
                </strong>
              </div>
            </div>

            {/* QR Scan & Security Tag */}
            <div className="mt-3 pt-2.5 border-t border-rose-500/20 flex items-center justify-between text-[10px] text-rose-300/90">
              <span className="flex items-center gap-1 text-emerald-300 font-semibold">
                <ShieldCheck className="w-3 h-3" /> অফিশিয়াল ভেরিফাইড মেম্বার
              </span>
              <span className="font-mono text-slate-300">roktodanporibar.com</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
