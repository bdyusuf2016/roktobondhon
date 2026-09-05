import React, { useState } from 'react';
import { BaseModal, ModalTheme } from './BaseModal';
import { PhoneCall, Copy, Check, Ambulance, Building2 } from 'lucide-react';

interface EmergencyHotlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: ModalTheme;
}

interface HotlineContact {
  id: string;
  name: string;
  category: string;
  number: string;
  available: string;
  iconType: 'ambulance' | 'hospital' | 'bloodbank' | 'emergency';
}

const CONTACTS: HotlineContact[] = [
  {
    id: '1',
    name: 'জাতীয় জরুরি সেবা (National Emergency)',
    category: 'পুলিশ, ফায়ার সার্ভিস ও অ্যাম্বুলেন্স',
    number: '999',
    available: '২৪/৭ সার্বক্ষণিক',
    iconType: 'emergency',
  },
  {
    id: '2',
    name: 'কোয়ান্টাম ল্যাব ও ব্লাড ব্যাংক',
    category: 'সেন্ট্রাল ব্লাড ব্যাংক',
    number: '01714010869',
    available: '২৪/৭ রক্ত সরবরাহ',
    iconType: 'bloodbank',
  },
  {
    id: '3',
    name: 'বাংলাদেশ রেড ক্রিসেন্ট ব্লাড সেন্টার',
    category: 'স্বেচ্ছাসেবী ব্লাড ব্যাংক',
    number: '029116563',
    available: 'সকাল ৯টা - রাত ৯টা',
    iconType: 'bloodbank',
  },
  {
    id: '4',
    name: 'সন্ধানী কেন্দ্রীয় রক্ত পরিসঞ্চালন কেন্দ্র',
    category: 'মেডিকেল শিক্ষার্থীদের স্বেচ্ছাসেবী সংগঠন',
    number: '029668633',
    available: '২৪ ঘণ্টা',
    iconType: 'bloodbank',
  },
  {
    id: '5',
    name: 'ধামরাই উপজেলা স্বাস্থ্য কমপ্লেক্স',
    category: 'উপজেলা সরকারি হাসপাতাল',
    number: '01730324838',
    available: 'জরুরি বিভাগ ২৪/৭',
    iconType: 'hospital',
  },
  {
    id: '6',
    name: 'সাভার এনাম মেডিকেল কলেজ ও হাসপাতাল',
    category: 'জরুরি রক্ত পরিসঞ্চালন ইউনিট',
    number: '01716358146',
    available: '২৪/৭ ইমার্জেন্সি',
    iconType: 'hospital',
  },
];

export const EmergencyHotlineModal: React.FC<EmergencyHotlineModalProps> = ({
  isOpen,
  onClose,
  theme = 'modern',
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, num: string) => {
    navigator.clipboard?.writeText(num);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      theme={theme}
      size="lg"
      icon={
        <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/30">
          <PhoneCall className="w-5 h-5" />
        </div>
      }
      title="জরুরি হটলাইন ও ব্লাড ব্যাংক যোগাযোগ"
      subtitle="তাত্ক্ষণিক জরুরি রক্ত সহায়তা, সরকারি হাসপাতাল এবং অ্যাম্বুলেন্স ডায়ালার"
      footer={
        <div className="w-full flex items-center justify-between">
          <span className="text-xs text-slate-500">জরুরি যে কোনো প্রয়োজনে ৯৯৯ এ ফ্রি কল করুন</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            বন্ধ করুন
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        {CONTACTS.map((item) => (
          <div
            key={item.id}
            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-red-200 transition-all flex items-center justify-between gap-3"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0 mt-0.5">
                {item.iconType === 'ambulance' || item.iconType === 'emergency' ? (
                  <Ambulance className="w-4 h-4" />
                ) : item.iconType === 'hospital' ? (
                  <Building2 className="w-4 h-4" />
                ) : (
                  <PhoneCall className="w-4 h-4" />
                )}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{item.name}</h4>
                <p className="text-[11px] text-slate-500">{item.category}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono font-bold text-xs text-red-700">{item.number}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
                    {item.available}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleCopy(item.id, item.number)}
                aria-label="Copy number"
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                title="নম্বর কপি করুন"
              >
                {copiedId === item.id ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
              <a
                href={`tel:${item.number}`}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-xs transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>কল</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </BaseModal>
  );
};
