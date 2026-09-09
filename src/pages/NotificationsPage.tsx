import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Building2,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import type { DonorRequest } from '../types';

export const NotificationsPage: React.FC = () => {
  const { notifications, donorRequests, respondDonorRequest, markNotificationRead } = useData();
  const { currentUser } = useAuth();

  const [declineModalItem, setDeclineModalItem] = useState<DonorRequest | null>(null);
  const [declineReason, setDeclineReason] = useState('Currently unavailable');

  // Filter donor requests matching current user
  const myDonorRequests = donorRequests.filter(
    (dr) => dr.donorUserId === currentUser?.id || currentUser?.role === 'super_admin' || currentUser?.role === 'moderator'
  );

  const handleDeclineSubmit = async () => {
    if (!declineModalItem) return;
    await respondDonorRequest(declineModalItem.id, 'declined', declineReason);
    setDeclineModalItem(null);
  };

  // Filter notifications matching current user or broadcast
  const userNotifications = notifications.filter(
    (n) =>
      n.userId === currentUser?.id ||
      n.userId === 'all' ||
      (currentUser?.role && ['super_admin', 'admin'].includes(currentUser.role))
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-red-600" />
            বিজ্ঞপ্তি ও রক্তের অনুরোধ
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            জরুরি রক্তের আবেদন ও সংগঠনের নিয়মিত আপডেট
          </p>
        </div>
      </div>

      {/* Donor Requests (Invitations to Donate Blood) */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          সরাসরি রক্তদানের অনুরোধ ({myDonorRequests.length})
        </h2>

        {myDonorRequests.length > 0 ? (
          <div className="space-y-3">
            {myDonorRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-200 text-red-700 font-black font-mono text-base flex items-center justify-center shrink-0">
                      {req.bloodGroup}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        {req.patientName}-এর জন্য রক্তের অনুরোধ
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {req.hospital}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    ম্যাচ: {req.matchScore}%
                  </span>
                </div>

                {/* Status or action buttons */}
                {req.status === 'pending' ? (
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => respondDonorRequest(req.id, 'accepted')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-xs border border-emerald-700/60"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      সম্মত (Accept)
                    </button>
                    <button
                      type="button"
                      onClick={() => respondDonorRequest(req.id, 'maybe')}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-xs border border-amber-600/60"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      সম্ভাব্য (Maybe)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeclineModalItem(req)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5 inline mr-1" />
                      অসম্মত (Decline)
                    </button>
                    <Link
                      to={`/request/${req.bloodRequestId}`}
                      className="ml-auto text-xs text-red-600 font-bold hover:underline"
                    >
                      আবেদনের পূর্ণ বিবরণ
                    </Link>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span
                      className={`font-bold px-2.5 py-1 rounded-full ${
                        req.status === 'accepted'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : req.status === 'maybe'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      আপনার প্রতিক্রিয়া: {req.status === 'accepted' ? 'সম্মত' : req.status === 'maybe' ? 'সম্ভাব্য' : 'অসম্মত'}
                    </span>
                    {req.declineReason && (
                      <span className="text-slate-500 text-[11px]">
                        কারণ: {req.declineReason}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
            বর্তমানে আপনার জন্য কোনো অপেক্ষমান রক্তের অনুরোধ নেই।
          </div>
        )}
      </div>

      {/* System Notifications */}
      <div className="space-y-3 pt-4 border-t border-slate-200">
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          সাধারণ বার্তা ও ঘোষণা ({userNotifications.length})
        </h2>

        {userNotifications.length === 0 ? (
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
            বর্তমানে আপনার জন্য কোনো নতুন বিজ্ঞপ্তি নেই।
          </div>
        ) : (
          <div className="space-y-2">
            {userNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => markNotificationRead(n.id)}
                className={`p-4 rounded-xl border transition-colors cursor-pointer text-xs ${
                  n.isRead
                    ? 'bg-white border-slate-200/90 text-slate-600 opacity-80'
                    : 'bg-red-50/40 border-red-200 shadow-2xs font-medium'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-slate-900 text-sm">{n.title}</h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-slate-600 mt-1">{n.message}</p>
                {n.link && (
                  <Link
                    to={n.link}
                    className="inline-block mt-2 text-red-600 font-bold hover:underline"
                  >
                    বিস্তারিত দেখুন →
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Decline Reason Modal */}
      {declineModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">
              অসম্মত হওয়ার কারণ নির্বাচন করুন
            </h3>
            <div className="space-y-2 text-xs">
              {[
                { id: 'Recently donated', label: 'সম্প্রতি রক্তদান করেছি (৩-৪ মাসের মধ্যে)' },
                { id: 'Currently unavailable', label: 'ব্যস্ততার কারণে বর্তমানে অনুপলব্ধ' },
                { id: 'Out of area', label: 'ধামরাই/সাভার/মানিকগঞ্জের বাইরে অবস্থান করছি' },
                { id: 'Health reason', label: 'শারীরিক অসুস্থতা বা ওষুধ গ্রহণ করছি' },
                { id: 'Other', label: 'অন্যান্য ব্যক্তিগত কারণ' },
              ].map((r) => (
                <label key={r.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input
                    type="radio"
                    name="declineReason"
                    value={r.id}
                    checked={declineReason === r.id}
                    onChange={() => setDeclineReason(r.id)}
                    className="text-red-600"
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeclineModalItem(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleDeclineSubmit}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg border border-red-700/60 shadow-xs"
              >
                নিশ্চিত করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
