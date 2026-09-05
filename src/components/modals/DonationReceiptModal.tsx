import React from 'react';
import { BaseModal } from './BaseModal';
import { Heart, CheckCircle2, Copy, Download, Share2, ShieldCheck, Droplets } from 'lucide-react';
import type { FundDonation } from '../../types';
import { useDialog } from '../../contexts/DialogContext';

interface DonationReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  donation: FundDonation | null;
}

export const DonationReceiptModal: React.FC<DonationReceiptModalProps> = ({
  isOpen,
  onClose,
  donation,
}) => {
  const dialog = useDialog();

  if (!donation) return null;

  const handleCopyReceipt = () => {
    const text = `রক্তবন্ধন অনুদান স্বীকৃতি রসিদ\nরসিদ নং: ${donation.id}\nদাতা: ${donation.isAnonymous ? 'গোপন শুভানুধ্যায়ী' : donation.donorName}\nপরিমাণ: ৳${donation.amount.toLocaleString()}\nপেমেন্ট মেথড: ${donation.paymentMethod}\nTrxID: ${donation.transactionId}\nতারিখ: ${new Date(donation.createdAt).toLocaleDateString()}`;
    navigator.clipboard?.writeText(text);
    dialog.alert({
      title: 'রসিদ কপি হয়েছে',
      message: 'আপনার অনুদানের তথ্য ও রসিদ টেক্সট ক্লিপবোর্ডে কপি করা হয়েছে।',
      theme: 'success',
    });
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      theme="modern"
      size="md"
      icon={<Heart className="w-5 h-5 text-red-600 fill-red-600" />}
      title="অনুদান সফলভাবে জমা হয়েছে!"
      subtitle="মানবতার সেবায় রক্তবন্ধনকে সহায়তা করার জন্য আপনাকে আন্তরিক কৃতজ্ঞতা।"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={handleCopyReceipt}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5"
          >
            <Copy className="w-3.5 h-3.5" />
            রসিদ কপি করুন
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors"
          >
            ঠিক আছে
          </button>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        {/* Receipt Card */}
        <div className="p-5 bg-gradient-to-b from-red-50/70 to-slate-50 border-2 border-dashed border-red-200 rounded-2xl space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-red-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white">
                <Droplets className="w-4 h-4 fill-white" />
              </div>
              <div>
                <span className="font-bold text-xs text-slate-900 block leading-tight">
                  রক্তবন্ধন মানবকল্যাণ সংস্থা
                </span>
                <span className="text-[10px] text-red-600 font-semibold">
                  স্বীকৃতি ও অনুদান রসিদ
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-mono">
                {donation.id}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-semibold">
                যাচাই প্রক্রিয়া চলমান
              </span>
            </div>
          </div>

          <div className="text-center py-2">
            <span className="text-xs text-slate-500 font-medium">অনুদানের পরিমাণ</span>
            <div className="text-3xl font-black text-red-600 tracking-tight mt-0.5">
              ৳ {donation.amount.toLocaleString()}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-red-100/80">
            <div>
              <span className="text-slate-400 block text-[11px]">দাতার নাম:</span>
              <span className="font-bold text-slate-800">
                {donation.isAnonymous ? 'গোপন শুভানুধ্যায়ী' : donation.donorName}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">মোবাইল নম্বর:</span>
              <span className="font-mono text-slate-800">
                {donation.isAnonymous ? 'গোপন রাখা হয়েছে' : donation.donorPhone}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">পেমেন্ট মেথড:</span>
              <span className="font-semibold text-slate-800">
                {donation.paymentMethod}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">TrxID:</span>
              <span className="font-mono text-slate-800 font-bold">
                {donation.transactionId}
              </span>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-500 leading-relaxed border-t border-red-100/80">
            <p>
              আপনার প্রদত্ত অনুদানটি আমাদের এডমিন অডিট প্যানেলে জমা হয়েছে। যাচাই শেষে এটি সরাসরি আমাদের পাবলিক স্বচ্ছতা ও নিরীক্ষা রিপোর্টে যুক্ত হবে।
            </p>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};
