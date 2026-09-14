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
  Heart,
  MessageCircle,
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
import { volunteerForBloodRequest } from '../services/donorRequestService';
import { getAcceptedDonorContactInSupabase } from '../services/bloodRequestService';
import { getRequestWhatsAppLink } from '../services/whatsappService';
import type { Donor } from '../types';

export const RequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    bloodRequests,
    donors,
    donorRequests,
    updateBloodRequestStatus,
    verifyBloodRequest,
    completeDonationFulfillment,
  } = useData();
  const { currentUser } = useAuth();
  const dialog = useDialog();

  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [hasVolunteered, setHasVolunteered] = useState(false);
  const [isVolunteering, setIsVolunteering] = useState(false);
  const [isFulfilling, setIsFulfilling] = useState(false);
  const [revealedContacts, setRevealedContacts] = useState<Record<string, { phone: string; fullName: string }>>({});
  const [loadingContactId, setLoadingContactId] = useState<string | null>(null);

  const [selectedDonorForModal, setSelectedDonorForModal] = useState<{
    donor: Donor;
    score: number;
  } | null>(null);

  const request = bloodRequests.find((r) => r.id === id || r.requestId === id);
  const myDonor = donors.find((d) => d.userId === currentUser?.id || d.phone === currentUser?.phone);

  const currentDonorRequests = useMemo(() => {
    if (!request) return [];
    return donorRequests.filter((dr) => dr.bloodRequestId === request.id || dr.bloodRequestId === request.requestId);
  }, [donorRequests, request]);

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

  const isOwner = Boolean(currentUser?.id && request?.userId === currentUser.id);

  const handleShare = () => {
    const patientText = request.patientName ? `রোগী: ${request.patientName}\n` : '';
    const contactText = request.contactNumber ? `মোবাইল: ${request.contactNumber}\n` : '';
    const text = `জরুরি রক্তের প্রয়োজন!\n${patientText}গ্রুপ: ${request.bloodGroup} (${request.requiredUnits} ব্যাগ)\nহাসপাতাল: ${request.hospital}\nতারিখ: ${request.requiredDate}\n${contactText}রক্ত দান পরিবার কালামপুর লিঙ্ক: ${window.location.href}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      dialog.alert({
        title: 'কপি সম্পন্ন হয়েছে!',
        message: 'রক্তের আবেদন কপি হয়েছে! সামাজিক যোগাযোগ মাধ্যমে শেয়ার করতে পারেন।',
        type: 'success',
      });
    }
  };

  const handleVolunteer = async () => {
    if (!myDonor || !request) return;
    setIsVolunteering(true);
    try {
      const res = await volunteerForBloodRequest(request, myDonor);
      setHasVolunteered(true);
      dialog.alert({
        title: res.isDuplicate ? 'ইতিমধ্যে লিপিবদ্ধ রয়েছে' : 'ধন্যবাদ!',
        message: res.isDuplicate
          ? 'আপনি ইতিমধ্যে এই অনুরোধে রক্ত দিতে সম্মতি জানিয়েছেন।'
          : 'আপনার রক্তদানের আগ্রহ সফলভাবে গ্রহণ করা হয়েছে। রোগীর স্বজন বা সংগঠন থেকে আপনার সাথে দ্রুত যোগাযোগ করা হতে পারে।',
        type: 'success',
      });
    } catch (err: any) {
      dialog.alert({
        title: 'সমস্যা হয়েছে',
        message: err?.message || 'রক্তদানের সাড়া গ্রহণ করতে ব্যর্থ হয়েছে।',
        type: 'error',
      });
    } finally {
      setIsVolunteering(false);
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
      <div className="bg-white rounded-xl border border-slate-200/90 p-6 sm:p-8 shadow-xs relative overflow-hidden space-y-4">
        {request.status === 'fulfilled' && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2.5 text-xs font-bold text-emerald-900 shadow-2xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>এই রক্তের অনুরোধটির রক্তদান সফলভাবে সম্পন্ন হয়েছে এবং রোগীর রক্তের চাহিদা পূরণ (Fulfilled) হয়েছে।</span>
          </div>
        )}
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
            {myDonor ? (
              <button
                type="button"
                disabled={hasVolunteered || isVolunteering}
                onClick={handleVolunteer}
                className={`px-5 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer ${
                  hasVolunteered
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                    : 'bg-red-600 hover:bg-red-700 text-white border border-red-700/60'
                }`}
              >
                <Heart className={`w-4 h-4 ${hasVolunteered ? 'text-emerald-600 fill-emerald-600' : 'fill-white'}`} />
                {hasVolunteered ? '✅ আপনি সাড়া দিয়েছেন' : isVolunteering ? 'সংরক্ষণ হচ্ছে...' : '❤️ আমি রক্ত দিতে চাই'}
              </button>
            ) : (
              <Link
                to={currentUser ? "/become-donor" : "/login"}
                className="px-5 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs border border-red-700/60 transition-colors"
              >
                <Heart className="w-4 h-4 fill-white" />
                ❤️ আমি রক্ত দিতে চাই
              </Link>
            )}

            {request.contactNumber ? (
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`tel:${request.contactNumber}`}
                  className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors font-mono"
                  title="সরাসরি ফোন করুন"
                >
                  <Phone className="w-4 h-4 text-emerald-400" />
                  কল করুন ({request.contactNumber})
                </a>
                <a
                  href={getRequestWhatsAppLink(request)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs border border-emerald-600/30 transition-transform active:scale-95"
                  title="রোগীর স্বজনকে WhatsApp এ মেসেজ দিন"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp মেসেজ
                </a>
              </div>
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

        {/* Sent Direct Requests Status Tray (For Requester & Staff) */}
        {currentDonorRequests.length > 0 && (
          <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 sm:p-5 space-y-3 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-red-600" />
              এই আবেদনের জন্য প্রেরিত অনুরোধের অবস্থা ({currentDonorRequests.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {currentDonorRequests.map((dr) => {
                const matchedDonor = donors.find((d) => d.id === dr.donorId || d.userId === dr.donorUserId);
                const statusConfig = {
                  accepted: { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', text: '✅ রক্তদানে সম্মত (Accepted)' },
                  maybe: { bg: 'bg-amber-50 text-amber-800 border-amber-200', text: '🤔 বিবেচনাধীন (Maybe)' },
                  declined: { bg: 'bg-rose-50 text-rose-800 border-rose-200', text: '❌ অপারগ (Declined)' },
                  pending: { bg: 'bg-blue-50 text-blue-800 border-blue-200', text: '⏳ অপেক্ষমাণ (Pending)' },
                }[dr.status] || { bg: 'bg-slate-100 text-slate-700 border-slate-200', text: dr.status };

                const isFulfilled = request.status === 'fulfilled';
                const isMyAcceptedRequest = dr.status === 'accepted' && (dr.donorUserId === currentUser?.id || isPrivileged);

                return (
                  <div key={dr.id} className="bg-white border border-slate-200 rounded-lg p-3 space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {matchedDonor?.fullName || 'রক্তদাতা'} ({dr.bloodGroup})
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-600">
                        {dr.matchScore}%
                      </span>
                    </div>

                    {isFulfilled && dr.status === 'accepted' ? (
                      <div className="text-[11px] font-bold px-2 py-0.5 rounded-md border inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        🎉 রক্তদান সম্পন্ন (Fulfilled)
                      </div>
                    ) : (
                      <div className={`text-[11px] font-bold px-2 py-0.5 rounded-md border inline-block ${statusConfig.bg}`}>
                        {statusConfig.text}
                      </div>
                    )}

                    {dr.declineReason && (
                      <p className="text-[11px] text-slate-500 italic">কারণ: {dr.declineReason}</p>
                    )}

                    {dr.status === 'accepted' && (isOwner || isPrivileged) && (
                      <div className="pt-1">
                        {revealedContacts[dr.id] ? (
                          <div className="p-2 rounded-md bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-emerald-900">রক্তদাতার যোগাযোগ:</span>
                              <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">যাচাইকৃত</span>
                            </div>
                            <a
                              href={`tel:${revealedContacts[dr.id].phone}`}
                              className="inline-flex items-center gap-1.5 font-bold text-emerald-800 hover:text-emerald-900 text-sm"
                            >
                              <Phone className="w-3.5 h-3.5 text-emerald-600" />
                              {revealedContacts[dr.id].phone}
                            </a>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={loadingContactId === dr.id}
                            onClick={async () => {
                              setLoadingContactId(dr.id);
                              try {
                                const contact = await getAcceptedDonorContactInSupabase(dr.id);
                                if (contact?.phone) {
                                  setRevealedContacts((prev) => ({
                                    ...prev,
                                    [dr.id]: { phone: contact.phone, fullName: contact.fullName },
                                  }));
                                }
                              } catch (err: any) {
                                dialog.alert({
                                  title: 'যোগাযোগ নম্বর ত্রুটি',
                                  message: err.message || 'রক্তদাতার যোগাযোগ নম্বর লোড করা সম্ভব হয়নি।',
                                  type: 'error',
                                });
                              } finally {
                                setLoadingContactId(null);
                              }
                            }}
                            className="w-full py-1 px-2 text-[11px] font-bold rounded bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          >
                            <Phone className="w-3 h-3" />
                            {loadingContactId === dr.id ? 'লোড হচ্ছে...' : '📞 রক্তদাতার নম্বর দেখুন'}
                          </button>
                        )}
                      </div>
                    )}

                    {!isFulfilled && isMyAcceptedRequest && (
                      <button
                        type="button"
                        disabled={isFulfilling}
                        onClick={async () => {
                          const confirmed = await dialog.confirm({
                            title: 'রক্তদান সম্পন্নকরণ নিশ্চিত করুন',
                            message: `${request.hospital}-এ ${request.bloodGroup} রক্তদান সম্পন্ন হয়েছে বলে নিশ্চিত করতে চান? এটি রক্তের আবেদনটিকে 'Fulfilled' করবে এবং রক্তদানের তথ্য সিস্টেমে স্থায়ীভাবে সংরক্ষণ করবে।`,
                            confirmText: 'হ্যাঁ, রক্তদান সম্পন্ন করেছি',
                            cancelText: 'বাতিল',
                            type: 'success',
                          });
                          if (!confirmed) return;
                          setIsFulfilling(true);
                          try {
                            await completeDonationFulfillment(dr.id);
                            dialog.alert({
                              title: 'রক্তদান সম্পন্ন হয়েছে!',
                              message: 'রক্তদানের তথ্য সফলভাবে সংরক্ষিত হয়েছে এবং রক্তের আবেদনটি Fulfilled হয়েছে। আপনাকে অসংখ্য ধন্যবাদ!',
                              type: 'success',
                            });
                          } catch (err: any) {
                            dialog.alert({
                              title: 'ত্রুটি',
                              message: err.message || 'রক্তদান সম্পন্ন করতে ব্যর্থ হয়েছে।',
                              type: 'error',
                            });
                          } finally {
                            setIsFulfilling(false);
                          }
                        }}
                        className="mt-1 w-full px-2.5 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 shadow-xs border border-red-700/60 cursor-pointer transition-colors"
                      >
                        <Heart className="w-3.5 h-3.5 fill-white" />
                        {isFulfilling ? 'সংরক্ষণ হচ্ছে...' : 'রক্তদান সম্পন্ন হয়েছে'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {matchedDonors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {matchedDonors.map((m) => (
              <DonorCard
                key={m.donor.id}
                donor={m.donor}
                matchScore={m.matchScore}
                bloodRequestId={request.id}
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
