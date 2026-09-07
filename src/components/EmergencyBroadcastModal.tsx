import React, { useState } from 'react';
import type { BloodRequest } from '../types';
import {
  X,
  Share2,
  Copy,
  Check,
  Phone,
  MapPin,
  Clock,
  AlertTriangle,
  Send,
  MessageSquare,
  Sparkles,
  Printer,
} from 'lucide-react';

interface EmergencyBroadcastModalProps {
  request: BloodRequest;
  isOpen?: boolean;
  onClose: () => void;
}

export const EmergencyBroadcastModal: React.FC<EmergencyBroadcastModalProps> = ({
  request,
  isOpen = true,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Generate Bangla formatted broadcast message
  const broadcastText = `🚨 *জরুরি রক্তের আবেদন (রক্ত দান পরিবার কালামপুর)* 🚨
━━━━━━━━━━━━━━━━━━━━
🩸 *ব্লাড গ্রুপ:* ${request.bloodGroup}
📦 *প্রয়োজনীয় পরিমাণ:* ${request.requiredUnits} ব্যাগ
👤 *রোগীর নাম:* ${request.patientName}
🏥 *হাসপাতাল:* ${request.hospital}
📍 *ঠিকানা:* ${request.area}, ${request.upazila}, ${request.district}
📅 *তারিখ ও সময়:* ${request.requiredDate} (${request.requiredTime})
⚠️ *জরুরিতা:* ${request.emergencyLevel === 'CRITICAL' ? 'অত্যন্ত আশঙ্কাজনক (Critical)' : request.emergencyLevel === 'URGENT' ? 'জরুরি (Urgent)' : 'স্বাভাবিক'}
${request.notes ? `📝 *বিশেষ বিবরণ:* ${request.notes}\n` : ''}
📞 *যোগাযোগের নম্বর:* ${request.contactNumber} (${request.contactPerson} - ${request.relationship})
🆔 *আবেদন আইডি:* ${request.requestId}
━━━━━━━━━━━━━━━━━━━━
👉 বিস্তারিত তথ্য ও সহায়তা দিতে ভিজিট করুন: ${window.location.origin}/request/${request.id}
দয়া করে পোস্টটি শেয়ার করে মুমূর্ষু রোগীর জীবন বাঁচাতে সাহায্য করুন! 🙏`;

  const handleCopy = () => {
    navigator.clipboard.writeText(broadcastText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const encoded = encodeURIComponent(broadcastText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleDirectCall = () => {
    window.location.href = `tel:${request.contactNumber}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
              <Share2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-xl text-white">জরুরি রক্তের সোশ্যাল ব্রডকাস্ট কিট</h3>
              <p className="text-xs text-rose-100">১-ক্লিকে WhatsApp ও ফেসবুক গ্রুপে শেয়ারযোগ্য নোটিশ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Quick Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center justify-center gap-2 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-md transition transform active:scale-95 cursor-pointer text-sm"
            >
              <MessageSquare className="w-5 h-5 fill-current" />
              WhatsApp-এ সরাসরি শেয়ার করুন
            </button>
            <button
              onClick={handleCopy}
              className={`flex items-center justify-center gap-2 px-5 py-3.5 font-bold rounded-2xl shadow-md transition transform active:scale-95 cursor-pointer text-sm ${
                copied
                  ? 'bg-slate-900 text-emerald-400'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
              {copied ? 'মেসেজ কপি হয়েছে!' : 'মেসেজ টেক্সট কপি করুন'}
            </button>
          </div>

          {/* Visual Poster Card Preview */}
          <div className="rounded-2xl bg-gradient-to-br from-red-50 via-rose-50 to-amber-50 p-5 border-2 border-red-200 shadow-inner space-y-4">
            <div className="flex items-center justify-between border-b border-red-200/80 pb-3">
              <span className="flex items-center gap-1.5 px-3 py-1 bg-red-600 text-white font-extrabold text-xs rounded-full uppercase tracking-wider animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" /> জরুরি রক্তের প্রয়োজন
              </span>
              <span className="text-xs font-bold text-slate-500">{request.requestId}</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gradient-to-tr from-red-600 to-rose-600 text-white rounded-2xl flex flex-col items-center justify-center shadow-lg shrink-0">
                <span className="text-2xl md:text-3xl font-black">{request.bloodGroup}</span>
                <span className="text-[10px] font-bold text-rose-100">{request.requiredUnits} ব্যাগ</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-lg text-slate-900">{request.patientName} (রোগী)</h4>
                <p className="text-xs text-slate-600 flex items-center gap-1 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  {request.hospital} ({request.area}, {request.upazila})
                </p>
                <p className="text-xs text-slate-600 flex items-center gap-1 font-medium">
                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  তারিখ: {request.requiredDate} • {request.requiredTime}
                </p>
              </div>
            </div>

            <div className="bg-white/80 p-3 rounded-xl border border-red-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 font-medium block">জরুরি যোগাযোগ</span>
                <strong className="text-base text-red-700 font-black">{request.contactNumber}</strong>
                <span className="text-xs text-slate-600 ml-2">({request.contactPerson})</span>
              </div>
              <button
                onClick={handleDirectCall}
                className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-xl text-xs flex items-center gap-1 transition"
              >
                <Phone className="w-3.5 h-3.5" /> কল করুন
              </button>
            </div>
          </div>

          {/* Raw Formatted Text Box */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              কপি করার জন্য প্রস্তুত বাংলা মেসেজ
            </label>
            <textarea
              readOnly
              rows={8}
              value={broadcastText}
              className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none select-all"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition text-sm cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
