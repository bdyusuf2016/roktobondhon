import React, { useState } from 'react';
import { X, Send, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Donor } from '../types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

interface RequestDonorModalProps {
  donor: Donor;
  matchScore: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const RequestDonorModal: React.FC<RequestDonorModalProps> = ({
  donor,
  matchScore,
  onClose,
  onSuccess,
}) => {
  const { bloodRequests, sendDonorRequest, donorRequests } = useData();
  const { currentUser } = useAuth();

  // Active blood requests that match or need blood
  const activeRequests = bloodRequests.filter(
    (r) => r.status === 'active' || r.status === 'matched' || r.status === 'pending'
  );

  const [selectedRequestId, setSelectedRequestId] = useState<string>(
    activeRequests[0]?.id || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Check if donor already has a request for this blood request
  const isAlreadySent = donorRequests.some(
    (dr) => dr.donorId === donor.id && dr.bloodRequestId === selectedRequestId
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequestId) {
      setErrorMessage('অনুগ্রহ করে একটি সক্রিয় রক্তের আবেদন নির্বাচন করুন।');
      return;
    }

    if (isAlreadySent) {
      setErrorMessage('এই রক্তদাতাকে এই আবেদনের জন্য ইতিমধ্যে অনুরোধ পাঠানো হয়েছে। ডুপ্লিকেট নোটিফিকেশন পাঠানো নিষিদ্ধ।');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await sendDonorRequest(
        selectedRequestId,
        donor,
        currentUser?.id || 'guest-user',
        matchScore
      );
      setSuccessMessage('রক্তদাতার কাছে সফলভাবে রক্তের অনুরোধ পাঠানো হয়েছে!');
      setTimeout(() => {
        onSuccess();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'অনুরোধ পাঠাতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl border border-slate-200 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-red-50 text-red-700 flex items-center justify-center font-bold text-base border border-red-200 font-mono">
            {donor.bloodGroup}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              {donor.fullName}-কে অনুরোধ পাঠান
            </h3>
            <p className="text-xs text-slate-500">
              {donor.area}, {donor.upazila} • ম্যাচ স্কোর: {matchScore}%
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              রক্তের আবেদন নির্বাচন করুন:
            </label>
            {activeRequests.length > 0 ? (
              <select
                value={selectedRequestId}
                onChange={(e) => {
                  setSelectedRequestId(e.target.value);
                  setErrorMessage('');
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:outline-hidden bg-slate-50 font-medium"
              >
                {activeRequests.map((req) => (
                  <option key={req.id} value={req.id}>
                    [{req.requestId}] {req.patientName} — {req.bloodGroup} ({req.hospital})
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-800 border border-amber-200">
                কোনো সক্রিয় রক্তের আবেদন নেই। প্রথমে রক্তের আবেদন তৈরি করুন।
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800">নিয়মাবলী ও নিরাপত্তা:</p>
            <p>• রক্তদাতার ফোনে/ড্যাশবোর্ডে তাত্ক্ষণিক নোটিফিকেশন পৌঁছাবে।</p>
            <p>• রক্তদাতা সম্মতি (Accept) জানালে যোগাযোগ সহজ হবে।</p>
            <p>• অনর্থক বা মিথ্যা অনুরোধ আইনত দণ্ডনীয় অপরাধ।</p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-transparent"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSubmitting || activeRequests.length === 0 || isAlreadySent}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs border border-red-700/60 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? 'পাঠানো হচ্ছে...' : isAlreadySent ? 'অনুরোধ পাঠানো হয়েছে' : 'অনুরোধ নিশ্চিত করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
