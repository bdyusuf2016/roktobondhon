import React, { useState } from 'react';
import { BaseModal, ModalTheme } from './BaseModal';
import { Droplet, Info, Sparkles, HeartHandshake } from 'lucide-react';
import type { BloodGroup } from '../../types';

interface BloodCompatibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: ModalTheme;
  initialGroup?: BloodGroup;
}

const ALL_GROUPS: BloodGroup[] = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

const COMPATIBILITY_DATA: Record<
  BloodGroup,
  {
    canGiveTo: BloodGroup[];
    canReceiveFrom: BloodGroup[];
    description: string;
    isUniversalDonor?: boolean;
    isUniversalRecipient?: boolean;
  }
> = {
  'O-': {
    canGiveTo: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    canReceiveFrom: ['O-'],
    description: 'সর্বজনীন দাতা (Universal Donor) — যেকোনো রক্তের গ্রুপের রোগীকে জরুরি মুহূর্তে ও-নেগেটিভ রক্ত দেওয়া যায়।',
    isUniversalDonor: true,
  },
  'O+': {
    canGiveTo: ['O+', 'A+', 'B+', 'AB+'],
    canReceiveFrom: ['O-', 'O+'],
    description: 'সবচেয়ে প্রচলিত রক্তের গ্রুপ — যেকোনো পজিটিভ রোগীকে রক্ত দিতে পারেন।',
  },
  'A-': {
    canGiveTo: ['A-', 'A+', 'AB-', 'AB+'],
    canReceiveFrom: ['O-', 'A-'],
    description: 'এ-নেগেটিভ ও এবি-নেগেটিভ রোগীদের পাশাপাশি পজিটিভদেরও রক্ত দিতে সক্ষম।',
  },
  'A+': {
    canGiveTo: ['A+', 'AB+'],
    canReceiveFrom: ['O-', 'O+', 'A-', 'A+'],
    description: 'এ-পজিটিভ এবং এবি-পজিটিভ রোগীদের রক্ত দিতে পারেন।',
  },
  'B-': {
    canGiveTo: ['B-', 'B+', 'AB-', 'AB+'],
    canReceiveFrom: ['O-', 'B-'],
    description: 'বিরল নেগেটিভ গ্রুপের রক্ত, বি ও এবি রোগীদের সাহায্য করতে পারেন।',
  },
  'B+': {
    canGiveTo: ['B+', 'AB+'],
    canReceiveFrom: ['O-', 'O+', 'B-', 'B+'],
    description: 'বাংলাদেশে অত্যন্ত বহুল প্রচলিত একটি রক্তের গ্রুপ।',
  },
  'AB-': {
    canGiveTo: ['AB-', 'AB+'],
    canReceiveFrom: ['O-', 'A-', 'B-', 'AB-'],
    description: 'খুবই বিরল একটি রক্তের গ্রুপ (১% এরও কম)।',
  },
  'AB+': {
    canGiveTo: ['AB+'],
    canReceiveFrom: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    description: 'সর্বজনীন গ্রহীতা (Universal Recipient) — যেকোনো গ্রুপের রক্ত গ্রহণ করতে পারেন।',
    isUniversalRecipient: true,
  },
};

export const BloodCompatibilityModal: React.FC<BloodCompatibilityModalProps> = ({
  isOpen,
  onClose,
  theme = 'glassmorphism',
  initialGroup = 'O+',
}) => {
  const [selectedGroup, setSelectedGroup] = useState<BloodGroup>(initialGroup);
  const data = COMPATIBILITY_DATA[selectedGroup];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      theme={theme}
      size="xl"
      icon={
        <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/30">
          <Droplet className="w-5 h-5 fill-white" />
        </div>
      }
      title="রক্তের গ্রুপ সামঞ্জস্যতা ডায়ালগ (Compatibility Guide)"
      subtitle="কোন রক্তের গ্রুপ কাকে রক্ত দিতে পারে এবং কার থেকে গ্রহণ করতে পারে তা জানুন"
      footer={
        <div className="w-full flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <Info className="w-4 h-4 text-red-500" />
            <span>জরুরি মুহূর্তে সঠিক সামঞ্জস্যতা নিশ্চিত করা অপরিহার্য</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold transition-colors"
          >
            বুঝেছি
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
            একটি রক্তের গ্রুপ নির্বাচন করুন:
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {ALL_GROUPS.map((group) => {
              const isSelected = selectedGroup === group;
              return (
                <button
                  key={group}
                  type="button"
                  onClick={() => setSelectedGroup(group)}
                  className={`py-2.5 px-2 rounded-xl text-center font-mono font-bold text-sm transition-all border ${
                    isSelected
                      ? 'bg-red-600 text-white border-red-700 shadow-md scale-105 ring-2 ring-red-400'
                      : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                  }`}
                >
                  {group}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-r from-red-50 via-rose-50 to-orange-50 border border-red-200/80">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-black text-red-700 bg-white px-3 py-1 rounded-lg border border-red-200 shadow-xs">
                {selectedGroup}
              </span>
              <span className="font-bold text-slate-900 text-sm">গ্রুপের বৈশিষ্ট্য</span>
            </div>
            {data.isUniversalDonor && (
              <span className="px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center gap-1 shadow-xs">
                <Sparkles className="w-3.5 h-3.5" /> সর্বজনীন দাতা
              </span>
            )}
            {data.isUniversalRecipient && (
              <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full flex items-center gap-1 shadow-xs">
                <HeartHandshake className="w-3.5 h-3.5" /> সর্বজনীন গ্রহীতা
              </span>
            )}
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">{data.description}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
            <div className="flex items-center gap-2 mb-3 text-emerald-900 font-bold text-xs sm:text-sm">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                ↑
              </div>
              <span>রক্ত দিতে পারবেন (Can Donate To):</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {ALL_GROUPS.map((g) => {
                const canGive = data.canGiveTo.includes(g);
                return (
                  <div
                    key={g}
                    className={`py-2 px-1 rounded-lg font-mono text-center text-xs font-bold border transition-all ${
                      canGive
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs font-black'
                        : 'bg-white/60 text-slate-400 border-slate-200 opacity-40 line-through'
                    }`}
                  >
                    {g}
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-emerald-800 mt-2.5">
              মোট {data.canGiveTo.length}টি গ্রুপের রোগীদের জীবন বাঁচাতে পারেন।
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200">
            <div className="flex items-center gap-2 mb-3 text-blue-900 font-bold text-xs sm:text-sm">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
                ↓
              </div>
              <span>রক্ত নিতে পারবেন (Can Receive From):</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {ALL_GROUPS.map((g) => {
                const canReceive = data.canReceiveFrom.includes(g);
                return (
                  <div
                    key={g}
                    className={`py-2 px-1 rounded-lg font-mono text-center text-xs font-bold border transition-all ${
                      canReceive
                        ? 'bg-blue-600 text-white border-blue-700 shadow-xs font-black'
                        : 'bg-white/60 text-slate-400 border-slate-200 opacity-40 line-through'
                    }`}
                  >
                    {g}
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-blue-800 mt-2.5">
              মোট {data.canReceiveFrom.length}টি গ্রুপ থেকে রক্ত গ্রহণ করতে পারবেন।
            </p>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};
