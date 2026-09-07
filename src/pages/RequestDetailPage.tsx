import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  Calendar,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  Share2,
  Users,
  Award,
  AlertOctagon,
  ArrowLeft,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useDialog } from '../contexts/DialogContext';
import { useSmartMatching } from '../hooks/useSmartMatching';
import { DonorCard } from '../components/DonorCard';
import { RequestDonorModal } from '../components/RequestDonorModal';
import { EmergencyBroadcastModal } from '../components/EmergencyBroadcastModal';
import { SocialShareBar } from '../components/common/SocialShareBar';
import { useSEO } from '../hooks/useSEO';
import type { Donor } from '../types';

export const RequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { bloodRequests, donors, updateBloodRequestStatus, verifyBloodRequest } = useData();
  const { currentUser } = useAuth();
  const dialog = useDialog();

  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  const [selectedDonorForModal, setSelectedDonorForModal] = useState<{
    donor: Donor;
    score: number;
  } | null>(null);

  const request = bloodRequests.find((r) => r.id === id || r.requestId === id);

  useSEO({
    title: request ? `${request.bloodGroup} রক্তের জরুরি প্রয়োজন - ${request.patientName || request.hospital}` : 'রক্তের আবেদন বিবরণ',
    description: request ? `${request.hospital}, ${request.district}-এ ${request.bloodGroup} রক্তের জরুরি প্রয়োজন। প্রয়োজনীয় পরিমাণ: ${request.requiredUnits} ব্যাগ।` : undefined,
    bloodRequest: request,
  });

  const matchCriteria = useMemo(() => {
    if (!request) return null;
    return {
      patientBloodGroup: request.bloodGroup,
      district: request.district,
      upazila: request.upazila,
      isEmergency: request.emergencyLevel === 'CRITICAL' || request.emergencyLevel === 'URGENT',
    };
  }, [request]);

  const { matchedDonors, weightsDescription } = useSmartMatching(donors, matchCriteria);

  if (!request) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">
          রক্তের আবেদনটি খুঁজে পাওয়া যায়নি
        </h2>
        <p className="text-xs text-slate-500">
          অনুরোধটি সম্পন্ন বা অপসারিত হয়ে থাকতে পারে।
        </p>
        <Link
          to="/find-blood"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg border border-red-700/60 shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          রক্তের আবেদন তালিকায় ফিরুন
        </Link>
      </div>
    );
  }

  const isPrivileged =
    currentUser?.role === 'super_admin' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'moderator';

  const handleShare = () => {
    const patientText = request.patientName ? `রোগী: ${request.patientName}\n` : '';
    const contactText = request.contactNumber ? `মোবাইল: ${request.contactNumber}\n` : '';
    const text = `জরুরি রক্তের প্রয়োজন!\n${patientText}গ্রুপ: ${request.bloodGroup} (${request.requiredUnits} ব্যাগ)\nহাসপাতাল: ${request.hospital}\nতারিখ: ${request.requiredDate}\n${contactText}রক্তবন্ধন লিঙ্ক: ${window.location.href}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      dialog.alert({
        title: 'কপি সম্পন্ন হয়েছে!',
        message: 'রক্তের আবেদন কপি হয়েছে! সামাজিক যোগাযোগ মাধ্যমে শেয়ার করতে পারেন।',
        type: 'success',
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          পূর্ববর্তী পৃষ্ঠায় ফিরুন
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowBroadcastModal(true)}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            সোশ্যাল ব্রডকাস্ট কিট (WhatsApp)
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200 cursor-pointer"
          >
            কপি
          </button>

          {isPrivileged && (
            <div className="flex items-center gap-2">
              {!request.verification.isVerified && (
                <button
                  type="button"
                  onClick={() => verifyBloodRequest(request.id, currentUser?.fullName || 'Admin')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs border border-emerald-700/60"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  যাচাই নিশ্চিত করুন
                </button>
              )}
              {request.status !== 'fulfilled' && (
                <button
                  type="button"
                  onClick={() => updateBloodRequestStatus(request.id, 'fulfilled')}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs border border-purple-700/60"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  সম্পন্ন চিহ্নিত করুন
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Request Hero Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="flex items-start gap-4">
            {/* Big Blood Badge */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-red-600 text-white flex flex-col items-center justify-center font-black border border-red-700/70 shadow-xs shrink-0">
              <span className="text-2xl sm:text-3xl leading-none font-mono">{request.bloodGroup}</span>
              <span className="text-[10px] font-semibold opacity-90 mt-0.5">{request.requiredUnits} ব্যাগ</span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {request.requestId}
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {request.patientName || `${request.hospital}-এ রক্ত প্রয়োজন`}
                </h1>
                {request.verification.isVerified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    ভেরিফাইড
                  </span>
                )}
              </div>

              {request.contactPerson && (
                <p className="text-xs text-slate-500">
                  যোগাযোগকারী: <strong className="text-slate-700">{request.contactPerson}</strong> {request.relationship ? `(${request.relationship})` : ''}
                </p>
              )}

              <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <Building2 className="w-4 h-4 text-red-600" />
                  <strong>{request.hospital}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {request.area}, {request.upazila}, {request.district}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-slate-400" />
                  {request.requiredDate} ({request.requiredTime})
                </span>
              </div>
            </div>
          </div>

          {/* Action box */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
            {request.contactNumber ? (
              <a
                href={`tel:${request.contactNumber}`}
                className="px-5 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs border border-emerald-700/60 transition-colors"
              >
                <Phone className="w-4 h-4" />
                কল করুন ({request.contactNumber})
              </a>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1 text-center max-w-xs">
                <span className="font-semibold text-slate-800 block">রোগীর তথ্যের নিরাপত্তা নিশ্চিতকরণ</span>
                <span>সরাসরি যোগাযোগের জন্য লগইন করুন বা সংগঠনের হটলাইনে যোগাযোগ করুন।</span>
              </div>
            )}
          </div>
        </div>

        {request.notes && (
          <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
            <span className="font-bold text-slate-800">অতিরিক্ত নোট / রোগীর বিবরণ: </span>
            {request.notes}
          </div>
        )}
      </div>

      {/* Social Sharing Crisis Broadcast Bar */}
      <SocialShareBar request={request} />

      {/* Smart Matching Engine Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                স্মার্ট ম্যাচিং রক্তদাতা তালিকা ({matchedDonors.length} জন ম্যাচড)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {weightsDescription}
            </p>
          </div>

          <div className="text-xs text-slate-600 font-medium">
            সর্বোচ্চ স্কোর অনুযায়ী সাজানো
          </div>
        </div>

        {matchedDonors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {matchedDonors.map((m) => (
              <DonorCard
                key={m.donor.id}
                donor={m.donor}
                matchScore={m.matchScore}
                onSendRequestSuccess={() => {
                  dialog.alert({
                    title: 'অনুরোধ পাঠানো হয়েছে',
                    message: 'রক্তদাতার কাছে সফলভাবে রক্তের অনুরোধ পাঠানো হয়েছে!',
                    type: 'success',
                  });
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200/90 p-6 space-y-3 shadow-xs">
            <p className="text-sm font-bold text-slate-700">
              এই মুহূর্তে শতভাগ ম্যাচিং ডোনার পাওয়া যায়নি
            </p>
            <p className="text-xs text-slate-500">
              নিকটবর্তী উপজেলার ডোনারদের সাথে যোগাযোগ করতে সাধারণ অনুসন্ধান ব্যবহার করুন।
            </p>
            <Link
              to="/find-blood"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold border border-red-700/60 inline-block shadow-xs"
            >
              সাধারণ ডোনার তালিকা দেখুন
            </Link>
          </div>
        )}
      </div>

      {selectedDonorForModal && (
        <RequestDonorModal
          donor={selectedDonorForModal.donor}
          matchScore={selectedDonorForModal.score}
          onClose={() => setSelectedDonorForModal(null)}
          onSuccess={() => setSelectedDonorForModal(null)}
        />
      )}

      {showBroadcastModal && request && (
        <EmergencyBroadcastModal
          request={request}
          isOpen={showBroadcastModal}
          onClose={() => setShowBroadcastModal(false)}
        />
      )}
    </div>
  );
};
