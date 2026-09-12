import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Send,
  ShieldCheck,
  Calendar,
  AlertCircle,
  MessageCircle,
} from 'lucide-react';
import type { Donor } from '../types';
import { RequestDonorModal } from './RequestDonorModal';
import { useAuth } from '../contexts/AuthContext';
import { getDonorWhatsAppLink } from '../services/whatsappService';

interface DonorCardProps {
  donor: Donor;
  matchScore?: number;
  onSendRequestSuccess?: () => void;
}

export const DonorCard: React.FC<DonorCardProps> = ({
  donor,
  matchScore,
  onSendRequestSuccess,
}) => {
  const { currentUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPhoneRevealed, setIsPhoneRevealed] = useState(false);

  // Privacy rules:
  // Phone number is only exposed when the donor explicitly allowed it and the viewer is authenticated.
  // Admins may still access it for moderation, but anonymous users should never see a private number.
  const canViewPhone =
    (donor.privacy.showPhone && !!currentUser) ||
    currentUser?.role === 'super_admin' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'moderator';

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-slate-300 hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between">
        {/* Match score ribbon if provided by smart matching */}
        {typeof matchScore === 'number' && (
          <div className="absolute top-0 right-0 bg-slate-900 text-white text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-bl-md border-l border-b border-slate-700">
            ম্যাচ: {matchScore}%
          </div>
        )}

        <div>
          {/* Top Row: Blood Group & Verification Badge */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-3">
              {/* Big Blood Badge */}
              <div className="w-12 h-12 rounded-lg bg-red-50 border border-red-200 text-red-700 flex flex-col items-center justify-center font-black shadow-2xs">
                <span className="text-lg leading-none font-mono">{donor.bloodGroup}</span>
                <span className="text-[9px] font-semibold text-red-500 uppercase mt-0.5">গ্রুপ</span>
              </div>

              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-bold text-slate-900 text-base leading-tight">
                    {donor.fullName}
                  </h3>
                  {donor.verificationStatus === 'verified' && (
                    <span
                      title="ভেরিফাইড রক্তদাতা"
                      className="inline-flex items-center text-emerald-600"
                    >
                      <CheckCircle2 className="w-4 h-4 fill-emerald-100" />
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {donor.area}, {donor.upazila}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Key Indicators */}
          <div className="grid grid-cols-2 gap-2 my-3 text-xs">
            {/* Availability */}
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 block font-medium">উপলব্ধতা</span>
              <span
                className={`font-semibold inline-flex items-center gap-1 mt-0.5 ${
                  donor.availability ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    donor.availability ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                {donor.availability ? 'রক্তদানে প্রস্তুত' : 'সাময়িক অনুপলব্ধ'}
              </span>
            </div>

            {/* Total Donations */}
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 block font-medium">মোট রক্তদান</span>
              <span className="font-semibold text-slate-800 mt-0.5 block font-mono">
                {donor.totalDonations || 0} বার
              </span>
            </div>
          </div>

          {/* Last Donation Date */}
          <div className="text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2 mb-3">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              সর্বশেষ রক্তদান:
            </span>
            <span className="font-medium text-slate-700">
              {donor.lastDonationDate || 'নতুন রক্তদাতা'}
            </span>
          </div>

          {/* Emergency Availability Chip if active */}
          {donor.emergencyAvailable && (
            <div className="mb-3 px-2 py-1 rounded-md bg-red-50 border border-red-200/80 text-[11px] text-red-700 flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>জরুরি প্রয়োজনে ২৪ ঘণ্টা প্রস্তুত</span>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="pt-2.5 border-t border-slate-100 flex items-center gap-2">
          {/* Send Blood Request Button */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex-1 py-2 px-3 rounded-lg bg-red-600 hover:bg-red-700 border border-red-700/60 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            অনুরোধ পাঠান
          </button>

          {/* Call / WhatsApp buttons / privacy guard */}
          {canViewPhone ? (
            isPhoneRevealed ? (
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={`tel:${donor.phone}`}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1 border border-slate-200 transition-colors font-mono"
                  title="সরাসরি কল করুন"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-700" />
                </a>
                <a
                  href={getDonorWhatsAppLink({
                    name: donor.name,
                    phone: donor.phone,
                    bloodGroup: donor.bloodGroup,
                    upazila: donor.upazila,
                    district: donor.district,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-2 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs flex items-center gap-1 border border-emerald-600/30 shadow-2xs transition-transform active:scale-95"
                  title="WhatsApp এ মেসেজ পাঠান"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span className="text-[10px] hidden xs:inline">WhatsApp</span>
                </a>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsPhoneRevealed(true)}
                className="py-2 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs flex items-center gap-1 border border-slate-200 transition-colors cursor-pointer"
                title="নম্বর ও যোগাযোগ বিকল্প দেখুন"
              >
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[11px]">যোগাযোগ</span>
              </button>
            )
          ) : (
            <span
              className="py-2 px-2 rounded-lg bg-slate-50 text-slate-400 text-[10px] flex items-center gap-1 border border-slate-200"
              title="ডোনারের ফোন নম্বর গোপন রাখা হয়েছে। সরাসরি অনুরোধ পাঠান।"
            >
              <ShieldCheck className="w-3 h-3" />
              <span>গোপন</span>
            </span>
          )}

          {/* Details link */}
          <Link
            to={`/donor/${donor.id}`}
            className="py-2 px-2.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200 text-xs font-medium transition-colors"
          >
            বিবরণ
          </Link>
        </div>
      </div>

      {isModalOpen && (
        <RequestDonorModal
          donor={donor}
          matchScore={matchScore || 85}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            if (onSendRequestSuccess) onSendRequestSuccess();
          }}
        />
      )}
    </>
  );
};
