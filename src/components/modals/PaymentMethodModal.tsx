import React, { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { CreditCard, ShieldCheck } from 'lucide-react';
import type { PaymentMethodConfig } from '../../types';

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  methodToEdit?: PaymentMethodConfig | null;
  onSave: (data: Omit<PaymentMethodConfig, 'id'>) => Promise<void>;
}

export const PaymentMethodModal: React.FC<PaymentMethodModalProps> = ({
  isOpen,
  onClose,
  methodToEdit,
  onSave,
}) => {
  const isEditing = Boolean(methodToEdit);

  const [name, setName] = useState('bKash');
  const [nameBn, setNameBn] = useState('');
  const [type, setType] = useState<PaymentMethodConfig['type']>('bKash');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState<'personal' | 'merchant' | 'agent'>('personal');
  const [instructionsBn, setInstructionsBn] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (methodToEdit) {
      setName(methodToEdit.name);
      setNameBn(methodToEdit.nameBn);
      setType(methodToEdit.type);
      setAccountNumber(methodToEdit.accountNumber);
      setAccountType(methodToEdit.accountType);
      setInstructionsBn(methodToEdit.instructionsBn);
      setIsActive(methodToEdit.isActive);
    } else {
      setName('bKash');
      setNameBn('');
      setType('bKash');
      setAccountNumber('');
      setAccountType('personal');
      setInstructionsBn('');
      setIsActive(true);
    }
    setErrorMessage('');
  }, [methodToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!nameBn.trim() || !accountNumber.trim()) {
      setErrorMessage('অনুগ্রহ করে মেথডের নাম এবং একাউন্ট নম্বর প্রদান করুন।');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        name: name.trim() || type,
        nameBn: nameBn.trim(),
        type,
        accountNumber: accountNumber.trim(),
        accountType,
        instructionsBn: instructionsBn.trim(),
        isActive,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'পেমেন্ট মেথড সংরক্ষণ করতে ব্যর্থ হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      theme="modern"
      size="md"
      icon={<CreditCard className="w-5 h-5 text-red-600" />}
      title={isEditing ? 'পেমেন্ট মেথড এডিট করুন' : 'নতুন পেমেন্ট মেথড যুক্ত করুন'}
      subtitle="ডোনারদের অনুদান গ্রহণের জন্য একাউন্ট নম্বর ও নির্দেশনা আপডেট করুন।"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl"
          >
            বাতিল
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : isEditing ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1 text-xs">
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              মেথডের ধরণ *
            </label>
            <select
              value={type}
              onChange={(e) => {
                const val = e.target.value as PaymentMethodConfig['type'];
                setType(val);
                setName(val);
                if (!nameBn) {
                  if (val === 'bKash') setNameBn('বিকাশ (bKash)');
                  else if (val === 'Nagad') setNameBn('নগদ (Nagad)');
                  else if (val === 'Rocket') setNameBn('রকেট (Rocket)');
                  else if (val === 'Upay') setNameBn('উপায় (Upay)');
                  else if (val === 'Bank') setNameBn('ব্যাংক একাউন্ট');
                }
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium bg-slate-50 focus:bg-white"
            >
              <option value="bKash">বিকাশ (bKash)</option>
              <option value="Nagad">নগদ (Nagad)</option>
              <option value="Rocket">রকেট (Rocket)</option>
              <option value="Upay">উপায় (Upay)</option>
              <option value="Bank">ব্যাংক ট্রান্সফার (Bank)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              প্রদর্শনের নাম (বাংলা) *
            </label>
            <input
              type="text"
              required
              value={nameBn}
              onChange={(e) => setNameBn(e.target.value)}
              placeholder="যেমন: বিকাশ (মার্চেন্ট একাউন্ট)"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              একাউন্ট নম্বর *
            </label>
            <input
              type="text"
              required
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="01712-xxxxxx বা একাউন্ট নং"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              একাউন্টের ধরণ *
            </label>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium bg-slate-50 focus:bg-white"
            >
              <option value="personal">পার্সোনাল (Personal)</option>
              <option value="merchant">মার্চেন্ট (Merchant Payment)</option>
              <option value="agent">এজেন্ট (Agent Cash In)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            পেমেন্টের বিস্তারিত নির্দেশনা (বাংলা)
          </label>
          <textarea
            rows={3}
            value={instructionsBn}
            onChange={(e) => setInstructionsBn(e.target.value)}
            placeholder="কিভাবে টাকা পাঠাবেন, কোন অপশন সিলেক্ট করবেন ইত্যাদি বিস্তারিত লিখুন..."
            className="w-full px-3 py-2 border border-slate-300 rounded-xl"
          />
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded-sm text-red-600 focus:ring-red-500 w-4 h-4"
            />
            <span className="font-semibold text-slate-800">পেমেন্ট মেথডটি সক্রিয় রাখুন</span>
          </label>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
            {isActive ? 'Active' : 'Disabled'}
          </span>
        </div>
      </form>
    </BaseModal>
  );
};
