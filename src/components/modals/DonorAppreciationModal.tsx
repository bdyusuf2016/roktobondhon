import React, { useState } from 'react';
import { BaseModal, ModalTheme } from './BaseModal';
import { Award, Heart, Share2, Check, Sparkles } from 'lucide-react';

interface DonorAppreciationModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: ModalTheme;
  donorName?: string;
  bloodGroup?: string;
  donationCount?: number;
  badgeTitle?: string;
  memberSince?: string;
}

export const DonorAppreciationModal: React.FC<DonorAppreciationModalProps> = ({
  isOpen,
  onClose,
  theme = 'warmFriendly',
  donorName = 'তানভীর আহমেদ',
  bloodGroup = 'O+',
  donationCount = 7,
  badgeTitle = 'গোল্ড জীবন রক্ষক (Gold Life Saver)',
}) => {
  const [copied, setCopied] = useState(false);
  const livesSaved = Math.max(1, donationCount * 3);

  const handleShare = () => {
    navigator.clipboard?.writeText(
      `রক্ত দান পরিবার কালামপুর প্ল্যাটফর্মে ${donorName} এ পর্যন্ত ${donationCount} বার রক্তদান করে প্রায় ${livesSaved} জনের জীবন রক্ষায় অবদান রেখেছেন! রক্ত দিন, জীবন বাঁচান। ❤️`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      theme={theme}
      size="md"
      icon={
        <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
          <Award className="w-5 h-5" />
        </div>
      }
      title="রক্তদাতা সম্মাননা ও ভার্চুয়াল সার্টিফিকেট"
      subtitle="মানবতার সেবায় নিঃস্বার্থ রক্তদানের জন্য কৃতজ্ঞতাপত্র"
      footer={
        <div className="w-full flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl flex items-center gap-1.5 transition-colors border border-slate-200"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">লিঙ্ক কপি হয়েছে!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-slate-500" />
                <span>শেয়ার করুন</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-red-500/20"
          >
            ধন্যবাদ
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-2xl border-2 border-amber-300/80 bg-gradient-to-br from-amber-50/90 via-white to-rose-50/70 p-5 text-center shadow-md">
          <div className="absolute -right-12 -top-12 w-28 h-28 bg-gradient-to-br from-amber-400 to-rose-500 opacity-20 rounded-full blur-xl pointer-events-none"></div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold mb-3 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>অনারারি রক্তদাতা স্বীকৃতি সনদ</span>
          </div>

          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 to-red-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30 mb-2 border-2 border-white">
            <Heart className="w-7 h-7 fill-white" />
          </div>

          <h3 className="text-lg font-black text-slate-900 tracking-tight">{donorName}</h3>
          <p className="text-xs font-semibold text-rose-700 mt-0.5">
            রক্তের গ্রুপ: <span className="font-mono font-bold text-sm text-red-700">{bloodGroup}</span>
          </p>

          <div className="mt-4 p-3 bg-white/90 backdrop-blur-xs rounded-xl border border-amber-200/80 grid grid-cols-2 gap-2 text-center">
            <div>
              <span className="block text-2xl font-black text-slate-900">{donationCount}</span>
              <span className="text-[11px] font-semibold text-slate-500 uppercase">মোট রক্তদান</span>
            </div>
            <div className="border-l border-amber-100">
              <span className="block text-2xl font-black text-emerald-600">~{livesSaved}</span>
              <span className="text-[11px] font-semibold text-slate-500 uppercase">জীবন বাঁচিয়েছেন</span>
            </div>
          </div>

          <div className="mt-3 inline-block px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs font-bold text-amber-900">
            ব্যাজ: {badgeTitle}
          </div>

          <p className="text-[11px] text-slate-500 mt-3 italic">
            "আপনার দেওয়া এক ব্যাগ রক্তে একটি পরিবার ফিরে পায় নতুন আশা।"
          </p>
        </div>
      </div>
    </BaseModal>
  );
};
