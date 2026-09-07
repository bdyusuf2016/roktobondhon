import React, { useState } from 'react';
import {
  Search,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import type { Donor } from '../../../types';

export const AdminDonorsTab: React.FC = () => {
  const { donors, verifyDonor } = useData();
  const { currentUser } = useAuth();
  const [donorFilterStatus, setDonorFilterStatus] = useState<string>('all');
  const [donorSearch, setDonorSearch] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Confirmation Modal State
  const [confirmTarget, setConfirmTarget] = useState<{
    donor: Donor;
    newStatus: 'verified' | 'suspended';
  } | null>(null);
  const [modalNotes, setModalNotes] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  const openConfirmDialog = (donor: Donor, newStatus: 'verified' | 'suspended') => {
    setConfirmTarget({ donor, newStatus });
    setModalError(null);
    setModalNotes(
      newStatus === 'verified'
        ? 'শারীরিক ইন্টারভিউ ও জাতীয় পরিচয়পত্র যাচাইকরণ সম্পন্ন।'
        : 'অস্থায়ীভাবে অ্যাকাউন্টটি স্থগিত করা হলো।'
    );
  };

  const closeConfirmDialog = () => {
    if (verifyingId) return; // Prevent closing while request in flight
    setConfirmTarget(null);
    setModalNotes('');
    setModalError(null);
  };

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmTarget) return;

    const { donor, newStatus } = confirmTarget;
    setVerifyingId(donor.id);
    setModalError(null);
    setActionError(null);

    try {
      await verifyDonor(
        donor.id,
        newStatus,
        currentUser?.fullName || 'Super Admin',
        modalNotes.trim()
      );

      setActionSuccess(
        `ডোনার ${donor.donorId} (${donor.fullName})-এর স্ট্যাটাস সফলভাবে '${
          newStatus === 'verified' ? 'Verified' : 'Suspended'
        }'-এ পরিবর্তিত হয়েছে।`
      );
      setConfirmTarget(null);
      setModalNotes('');

      // Auto-clear success message after 4 seconds
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      const msg = err.message || 'স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে।';
      setModalError(msg);
      setActionError(msg);
    } finally {
      setVerifyingId(null);
    }
  };

  const filteredDonors = donors.filter((d) => {
    if (donorFilterStatus !== 'all' && d.verificationStatus !== donorFilterStatus) return false;
    if (donorSearch) {
      const q = donorSearch.toLowerCase();
      return (
        d.fullName.toLowerCase().includes(q) ||
        d.donorId.toLowerCase().includes(q) ||
        d.phone.includes(q) ||
        d.area.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs space-y-4">
      {/* Global Success Notification */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 rounded-lg flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Global Error Notification */}
      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-lg flex items-center justify-between animate-in fade-in duration-200">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-red-600 hover:text-red-800 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Bar: scrollbar hidden via no-scrollbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar sm:flex-wrap pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'সকল রক্তদাতা' },
            { id: 'pending', label: 'যাচাইকরণ বাকি (Pending)' },
            { id: 'verified', label: 'ভেরিফাইড (Verified)' },
            { id: 'unverified', label: 'অপ্রমাণিত' },
          ].map((status) => (
            <button
              key={status.id}
              type="button"
              onClick={() => setDonorFilterStatus(status.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                donorFilterStatus === status.id
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={donorSearch}
            onChange={(e) => setDonorSearch(e.target.value)}
            placeholder="আইডি, নাম, ফোন বা এলাকা..."
            className="pl-8 pr-3 py-1.5 rounded-lg text-xs border border-slate-300 w-full sm:w-60 focus:ring-2 focus:ring-red-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Donors Table */}
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-y border-slate-200 text-slate-600">
            <tr>
              <th className="py-2.5 px-3 font-semibold">ডোনার আইডি</th>
              <th className="py-2.5 px-3 font-semibold">নাম</th>
              <th className="py-2.5 px-3 font-semibold">রক্তের গ্রুপ</th>
              <th className="py-2.5 px-3 font-semibold">অবস্থান</th>
              <th className="py-2.5 px-3 font-semibold">মোবাইল</th>
              <th className="py-2.5 px-3 font-semibold">স্ট্যাটাস</th>
              <th className="py-2.5 px-3 text-right font-semibold">অ্যাকশন (Action)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredDonors.slice(0, 50).map((d) => {
              const isCurrentVerifying = verifyingId === d.id;
              return (
                <tr key={d.id} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                    {d.donorId}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    {d.fullName}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                      {d.bloodGroup}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {d.area}, {d.upazila}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 font-mono">
                    {d.phone}
                  </td>
                  <td className="py-2.5 px-3">
                    {d.verificationStatus === 'verified' ? (
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Verified
                      </span>
                    ) : (
                      <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium border border-amber-200">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right space-x-1">
                    {d.verificationStatus !== 'verified' ? (
                      <button
                        type="button"
                        disabled={Boolean(verifyingId)}
                        onClick={() => openConfirmDialog(d, 'verified')}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all shadow-2xs cursor-pointer ${
                          isCurrentVerifying
                            ? 'bg-emerald-400 text-white cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {isCurrentVerifying ? (
                          <span className="inline-flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            যাচাই হচ্ছে...
                          </span>
                        ) : (
                          'Verify'
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={Boolean(verifyingId)}
                        onClick={() => openConfirmDialog(d, 'suspended')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                          isCurrentVerifying
                            ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                            : 'bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-200'
                        }`}
                      >
                        {isCurrentVerifying ? 'প্রসেস হচ্ছে...' : 'Suspend'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Confirmation Dialog Box (Modal) */}
      {confirmTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    confirmTarget.newStatus === 'verified'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {confirmTarget.newStatus === 'verified' ? (
                    <ShieldCheck className="w-5 h-5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {confirmTarget.newStatus === 'verified'
                      ? 'রক্তদাতা যাচাইকরণ নিশ্চিতকরণ'
                      : 'রক্তদাতা স্থগিতকরণ নিশ্চিতকরণ'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    সুপার এডমিন অনুমোদন ও ডাটাবেজ সিনক্রোনাইজেশন
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeConfirmDialog}
                disabled={Boolean(verifyingId)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleConfirmSubmit} className="p-5 space-y-4 text-xs">
              {/* Error inside modal if any */}
              {modalError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-xs text-red-700 rounded-lg">
                  {modalError}
                </div>
              )}

              {/* Donor Summary Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-800 text-xs">
                    {confirmTarget.donor.donorId}
                  </span>
                  <span className="font-mono font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded text-[11px]">
                    {confirmTarget.donor.bloodGroup}
                  </span>
                </div>

                <div className="text-slate-900 font-bold text-sm">
                  {confirmTarget.donor.fullName}
                </div>

                <div className="text-slate-500 text-[11px] flex items-center justify-between">
                  <span>
                    {confirmTarget.donor.area}, {confirmTarget.donor.upazila}
                  </span>
                  <span className="font-mono">{confirmTarget.donor.phone}</span>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">স্ট্যাটাস পরিবর্তন:</span>
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-slate-600 capitalize">
                      {confirmTarget.donor.verificationStatus}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span
                      className={
                        confirmTarget.newStatus === 'verified'
                          ? 'text-emerald-700 font-black'
                          : 'text-amber-700 font-black'
                      }
                    >
                      {confirmTarget.newStatus === 'verified' ? 'Verified ✓' : 'Suspended ✕'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Verification Notes / Remarks Input */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-xs">
                  যাচাইকরণ নোট / মন্তব্য (Remarks)
                </label>
                <textarea
                  rows={2}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="যাচাইকরণের বিস্তারিত বিবরণ লিখুন..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  এই নোটটি ডাটাবেজ অডিট ও ভেরিফিকেশন লগ টেবিলে স্থায়ীভাবে সংরক্ষিত থাকবে।
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeConfirmDialog}
                  disabled={Boolean(verifyingId)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  বাতিল করুন
                </button>

                <button
                  type="submit"
                  disabled={Boolean(verifyingId)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    confirmTarget.newStatus === 'verified'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-red-600 hover:bg-red-700'
                  } ${verifyingId ? 'opacity-80 cursor-not-allowed' : ''}`}
                >
                  {verifyingId ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>প্রসেসিং হচ্ছে...</span>
                    </>
                  ) : confirmTarget.newStatus === 'verified' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>হ্যাঁ, ভেরিফাই অনুমোদন করুন</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>হ্যাঁ, স্থগিত করুন</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
