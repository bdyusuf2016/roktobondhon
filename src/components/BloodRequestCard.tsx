import React from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  MapPin,
  Building2,
  Users,
  AlertOctagon,
  ChevronRight,
  ShieldCheck,
  Share2,
} from 'lucide-react';
import type { BloodRequest } from '../types';
import { useDialog } from '../contexts/DialogContext';

interface BloodRequestCardProps {
  request: BloodRequest;
  onShare?: (req: BloodRequest) => void;
}

export const BloodRequestCard: React.FC<BloodRequestCardProps> = ({ request, onShare }) => {
  const dialog = useDialog();
  const getEmergencyBadge = (level: BloodRequest['emergencyLevel']) => {
    switch (level) {
      case 'CRITICAL':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-300 flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
            জরুরি / ক্রাইসিস
          </span>
        );
      case 'URGENT':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
            খুব জরুরি
          </span>
        );
      case 'NORMAL':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200">
            স্বাভাবিক
          </span>
        );
      case 'LOW':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            পরিকল্পিত
          </span>
        );
    }
  };

  const getStatusBadge = (status: BloodRequest['status']) => {
    switch (status) {
      case 'active':
        return <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">সক্রিয়</span>;
      case 'matched':
        return <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">ডোনার ম্যাচড</span>;
      case 'fulfilled':
        return <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">সম্পন্ন</span>;
      case 'pending':
        return <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">যাচাইকরণ বাকি</span>;
      default:
        return null;
    }
  };

  const handleCopyShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const patientDisplay = request.patientName ? `রোগী: ${request.patientName}\n` : '';
    const contactDisplay = request.contactNumber ? `যোগাযোগ: ${request.contactNumber}\n` : '';
    const shareText = `জরুরি রক্তের প্রয়োজন!\n${patientDisplay}রক্তের গ্রুপ: ${request.bloodGroup}\nপ্রয়োজন: ${request.requiredUnits} ব্যাগ\nহাসপাতাল: ${request.hospital}\nতারিখ: ${request.requiredDate}\n${contactDisplay}রক্ত দান পরিবার কালামপুর প্ল্যাটফর্ম: ${window.location.origin}/request/${request.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      dialog.alert({
        title: 'তথ্য কপি হয়েছে',
        message: 'রক্তের আবেদনের তথ্য কপি করা হয়েছে! ফেসবুকে বা মেসেঞ্জারে শেয়ার করতে পারেন।',
        type: 'success',
      });
    }
    if (onShare) onShare(request);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-slate-300 hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between">
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            {/* Blood Group Icon */}
            <div className="w-12 h-12 rounded-lg bg-red-600 border border-red-700 text-white flex flex-col items-center justify-center font-black shadow-xs">
              <span className="text-xl leading-none font-mono">{request.bloodGroup}</span>
              <span className="text-[9px] font-semibold uppercase opacity-90 mt-0.5">{request.requiredUnits} ব্যাগ</span>
            </div>

            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-bold text-slate-900 text-base leading-snug">
                  {request.patientName || `${request.hospital}-এ রক্ত প্রয়োজন`}
                </h3>
                {request.verification.isVerified && (
                  <span title="সংগঠন কর্তৃক যাচাইকৃত আবেদন" className="text-emerald-600">
                    <ShieldCheck className="w-4 h-4 fill-emerald-50" />
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                ID: {request.requestId}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            {getEmergencyBadge(request.emergencyLevel)}
            {getStatusBadge(request.status)}
          </div>
        </div>

        {/* Hospital & Location */}
        <div className="space-y-1.5 text-xs text-slate-600 mb-3">
          <div className="flex items-start gap-1.5">
            <Building2 className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span className="font-semibold text-slate-800 line-clamp-1">
              {request.hospital}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-500">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              {request.area}, {request.upazila}, {request.district}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-500">
            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              প্রয়োজন: <strong className="text-slate-800 font-semibold">{request.requiredDate}</strong> ({request.requiredTime})
            </span>
          </div>
        </div>

        {/* Notes if any */}
        {request.notes && (
          <div className="bg-slate-50 p-2.5 rounded-lg text-[11px] text-slate-600 mb-3 border border-slate-100 line-clamp-2">
            "{request.notes}"
          </div>
        )}
      </div>

      {/* Footer / Actions */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleCopyShare}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors"
          title="শেয়ার ও কপি করুন"
        >
          <Share2 className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          {request.contactNumber ? (
            <a
              href={`tel:${request.contactNumber}`}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
            >
              কল করুন
            </a>
          ) : (
            <Link
              to={`/request/${request.id}`}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
            >
              বিস্তারিত দেখুন
            </Link>
          )}

          <Link
            to={`/request/${request.id}`}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 border border-red-700/60 flex items-center gap-1 shadow-xs transition-colors"
          >
            <span>ম্যাচিং ডোনার দেখুন</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
