import React, { useState, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Eye,
  Check,
  X,
  HelpCircle,
  Calendar,
  Building,
  User,
  Phone,
  Droplets,
  FileText,
  AlertTriangle,
  Send,
} from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import type { DonationSubmission, DonationSubmissionStatus, BloodGroup } from '../../../types';

export const DonationReportsTab: React.FC = () => {
  const { donationSubmissions, donors, approveDonationSubmission, rejectDonationSubmission, requestDonationSubmissionInfo } = useData();
  const { currentUser } = useAuth();

  const [statusFilter, setStatusFilter] = useState<DonationSubmissionStatus | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<DonationSubmission | null>(null);

  // Review Modal State
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'needs_info' | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [verifiedUnits, setVerifiedUnits] = useState<number>(1);
  const [verifiedHospital, setVerifiedHospital] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Stats calculation
  const stats = useMemo(() => {
    return {
      pending: donationSubmissions.filter((s) => s.status === 'pending').length,
      needs_info: donationSubmissions.filter((s) => s.status === 'needs_info').length,
      approved: donationSubmissions.filter((s) => s.status === 'approved').length,
      rejected: donationSubmissions.filter((s) => s.status === 'rejected').length,
      total: donationSubmissions.length,
    };
  }, [donationSubmissions]);

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    return donationSubmissions
      .filter((sub) => {
        if (statusFilter !== 'all' && sub.status !== statusFilter) return false;
        if (!searchQuery.trim()) return true;

        const q = searchQuery.toLowerCase();
        const donorPhone = sub.donorPhone || (donors.find((d) => d.donorId === sub.donorId)?.phone || '');
        return (
          sub.donorName.toLowerCase().includes(q) ||
          donorPhone.includes(q) ||
          sub.bloodGroup.toLowerCase().includes(q) ||
          (sub.hospital && sub.hospital.toLowerCase().includes(q)) ||
          sub.donationDate.includes(q)
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [donationSubmissions, statusFilter, searchQuery, donors]);

  const handleOpenReview = (submission: DonationSubmission, action: 'approve' | 'reject' | 'needs_info' | null = null) => {
    setSelectedSubmission(submission);
    setReviewAction(action);
    setReviewerNotes(submission.reviewNotes || submission.reviewerNotes || '');
    setRejectionReason(submission.rejectionReason || '');
    setVerifiedUnits(submission.units || 1);
    setVerifiedHospital(submission.hospital || '');
    setFeedback(null);
  };

  const handleApprove = async () => {
    if (!selectedSubmission) return;
    try {
      setIsSubmitting(true);
      await approveDonationSubmission(selectedSubmission.id, reviewerNotes.trim() || undefined);
      setFeedback({ type: 'success', text: 'রক্তদানের রিপোর্ট সফলভাবে অনুমোদিত হয়েছে এবং অফিশিয়াল রেকর্ড তৈরি হয়েছে।' });
      setTimeout(() => {
        setSelectedSubmission(null);
        setReviewAction(null);
      }, 1500);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'অনুমোদন ব্যর্থ হয়েছে।' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedSubmission) return;
    if (!rejectionReason.trim()) {
      setFeedback({ type: 'error', text: 'অনুগ্রহ করে বাতিলের কারণ লিখুন।' });
      return;
    }
    try {
      setIsSubmitting(true);
      await rejectDonationSubmission(selectedSubmission.id, rejectionReason.trim());
      setFeedback({ type: 'success', text: 'রক্তদানের রিপোর্টটি বাতিল করা হয়েছে।' });
      setTimeout(() => {
        setSelectedSubmission(null);
        setReviewAction(null);
      }, 1500);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'বাতিলকরণ ব্যর্থ হয়েছে।' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestInfo = async () => {
    if (!selectedSubmission) return;
    if (!reviewerNotes.trim()) {
      setFeedback({ type: 'error', text: 'কী তথ্য প্রয়োজন তা অনুগ্রহ করে লিখুন।' });
      return;
    }
    try {
      setIsSubmitting(true);
      await requestDonationSubmissionInfo(selectedSubmission.id, reviewerNotes.trim());
      setFeedback({ type: 'success', text: 'ডোনারকে অতিরিক্ত তথ্য প্রদানের জন্য অনুরোধ পাঠানো হয়েছে।' });
      setTimeout(() => {
        setSelectedSubmission(null);
        setReviewAction(null);
      }, 1500);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'অনুরোধ পাঠাতে সমস্যা হয়েছে।' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header & Overview */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            ডোনারদের রক্তদান রিপোর্ট পর্যালোচনা ({stats.pending + stats.needs_info}টি অপেক্ষমাণ)
          </h2>
          <p className="text-xs text-slate-500">
            রক্তদাতাদের নিজের জমা দেওয়া রক্তদানের তথ্য যাচাই করে অফিশিয়াল রেকর্ডে অন্তর্ভুক্ত করুন
          </p>
        </div>
      </div>

      {/* KPI Stats Filter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setStatusFilter('pending')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'pending'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/20 shadow-xs'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>নতুন অপেক্ষমাণ</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-black text-amber-900 font-mono mt-1">{stats.pending}</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('needs_info')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'needs_info'
              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400/20 shadow-xs'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>তথ্য চাওয়া হয়েছে</span>
            <AlertCircle className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-black text-blue-900 font-mono mt-1">{stats.needs_info}</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('approved')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'approved'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/20 shadow-xs'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>অনুমোদিত</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-900 font-mono mt-1">{stats.approved}</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('rejected')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'rejected'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400/20 shadow-xs'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>বাতিলকৃত</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-xl font-black text-rose-900 font-mono mt-1">{stats.rejected}</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer col-span-2 sm:col-span-1 ${
            statusFilter === 'all'
              ? 'bg-slate-100 border-slate-300 ring-2 ring-slate-400/20 shadow-xs'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>সর্বমোট</span>
            <Filter className="w-4 h-4 text-slate-600" />
          </div>
          <p className="text-xl font-black text-slate-900 font-mono mt-1">{stats.total}</p>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="রক্তদাতার নাম, ফোন, ব্লাড গ্রুপ বা হাসপাতালের নাম খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
          />
        </div>
      </div>

      {/* Submissions Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {filteredSubmissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">রক্তদাতার তথ্য</th>
                  <th className="py-3 px-4">রক্তদানের তারিখ</th>
                  <th className="py-3 px-4">হাসপাতাল / স্থান</th>
                  <th className="py-3 px-4">পরিমাণ ও ধরন</th>
                  <th className="py-3 px-4">স্ট্যাটাস</th>
                  <th className="py-3 px-4 text-right">কার্যক্রম</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubmissions.map((sub) => {
                  const isPending = sub.status === 'pending';
                  const isNeedsInfo = sub.status === 'needs_info';
                  const isApproved = sub.status === 'approved';
                  const isRejected = sub.status === 'rejected';

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{sub.donorName}</span>
                            <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-mono font-black text-[10px] border border-red-200">
                              {sub.bloodGroup}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {sub.donorPhone || (donors.find((d) => d.donorId === sub.donorId)?.phone || 'ফোন নম্বর নেই')}
                          </p>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                        {sub.donationDate}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-800">{sub.hospital || 'ধামরাই রক্তদান কেন্দ্র'}</span>
                        {sub.patientName && (
                          <p className="text-[11px] text-slate-500">রোগী: {sub.patientName}</p>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800">{sub.units || 1} ব্যাগ</span>
                        <p className="text-[11px] text-slate-500">{sub.donationType || 'Whole Blood'}</p>
                      </td>

                      <td className="py-3.5 px-4">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-600" />
                            অপেক্ষমাণ
                          </span>
                        )}
                        {isNeedsInfo && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-300">
                            <AlertCircle className="w-3 h-3 text-blue-600" />
                            তথ্য চাওয়া হয়েছে
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            অনুমোদিত
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-300">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            বাতিলকৃত
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending || isNeedsInfo ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenReview(sub, 'approve')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                              >
                                <Check className="w-3 h-3" />
                                অনুমোদন
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenReview(sub, null)}
                                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                রিভিউ
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenReview(sub, null)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              বিবরণ
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center space-y-2 text-slate-400">
            <Clock className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-xs font-bold text-slate-600">কোনো রক্তদানের রিপোর্ট পাওয়া যায়নি</p>
            <p className="text-[11px] text-slate-400">ফিল্টার পরিবর্তন করে পুনরায় দেখুন</p>
          </div>
        )}
      </div>

      {/* Detailed Review & Decision Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="space-y-0.5">
                <h3 className="text-base font-black text-slate-900">রক্তদান রিপোর্টের বিবরণ ও সিদ্ধান্ত</h3>
                <p className="text-xs text-slate-500 font-mono">আইডি: {selectedSubmission.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Feedback Alert */}
            {feedback && (
              <div
                className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                )}
                <span>{feedback.text}</span>
              </div>
            )}

            {/* Donor & Report Summary Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-200/80">
                <div>
                  <span className="text-slate-500 block text-[11px]">রক্তদাতার নাম ও ফোন</span>
                  <span className="font-bold text-slate-900">{selectedSubmission.donorName}</span>
                  <span className="text-slate-600 font-mono block">
                    {selectedSubmission.donorPhone || (donors.find((d) => d.donorId === selectedSubmission.donorId)?.phone || 'ফোন নম্বর নেই')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">রক্তের গ্রুপ</span>
                  <span className="font-mono font-black text-red-600 text-sm">{selectedSubmission.bloodGroup}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-slate-700">
                <div>
                  <span className="text-slate-500 block text-[11px]">রক্তদানের তারিখ</span>
                  <span className="font-bold font-mono text-slate-900">{selectedSubmission.donationDate}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">হাসপাতাল / স্থান</span>
                  <span className="font-bold text-slate-900">{selectedSubmission.hospital || 'ধামরাই রক্তদান কেন্দ্র'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">পরিমাণ ও ধরন</span>
                  <span className="font-bold text-slate-900">{selectedSubmission.units || 1} ব্যাগ ({selectedSubmission.donationType || 'Whole Blood'})</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">বর্তমান স্ট্যাটাস</span>
                  <span className="font-bold text-slate-900 capitalize">{selectedSubmission.status}</span>
                </div>
              </div>

              {selectedSubmission.notes && (
                <div className="pt-2 border-t border-slate-200/80">
                  <span className="text-slate-500 block text-[11px]">ডোনারের মন্তব্য</span>
                  <p className="text-slate-800 text-xs bg-white p-2 rounded border border-slate-200 mt-1">
                    {selectedSubmission.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Decision Controls (if pending or needs_info) */}
            {(selectedSubmission.status === 'pending' || selectedSubmission.status === 'needs_info') && (
              <div className="space-y-4 pt-2">
                {/* Mode Selector */}
                <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setReviewAction('approve')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      reviewAction === 'approve'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ✅ অনুমোদন
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewAction('needs_info')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      reviewAction === 'needs_info'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    💬 তথ্য চাওয়া
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewAction('reject')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      reviewAction === 'reject'
                        ? 'bg-white text-rose-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ❌ বাতিল
                  </button>
                </div>

                {/* Form based on selected mode */}
                {reviewAction === 'approve' && (
                  <div className="space-y-3 p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs animate-in fade-in duration-100">
                    <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      অনুমোদনের পর এটি অফিশিয়াল রক্তদান হিসেবে সংরক্ষিত হবে
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-medium mb-1">রক্তের পরিমাণ (ব্যাগ)</label>
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={verifiedUnits}
                          onChange={(e) => setVerifiedUnits(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-medium mb-1">যাচাইকৃত হাসপাতাল</label>
                        <input
                          type="text"
                          value={verifiedHospital}
                          onChange={(e) => setVerifiedHospital(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-medium mb-1">এডমিন নোট (ঐচ্ছিক)</label>
                      <input
                        type="text"
                        placeholder="অনুমোদনের কোনো বিশেষ মন্তব্য..."
                        value={reviewerNotes}
                        onChange={(e) => setReviewerNotes(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleApprove}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      {isSubmitting ? 'অনুমোদন হচ্ছে...' : 'চূড়ান্ত অনুমোদন নিশ্চিত করুন'}
                    </button>
                  </div>
                )}

                {reviewAction === 'needs_info' && (
                  <div className="space-y-3 p-4 bg-blue-50/60 border border-blue-200 rounded-xl text-xs animate-in fade-in duration-100">
                    <p className="font-bold text-blue-900 flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-blue-600" />
                      ডোনারের নিকট অতিরিক্ত তথ্য বা প্রমাণপত্র চাওয়া
                    </p>

                    <div>
                      <label className="block text-slate-700 font-medium mb-1">ডোনারকে যে বার্তা পাঠাবেন *</label>
                      <textarea
                        rows={3}
                        placeholder="যেমন: অনুগ্রহ করে হাসপাতালের স্লিপের তথ্য বা সঠিক তারিখ উল্লেখ করুন..."
                        value={reviewerNotes}
                        onChange={(e) => setReviewerNotes(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-xs"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleRequestInfo}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-4 h-4" />
                      {isSubmitting ? 'বার্তা পাঠানো হচ্ছে...' : 'তথ্য সংশোধনের অনুরোধ পাঠান'}
                    </button>
                  </div>
                )}

                {reviewAction === 'reject' && (
                  <div className="space-y-3 p-4 bg-rose-50/60 border border-rose-200 rounded-xl text-xs animate-in fade-in duration-100">
                    <p className="font-bold text-rose-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      রিপোর্ট বাতিল করার কারণ
                    </p>

                    <div>
                      <label className="block text-slate-700 font-medium mb-1">বাতিলের কারণ লিখুন *</label>
                      <textarea
                        rows={3}
                        placeholder="যেমন: ভুল তারিখ বা হাসপাতালের তথ্যে গরমিল..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-rose-300 rounded-lg text-xs"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleReject}
                      className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <X className="w-4 h-4" />
                      {isSubmitting ? 'বাতিল করা হচ্ছে...' : 'রিপোর্টটি বাতিল করুন'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
