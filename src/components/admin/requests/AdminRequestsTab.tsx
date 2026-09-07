import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Droplets,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  Settings,
  Filter,
  SlidersHorizontal,
  ChevronRight,
  Send,
  Building,
  MapPin,
  Calendar,
  Phone,
  Trash2,
} from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useDialog } from '../../../contexts/DialogContext';
import { useSystemConfig } from '../../../contexts/SystemConfigContext';
import { EmergencyBroadcastModal } from '../../EmergencyBroadcastModal';
import { BloodRequestSettings } from './BloodRequestSettings';
import type { BloodGroup, EmergencyLevel, RequestStatus, BloodRequest } from '../../../types';

export const AdminRequestsTab: React.FC = () => {
  const { bloodRequests, verifyBloodRequest, updateBloodRequestStatus, deleteBloodRequest } = useData();
  const { currentUser } = useAuth();
  const { config } = useSystemConfig();
  const dialog = useDialog();

  const [activeView, setActiveView] = useState<'list' | 'settings'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [bloodGroupFilter, setBloodGroupFilter] = useState<string>('all');
  const [emergencyFilter, setEmergencyFilter] = useState<string>('all');

  // Broadcast modal state
  const [broadcastRequest, setBroadcastRequest] = useState<BloodRequest | null>(null);

  const bloodGroups: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  // Metrics computation
  const stats = useMemo(() => {
    const total = bloodRequests.length;
    const pendingVerification = bloodRequests.filter((r) => !r.verification?.isVerified).length;
    const active = bloodRequests.filter((r) => r.status === 'active' || r.status === 'matched').length;
    const fulfilled = bloodRequests.filter((r) => r.status === 'fulfilled').length;
    const critical = bloodRequests.filter((r) => r.emergencyLevel === 'CRITICAL').length;

    return { total, pendingVerification, active, fulfilled, critical };
  }, [bloodRequests]);

  // Filtered requests list
  const filteredRequests = useMemo(() => {
    return bloodRequests.filter((req) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = req.patientName?.toLowerCase().includes(q);
        const matchesHospital = req.hospital?.toLowerCase().includes(q);
        const matchesId = req.requestId?.toLowerCase().includes(q);
        const matchesPhone = req.contactNumber?.includes(q);
        const matchesDistrict = req.district?.toLowerCase().includes(q);

        if (!matchesName && !matchesHospital && !matchesId && !matchesPhone && !matchesDistrict) {
          return false;
        }
      }

      // 2. Status filter
      if (statusFilter === 'pending_verification') {
        if (req.verification?.isVerified) return false;
      } else if (statusFilter !== 'all' && req.status !== statusFilter) {
        return false;
      }

      // 3. Blood Group filter
      if (bloodGroupFilter !== 'all' && req.bloodGroup !== bloodGroupFilter) {
        return false;
      }

      // 4. Emergency level filter
      if (emergencyFilter !== 'all' && req.emergencyLevel !== emergencyFilter) {
        return false;
      }

      return true;
    });
  }, [bloodRequests, searchQuery, statusFilter, bloodGroupFilter, emergencyFilter]);

  const handleVerify = async (requestId: string, patientName: string) => {
    const confirmed = await dialog.confirm({
      title: 'আবেদন যাচাই নিশ্চিতকরণ',
      message: `আপনি কি "${patientName}" এর রক্তের আবেদনটি সত্য ও যাচাইকৃত হিসেবে অনুমোদন করতে চান?`,
      confirmText: 'হ্যাঁ, অনুমোদন করুন',
      confirmTheme: 'success',
    });

    if (confirmed) {
      await verifyBloodRequest(requestId, currentUser?.fullName || 'Admin Verifier');
      dialog.alert({
        title: 'যাচাই সফল',
        message: 'রক্তের আবেদনটি যাচাইকৃত হিসেবে মার্ক করা হয়েছে।',
        theme: 'success',
      });
    }
  };

  const handleStatusChange = async (requestId: string, newStatus: RequestStatus) => {
    await updateBloodRequestStatus(requestId, newStatus);
    dialog.alert({
      title: 'স্ট্যাটাস আপডেট',
      message: `আবেদনের স্ট্যাটাস "${newStatus}" এ পরিবর্তন করা হয়েছে।`,
      theme: 'info',
    });
  };

  const handleDelete = async (requestId: string, patientName: string) => {
    if (!deleteBloodRequest) return;
    const confirmed = await dialog.confirm({
      title: 'আবেদন মুছে ফেলবেন?',
      message: `আপনি কি নিশ্চিত যে "${patientName}" এর রক্তের আবেদনটি স্থায়ীভাবে মুছে ফেলতে চান?`,
      confirmText: 'মুছে ফেলুন',
      confirmTheme: 'danger',
    });

    if (confirmed) {
      await deleteBloodRequest(requestId);
      dialog.alert({
        title: 'মুছে ফেলা হয়েছে',
        message: 'রক্তের আবেদনটি সফলভাবে ডাটাবেজ থেকে মুছে ফেলা হয়েছে।',
        theme: 'info',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Mode Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Droplets className="w-5 h-5 text-red-600" />
            রক্তের আবেদন নিয়ন্ত্রণ ও মডারেশন কেন্দ্র (Blood Request Control)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            জরুরি ও সাধারণ রক্তের রিকুয়েস্ট যাচাই, স্ট্যাটাস ট্র্যাকিং, ব্রডকাস্ট এবং নীতিমালা কনফিগারেশন
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveView('list')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeView === 'list'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>আবেদন তালিকা ({bloodRequests.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('settings')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeView === 'settings'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>আবেদন নীতিমালা</span>
          </button>
        </div>
      </div>

      {activeView === 'settings' ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <BloodRequestSettings />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1">
              <span className="text-xs text-slate-500 font-semibold block">মোট আবেদন</span>
              <div className="text-2xl font-black text-slate-900">{stats.total}</div>
            </div>

            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 space-y-1">
              <span className="text-xs text-amber-700 font-semibold block">যাচাই বাকি</span>
              <div className="text-2xl font-black text-amber-800">{stats.pendingVerification}</div>
            </div>

            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 space-y-1">
              <span className="text-xs text-blue-700 font-semibold block">সক্রিয় রিকুয়েস্ট</span>
              <div className="text-2xl font-black text-blue-800">{stats.active}</div>
            </div>

            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-1">
              <span className="text-xs text-emerald-700 font-semibold block">সম্পন্ন (Fulfilled)</span>
              <div className="text-2xl font-black text-emerald-800">{stats.fulfilled}</div>
            </div>

            <div className="p-4 rounded-xl border border-red-200 bg-red-50/60 space-y-1">
              <span className="text-xs text-red-700 font-semibold block">ক্রিটিক্যাল জরুরি</span>
              <div className="text-2xl font-black text-red-700 flex items-center gap-1">
                <Flame className="w-5 h-5 text-red-600 fill-red-600" />
                {stats.critical}
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
            <div className="flex flex-col md:flex-row items-center gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="রোগীর নাম, মোবাইল নম্বর, হাসপাতাল বা রিকুয়েস্ট আইডি দিয়ে খুঁজুন..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Status Pill Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 text-xs">
                {[
                  { id: 'all', label: 'সকল' },
                  { id: 'pending_verification', label: 'যাচাই বাকি' },
                  { id: 'active', label: 'সক্রিয়' },
                  { id: 'matched', label: 'ম্যাচড' },
                  { id: 'fulfilled', label: 'সম্পন্ন' },
                  { id: 'cancelled', label: 'বাতিল' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStatusFilter(st.id)}
                    className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-colors ${
                      statusFilter === st.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-500 font-semibold">রক্তের গ্রুপ:</span>
                <select
                  value={bloodGroupFilter}
                  onChange={(e) => setBloodGroupFilter(e.target.value)}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                >
                  <option value="all">সব গ্রুপ</option>
                  {bloodGroups.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>

                <span className="text-slate-500 font-semibold ml-2">জরুরি মাত্রা:</span>
                <select
                  value={emergencyFilter}
                  onChange={(e) => setEmergencyFilter(e.target.value)}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                >
                  <option value="all">সব মাত্রা</option>
                  <option value="CRITICAL">ক্রিটিক্যাল (CRITICAL)</option>
                  <option value="URGENT">জরুরি (URGENT)</option>
                  <option value="NORMAL">সাধারণ (NORMAL)</option>
                </select>
              </div>

              <div className="text-slate-500 font-medium">
                প্রদর্শিত আবেদন: <span className="font-bold text-slate-800">{filteredRequests.length}</span> টি
              </div>
            </div>
          </div>

          {/* Requests Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-3 px-4 font-bold">রিকুয়েস্ট ও রোগী</th>
                    <th className="py-3 px-4 font-bold">রক্তের গ্রুপ ও পরিমাণ</th>
                    <th className="py-3 px-4 font-bold">হাসপাতাল ও এলাকা</th>
                    <th className="py-3 px-4 font-bold">প্রয়োজনের সময়</th>
                    <th className="py-3 px-4 font-bold">জরুরি মাত্রা</th>
                    <th className="py-3 px-4 font-bold">যাচাই ও স্ট্যাটাস</th>
                    <th className="py-3 px-4 text-right font-bold">অ্যাকশন ও মডারেশন</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Droplets className="w-8 h-8 mx-auto mb-2 stroke-slate-300" />
                        <p className="font-semibold text-slate-600">কোন আবেদন খুঁজে পাওয়া যায়নি</p>
                        <p className="text-[11px] mt-0.5">ফিল্টার বা সার্চ কিওয়ার্ড পরিবর্তন করে চেষ্টা করুন।</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((req) => {
                      const isCritical = req.emergencyLevel === 'CRITICAL';
                      const isVerified = req.verification?.isVerified;

                      return (
                        <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Request ID & Patient */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded text-[11px] border border-red-200">
                                {req.requestId}
                              </span>
                            </div>
                            <div className="font-bold text-slate-900 text-sm mt-1">
                              {req.patientName}
                            </div>
                            {req.contactNumber && (
                              <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <a href={`tel:${req.contactNumber}`} className="hover:text-slate-800">
                                  {req.contactNumber}
                                </a>
                              </div>
                            )}
                          </td>

                          {/* Blood Group & Units */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2.5 py-1 bg-red-600 text-white font-black rounded-lg text-xs shadow-xs">
                                {req.bloodGroup}
                              </span>
                              <span className="font-bold text-slate-800 text-xs">
                                {req.requiredUnits} ব্যাগ
                              </span>
                            </div>
                          </td>

                          {/* Hospital & Location */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800 flex items-center gap-1">
                              <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[160px]" title={req.hospital}>
                                {req.hospital}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {req.upazila ? `${req.upazila}, ` : ''}{req.district}
                            </div>
                          </td>

                          {/* Required Date / Time */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {req.requiredDate}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {req.requiredTime}
                            </div>
                          </td>

                          {/* Emergency Level */}
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit ${
                                isCritical
                                  ? 'bg-red-100 text-red-800 border border-red-300'
                                  : req.emergencyLevel === 'URGENT'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {isCritical && <Flame className="w-3 h-3 text-red-600 fill-red-600" />}
                              {req.emergencyLevel}
                            </span>
                          </td>

                          {/* Verification & Status */}
                          <td className="py-3 px-4 space-y-1">
                            <div>
                              {isVerified ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  যাচাইকৃত
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 font-bold">
                                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                                  যাচাই বাকি
                                </span>
                              )}
                            </div>
                            <div>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  req.status === 'fulfilled'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : req.status === 'active'
                                    ? 'bg-blue-100 text-blue-800'
                                    : req.status === 'matched'
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : req.status === 'cancelled'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {req.status}
                              </span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right space-x-1">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Direct Detail & Match link */}
                              <Link
                                to={`/blood-requests/${req.id}`}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                                title="ম্যাচড ডোনার ও বিবরণ দেখুন"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>

                              {/* Verify action button */}
                              {!isVerified && (
                                <button
                                  type="button"
                                  onClick={() => handleVerify(req.id, req.patientName)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" />
                                  যাচাই
                                </button>
                              )}

                              {/* Emergency broadcast action */}
                              <button
                                type="button"
                                onClick={() => setBroadcastRequest(req)}
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg transition-colors"
                                title="জরুরি ব্রডকাস্ট এসএমএস পাঠান"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>

                              {/* Status Dropdown */}
                              <select
                                value={req.status}
                                onChange={(e) => handleStatusChange(req.id, e.target.value as RequestStatus)}
                                className="px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-semibold text-slate-800"
                              >
                                <option value="active">সক্রিয় (Active)</option>
                                <option value="matched">ম্যাচড (Matched)</option>
                                <option value="fulfilled">সম্পন্ন (Fulfilled)</option>
                                <option value="cancelled">বাতিল (Cancelled)</option>
                              </select>

                              {deleteBloodRequest && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(req.id, req.patientName)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                                  title="মুছে ফেলুন"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Broadcast Modal */}
      {broadcastRequest && (
        <EmergencyBroadcastModal
          request={broadcastRequest}
          onClose={() => setBroadcastRequest(null)}
        />
      )}
    </div>
  );
};
