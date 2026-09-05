import React, { useState } from 'react';
import { BaseModal, ModalTheme } from './BaseModal';
import { Flame, Clock, Send, ShieldAlert, Hospital, CheckCircle2 } from 'lucide-react';
import type { BloodGroup } from '../../types';

interface EmergencyAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: ModalTheme;
  initialBloodGroup?: BloodGroup;
  initialHospital?: string;
  initialBags?: number;
}

export const EmergencyAlertModal: React.FC<EmergencyAlertModalProps> = ({
  isOpen,
  onClose,
  theme = 'emergency',
  initialBloodGroup = 'O-',
  initialHospital = 'ধামরাই উপজেলা স্বাস্থ্য কমপ্লেক্স',
  initialBags = 2,
}) => {
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>(initialBloodGroup);
  const [hospital, setHospital] = useState(initialHospital);
  const [bags, setBags] = useState(initialBags);
  const [urgency, setUrgency] = useState<'CRITICAL' | 'URGENT' | 'STANDARD'>('CRITICAL');
  const [sendSmsBroadcast, setSendSmsBroadcast] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setSentSuccess(true);
      setTimeout(() => {
        setSentSuccess(false);
        onClose();
      }, 1600);
    }, 1200);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      theme={theme}
      size="lg"
      icon={
        <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/30 animate-pulse">
          <Flame className="w-5 h-5 fill-white" />
        </div>
      }
      title="জরুরি রক্তের রিকুয়েস্ট ব্রডকাস্ট"
      subtitle="নিকটবর্তী রক্তদাতাদের স্মার্টফোনে তাত্ক্ষণিক উচ্চ-অগ্রাধিকার অ্যালার্ট যাবে"
    >
      {sentSuccess ? (
        <div className="py-8 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h4 className="text-xl font-bold text-slate-900">জরুরি অ্যালার্ট সম্প্রচারিত হয়েছে!</h4>
          <p className="text-sm text-slate-600 max-w-sm mx-auto">
            ধামরাই, সাভার ও মানিকগঞ্জ অঞ্চলের {bloodGroup} গ্রুপের রেজিস্টার্ড রক্তদাতাদের কাছে পুশ অ্যালার্ট ও এসএমএস পাঠানো হয়েছে।
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              জরুরিতার মাত্রা (Urgency Level)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setUrgency('CRITICAL')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                  urgency === 'CRITICAL'
                    ? 'bg-red-600 text-white border-red-700 shadow-md ring-2 ring-red-300'
                    : 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
                }`}
              >
                <Flame className="w-4 h-4" />
                <span>ক্রিটিকাল (১-২ ঘণ্টা)</span>
              </button>
              <button
                type="button"
                onClick={() => setUrgency('URGENT')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                  urgency === 'URGENT'
                    ? 'bg-amber-600 text-white border-amber-700 shadow-md ring-2 ring-amber-300'
                    : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>জরুরি (৪-৬ ঘণ্টা)</span>
              </button>
              <button
                type="button"
                onClick={() => setUrgency('STANDARD')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                  urgency === 'STANDARD'
                    ? 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-300'
                    : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>স্বাভাবিক (২৪ ঘণ্টা)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                প্রয়োজনীয় রক্তের গ্রুপ
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-red-700 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              >
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                  <option key={bg} value={bg}>{bg} রক্ত</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                রক্তের পরিমাণ (ব্যাগ)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={bags}
                onChange={(e) => setBags(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Hospital className="w-3.5 h-3.5 text-slate-500" />
              হাসপাতালের নাম ও অবস্থান
            </label>
            <input
              type="text"
              value={hospital}
              onChange={(e) => setHospital(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              placeholder="যেমন: এনাম মেডিকেল কলেজ হাসপাতাল, সাভার"
            />
          </div>

          <label className="flex items-start gap-2.5 p-3 bg-red-50/70 border border-red-200 rounded-xl cursor-pointer hover:bg-red-50">
            <input
              type="checkbox"
              checked={sendSmsBroadcast}
              onChange={(e) => setSendSmsBroadcast(e.target.checked)}
              className="mt-0.5 rounded text-red-600 focus:ring-red-500 h-4 w-4"
            />
            <div className="text-xs">
              <span className="font-bold text-red-950 block">তাৎক্ষণিক এসএমএস ব্রডকাস্ট পাঠান</span>
              <span className="text-red-700">উপজেলা ভলান্টিয়ার টিম ও সক্রিয় রক্তদাতাদের হটলাইনে নোটিফিকেশন পৌঁছাবে।</span>
            </div>
          </label>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              বাতিল করুন
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md shadow-red-600/20 border border-red-700 transition-all disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5" />
              {isSending ? 'সম্প্রচার হচ্ছে...' : 'জরুরি ব্রডকাস্ট পাঠান'}
            </button>
          </div>
        </form>
      )}
    </BaseModal>
  );
};
