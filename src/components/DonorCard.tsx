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
import { toBengaliNumber } from '../utils/bengali';

interface DonorCardProps {
  donor: Donor;
  matchScore?: number;
  bloodRequestId?: string;
  onSendRequestSuccess?: () => void;
  viewMode?: 'grid' | 'list';
  compact?: boolean;
}

export const DonorCard: React.FC<DonorCardProps> = ({
  donor,
  matchScore,
  bloodRequestId,
  onSendRequestSuccess,
  viewMode = 'grid',
  compact = false,
}) => {
  const { currentUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPhoneRevealed, setIsPhoneRevealed] = useState(false);

  // Privacy rules:
  // Phone number is only exposed when the donor explicitly allowed it and the viewer is authenticated.
  // Admins may still access it for moderation, but anonymous users should never see a private number.
  const canViewPhone =
    Boolean(donor.phone && donor.phone.trim() !== '') &&
    ((donor.privacy?.showPhone && !!currentUser) ||
      currentUser?.role === 'super_admin' ||
      currentUser?.role === 'admin' ||
      currentUser?.role === 'moderator');

  if (viewMode === 'list') {
    return (
      <>
        <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 sm:p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-slate-300 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-3.5 relative overflow-hidden group">
          {/* Match score ribbon */}
          {typeof matchScore === 'number' && (
            <div className="absolute top-0 right-0 bg-slate-900 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-bl-md border-l border-b border-slate-700">
              ম্যাচ: {toBengaliNumber(matchScore)}%
            </div>
          )}

          {/* Left Column: Blood badge, Name, Verification, Location */}
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-xl bg-red-50 border border-red-200 text-red-700 flex flex-col items-center justify-center font-black shadow-2xs shrink-0 font-mono">
              <span className="text-lg leading-none">{donor.bloodGroup}</span>
              <span className="text-[9px] font-semibold text-red-500 uppercase mt-0.5">গ্রুপ</span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link
                  to={`/donor/${donor.id}`}
                  className="font-bold text-slate-900 text-base leading-tight hover:text-red-600 transition-colors truncate"
                >
                  {donor.fullName}
                </Link>
                {donor.verificationStatus === 'verified' && (
                  <span title="ভেরিফাইড রক্তদাতা" className="inline-flex items-center text-emerald-600 shrink-0">
                    <CheckCircle2 className="w-4 h-4 fill-emerald-100" />
                  </span>
                )}
                {donor.emergencyAvailable && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200/80 text-[10px] font-semibold shrink-0">
                    <AlertCircle className="w-3 h-3 text-red-600" />
                    জরুরি ২৪/৭
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 sm:gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                <span className="flex items-center gap-1 shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{donor.area}, {donor.upazila}</span>
                </span>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <span className="flex items-center gap-1 text-[11px] text-slate-500 shrink-0">
                  <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                  সর্বশেষ: {donor.lastDonationDate || 'নতুন রক্তদাতা'}
                </span>
              </div>
            </div>
          </div>

          {/* Middle Meta: Availability & Donation Count */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0 border-t md:border-t-0 pt-2.5 md:pt-0 border-slate-100">
            {/* Availability Pill */}
            <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200/80">
              <span
                className={`w-2 h-2 rounded-full ${
                  donor.availability ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className={donor.availability ? 'text-emerald-700' : 'text-amber-700'}>
                {donor.availability ? 'রক্তদানে প্রস্তুত' : 'সাময়িক অনুপলব্ধ'}
              </span>
            </div>

            {/* Total Donations Count */}
            <div className="text-xs text-slate-600 font-medium">
              <span className="font-bold text-slate-900 font-mono">{toBengaliNumber(donor.totalDonations || 0)}</span> বার রক্তদান
            </div>
          </div>

          {/* Right Action Area */}
          <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-2.5 md:pt-0 border-slate-100 justify-end">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="py-1.5 sm:py-2 px-3 sm:px-3.5 rounded-lg bg-red-600 hover:bg-red-700 border border-red-700/60 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>অনুরোধ পাঠান</span>
            </button>

            {canViewPhone ? (
              isPhoneRevealed ? (
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={`tel:${donor.phone}`}
                    className="p-1.5 sm:p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1 border border-slate-200 transition-colors font-mono"
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
                    className="p-1.5 sm:p-2 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs flex items-center gap-1 border border-emerald-600/30 shadow-2xs transition-transform active:scale-95"
                    title="WhatsApp এ মেসেজ পাঠান"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsPhoneRevealed(true)}
                  className="py-1.5 sm:py-2 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs flex items-center gap-1 border border-slate-200 transition-colors cursor-pointer"
                  title="যোগাযোগ বিকল্প দেখুন"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[11px]">যোগাযোগ</span>
                </button>
              )
            ) : (
              <span
                className="py-1.5 sm:py-2 px-2 rounded-lg bg-slate-50 text-slate-400 text-[10px] flex items-center gap-1 border border-slate-200"
                title="ডোনারের ফোন নম্বর গোপন রাখা হয়েছে। সরাসরি অনুরোধ পাঠান।"
              >
                <ShieldCheck className="w-3 h-3" />
                <span>গোপন</span>
              </span>
            )}

            <Link
              to={`/donor/${donor.id}`}
              className="py-1.5 sm:py-2 px-2.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 text-xs font-semibold transition-colors"
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
  }

  if (compact) {
    return (
      <>
        <div className="bg-white rounded-xl border border-slate-200/90 p-3 sm:p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-slate-300 hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between group">
          {/* Match score ribbon */}
          {typeof matchScore === 'number' && (
            <div className="absolute top-0 right-0 bg-slate-900 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-bl-md border-l border-b border-slate-700 z-10">
              ম্যাচ: {toBengaliNumber(matchScore)}%
            </div>
          )}

          <div>
            {/* Top Row: Blood Group Badge & Donor Info */}
            <div className="flex items-start gap-2.5 mb-2.5">
              {/* Blood Badge */}
              <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-200 text-red-700 flex flex-col items-center justify-center font-black shadow-2xs shrink-0 font-mono">
                <span className="text-base leading-none font-black">{donor.bloodGroup}</span>
                <span className="text-[8px] font-semibold text-red-500 uppercase leading-none mt-0.5">গ্রুপ</span>
              </div>

              {/* Name & Location */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <Link
                    to={`/donor/${donor.id}`}
                    className="font-bold text-slate-900 text-sm leading-tight hover:text-red-600 transition-colors truncate block"
                    title={donor.fullName}
                  >
                    {donor.fullName}
                  </Link>
                  {donor.verificationStatus === 'verified' && (
                    <span title="ভেরিফাইড রক্তদাতা" className="inline-flex items-center text-emerald-600 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-100" />
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5 truncate">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{donor.area || donor.upazila}, {donor.district}</span>
                </div>
              </div>
            </div>

            {/* Quick Status Bar: Availability & Total Donations */}
            <div className="flex items-center justify-between text-[11px] py-1 px-2 rounded-lg bg-slate-50 border border-slate-100/90 mb-2">
              <span
                className={`font-semibold inline-flex items-center gap-1 shrink-0 ${
                  donor.availability ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    donor.availability ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                {donor.availability ? 'প্রস্তুত' : 'অনুপলব্ধ'}
              </span>
              <span className="text-slate-600 font-medium shrink-0 font-mono text-[11px]">
                {toBengaliNumber(donor.totalDonations || 0)} বার রক্তদান
              </span>
            </div>

            {/* Last Donation Date */}
            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2 px-0.5">
              <span className="flex items-center gap-1 text-slate-400">
                <Calendar className="w-2.5 h-2.5" />
                সর্বশেষ:
              </span>
              <span className="font-medium text-slate-700 truncate max-w-[120px]">
                {donor.lastDonationDate || 'নতুন রক্তদাতা'}
              </span>
            </div>

            {/* Emergency badge if available */}
            {donor.emergencyAvailable && (
              <div className="mb-2 px-1.5 py-0.5 rounded bg-red-50/80 border border-red-200/60 text-[10px] text-red-700 flex items-center gap-1 font-medium">
                <AlertCircle className="w-2.5 h-2.5 shrink-0 text-red-600" />
                <span className="truncate">জরুরি প্রয়োজনে ২৪/৭ প্রস্তুত</span>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex-1 py-1.5 px-2 rounded-lg bg-red-600 hover:bg-red-700 border border-red-700/60 text-white font-semibold text-xs flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-3 h-3" />
              <span>অনুরোধ</span>
            </button>

            {canViewPhone ? (
              isPhoneRevealed ? (
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={`tel:${donor.phone}`}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center border border-slate-200 transition-colors"
                    title="সরাসরি কল করুন"
                  >
                    <Phone className="w-3.5 h-3.5 text-slate-700" />
                  </a>
                  <a
                    href={getDonorWhatsAppLink({
                      name: donor.fullName || donor.name,
                      phone: donor.phone,
                      bloodGroup: donor.bloodGroup,
                      upazila: donor.upazila,
                      district: donor.district,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs flex items-center justify-center border border-emerald-600/30 shadow-2xs transition-transform active:scale-95"
                    title="WhatsApp এ মেসেজ পাঠান"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsPhoneRevealed(true)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs flex items-center justify-center border border-slate-200 transition-colors cursor-pointer"
                  title="যোগাযোগ বিকল্প দেখুন"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                </button>
              )
            ) : (
              <span
                className="p-1.5 rounded-lg bg-slate-50 text-slate-400 text-[10px] flex items-center justify-center border border-slate-200"
                title="ডোনারের ফোন নম্বর গোপন রাখা হয়েছে। সরাসরি অনুরোধ পাঠান।"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
              </span>
            )}

            <Link
              to={`/donor/${donor.id}`}
              className="py-1.5 px-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 text-xs font-semibold transition-colors shrink-0"
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
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-slate-300 hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between">
        {/* Match score ribbon if provided by smart matching */}
        {typeof matchScore === 'number' && (
          <div className="absolute top-0 right-0 bg-slate-900 text-white text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-bl-md border-l border-b border-slate-700">
            ম্যাচ: {toBengaliNumber(matchScore)}%
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
                {toBengaliNumber(donor.totalDonations || 0)} বার
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
          preSelectedRequestId={bloodRequestId}
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
