import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Award,
  Droplets,
  Building2,
  Calendar,
  CheckCircle2,
  Users,
  ShieldCheck,
  Filter,
  FileText,
  Trash2,
  Edit2,
  Heart,
  Layers,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Flame,
  Clock,
} from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useDialog } from '../../../contexts/DialogContext';
import { RecordDonationModal } from './RecordDonationModal';
import { DonationReportsTab } from './DonationReportsTab';
import { getDonationReports } from '../../../services/donationService';
import type { BloodGroup, DonationType, Donation } from '../../../types';

export const AdminDonationsTab: React.FC = () => {
  const { donations, donors, donationSubmissions, deleteDonation, updateDonation, hasPermission } = useData();
  const { currentUser } = useAuth();
  const dialog = useDialog();

  const isSuperAdminOrAdmin =
    currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  const canRecordDonation = hasPermission(currentUser?.role || 'admin', 'record_donation');

  // Filter and Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [bloodGroupFilter, setBloodGroupFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [hospitalFilter, setHospitalFilter] = useState<string>('all');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Sub-tabs State
  const [activeSubTab, setActiveSubTab] = useState<'official' | 'reports'>('official');
  const pendingSubmissionsCount = useMemo(
    () => donationSubmissions.filter((s) => s.status === 'pending' || s.status === 'needs_info').length,
    [donationSubmissions]
  );

  // Modals
  const [showRecordModal, setShowRecordModal] = useState<boolean>(false);
  const [editingDonation, setEditingDonation] = useState<Donation | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Edit Form State
  const [editDate, setEditDate] = useState<string>('');
  const [editHospital, setEditHospital] = useState<string>('');
  const [editUnits, setEditUnits] = useState<number>(1);
  const [editType, setEditType] = useState<DonationType>('Whole Blood');
  const [editNotes, setEditNotes] = useState<string>('');

  // Reports
  const reports = useMemo(() => getDonationReports(donations), [donations]);

  // Filtered Donations
  const filteredDonations = useMemo(() => {
    return donations.filter((d) => {
      if (bloodGroupFilter !== 'all' && d.bloodGroup !== bloodGroupFilter) return false;
      if (sourceFilter !== 'all' && (d.source || 'manual') !== sourceFilter) return false;
      if (hospitalFilter !== 'all' && !d.hospital?.includes(hospitalFilter)) return false;

      if (startDateFilter && d.donationDate && d.donationDate < startDateFilter) return false;
      if (endDateFilter && d.donationDate && d.donationDate > endDateFilter) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          d.donorName.toLowerCase().includes(q) ||
          d.donorId.toLowerCase().includes(q) ||
          (d.hospital && d.hospital.toLowerCase().includes(q)) ||
          d.id.toLowerCase().includes(q) ||
          (d.verifiedBy && d.verifiedBy.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [donations, bloodGroupFilter, sourceFilter, hospitalFilter, startDateFilter, endDateFilter, searchTerm]);

  // Paginated Slices
  const totalPages = Math.ceil(filteredDonations.length / pageSize) || 1;
  const paginatedDonations = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDonations.slice(start, start + pageSize);
  }, [filteredDonations, currentPage, pageSize]);

  const handleOpenEdit = (donation: Donation) => {
    setEditingDonation(donation);
    setEditDate(donation.donationDate || '');
    setEditHospital(donation.hospital || 'ধামরাই রক্তদান কেন্দ্র');
    setEditUnits(donation.units || 1);
    setEditType(donation.donationType || 'Whole Blood');
    setEditNotes(donation.notes || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDonation) return;

    setIsUpdating(true);
    try {
      await updateDonation(editingDonation.id, {
        donationDate: editDate || null,
        hospital: editHospital.trim(),
        location: editHospital.trim(),
        units: Number(editUnits) || 1,
        donationType: editType,
        notes: editNotes.trim() || undefined,
      });

      dialog.alert({
        title: 'হালনাগাদ সফল',
        message: 'রক্তদান রেকর্ডটি সফলভাবে হালনাগাদ করা হয়েছে।',
        theme: 'success',
      });
      setEditingDonation(null);
    } catch (err: any) {
      dialog.alert({
        title: 'হালনাগাদ ব্যর্থ',
        message: err.message || 'রক্তদান রেকর্ড হালনাগাদ করা যায়নি।',
        theme: 'danger',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (donation: Donation) => {
    if (!isSuperAdminOrAdmin) {
      dialog.alert({
        title: 'অননুমোদিত অ্যাকশন',
        message: 'শুধুমাত্র এডমিন বা সুপার এডমিন রক্তদান রেকর্ড মুছে ফেলতে পারেন।',
        theme: 'error',
      });
      return;
    }

    const confirmed = await dialog.confirm({
      title: 'রক্তদান রেকর্ড মুছে ফেলবেন?',
      message: `"${donation.donorName}" (${donation.bloodGroup})-এর রক্তদান রেকর্ডটি মুছে ফেললে রক্তদাতার মোট রক্তদান মেট্রিক্স স্বয়ংক্রিয়ভাবে পুনঃগণনা করা হবে। আপনি কি নিশ্চিত?`,
      theme: 'danger',
      confirmText: 'হ্যাঁ, রেকর্ড মুছুন',
      cancelText: 'বাতিল',
    });

    if (!confirmed) return;

    try {
      await deleteDonation(donation.id);
      dialog.alert({
        title: 'রেকর্ড মুছে ফেলা হয়েছে',
        message: 'রক্তদান রেকর্ডটি সফলভাবে মুছে ফেলা হয়েছে এবং ডোনার প্রোফাইল মেট্রিক্স আপডেট করা হয়েছে।',
        theme: 'info',
      });
    } catch (err: any) {
      dialog.alert({
        title: 'ব্যর্থ হয়েছে',
        message: err.message || 'রক্তদান রেকর্ড মুছতে সমস্যা হয়েছে।',
        theme: 'danger',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200">
        <button
          type="button"
          onClick={() => setActiveSubTab('official')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'official'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4 text-red-600" />
          <span>অফিশিয়াল রক্তদান রেকর্ড ({donations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('reports')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'reports'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-600" />
          <span>ডোনারদের রক্তদান রিপোর্ট</span>
          {pendingSubmissionsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
              {pendingSubmissionsCount} নতুন
            </span>
          )}
        </button>
      </div>

      {activeSubTab === 'reports' ? (
        <DonationReportsTab />
      ) : (
        <>
          {/* 1. Reports & Metrics Header */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">মোট ডিজিটাল রক্তদান</span>
          <span className="text-2xl font-black text-slate-900 block mt-1 tracking-tight font-mono">
            {reports.totalDonations} টি
          </span>
          <span className="text-[10px] text-slate-500">ডাটাবেজে সংরক্ষিত রেকর্ড</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">মোট সরবরাহকৃত রক্ত</span>
          <span className="text-2xl font-black text-red-600 block mt-1 tracking-tight font-mono">
            {reports.totalUnits} ব্যাগ
          </span>
          <span className="text-[10px] text-slate-500">সংগৃহীত রক্তের ব্যাগ</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">চলতি মাসে রক্তদান</span>
          <span className="text-2xl font-black text-blue-600 block mt-1 tracking-tight font-mono">
            {reports.thisMonthCount} টি
          </span>
          <span className="text-[10px] text-slate-500">এই মাসের সফল ইভেন্ট</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">আজকের রক্তদান</span>
          <span className="text-2xl font-black text-emerald-600 block mt-1 tracking-tight font-mono">
            {reports.todayCount} টি
          </span>
          <span className="text-[10px] text-slate-500">আজকে সংরক্ষিত রেকর্ড</span>
        </div>
      </div>

      {/* 2. Blood Group Distribution Mini-Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span className="flex items-center gap-1.5">
            <Droplets className="w-4 h-4 text-red-600" />
            গ্রুপভিত্তিক রক্তদান পরিসংখ্যান (Blood Group Distribution)
          </span>
          <span className="text-[11px] text-slate-400 font-normal">রিয়েল-টাইম সামারি</span>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-1">
          {(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as BloodGroup[]).map((grp) => (
            <div
              key={grp}
              onClick={() => setBloodGroupFilter(bloodGroupFilter === grp ? 'all' : grp)}
              className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                bloodGroupFilter === grp
                  ? 'bg-red-50 border-red-300 ring-2 ring-red-500'
                  : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="text-[11px] font-black text-red-700">{grp}</div>
              <div className="text-sm font-black text-slate-900 font-mono">
                {reports.byBloodGroup[grp] || 0}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Main Container */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Award className="w-5 h-5 text-red-600" />
              রক্তদান হিস্ট্রি ও ডিজিটাল রেকর্ডস
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ধামরাই, সাভার, মানিকগঞ্জ ও অন্যান্য কেন্দ্রে সম্পন্ন হওয়া সত্যায়িত রক্তদানের ডিজিটাল রেজিস্টার
            </p>
          </div>

          {canRecordDonation && (
            <button
              type="button"
              onClick={() => setShowRecordModal(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ নতুন রক্তদান রেকর্ড লিপিবদ্ধ করুন</span>
            </button>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 pt-3 border-t border-slate-100">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="ডোনারের নাম, ডোনার আইডি, রক্তদান আইডি বা হাসপাতাল..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
            />
          </div>

          <select
            value={bloodGroupFilter}
            onChange={(e) => {
              setBloodGroupFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 font-medium"
          >
            <option value="all">সকল রক্তের গ্রুপ</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 font-medium"
          >
            <option value="all">সকল উৎস (Source)</option>
            <option value="manual">সরাসরি / ম্যানুয়াল</option>
            <option value="camp">রক্তদান ক্যাম্পেইন</option>
            <option value="request">জরুরি রক্তের আবেদন</option>
            <option value="imported">কাগজভিত্তিক তালিকা</option>
          </select>

          <select
            value={hospitalFilter}
            onChange={(e) => {
              setHospitalFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 font-medium"
          >
            <option value="all">সকল হাসপাতাল / কেন্দ্র</option>
            <option value="ধামরাই">ধামরাই উপজেলা</option>
            <option value="এনাম">এনাম মেডিকেল (সাভার)</option>
            <option value="মানিকগঞ্জ">মানিকগঞ্জ সদর</option>
            <option value="কালামপুর">কালামপুর বাজার</option>
          </select>
        </div>

        {/* Active Filter Summary */}
        {(bloodGroupFilter !== 'all' || sourceFilter !== 'all' || hospitalFilter !== 'all' || searchTerm) && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
            <span>
              ফিল্টার অনুযায়ী মোট <strong>{filteredDonations.length}</strong> টি রেকর্ড পাওয়া গেছে।
            </span>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setBloodGroupFilter('all');
                setSourceFilter('all');
                setHospitalFilter('all');
                setStartDateFilter('');
                setEndDateFilter('');
                setCurrentPage(1);
              }}
              className="text-red-600 hover:text-red-700 font-semibold cursor-pointer"
            >
              ফিল্টার রিসেট করুন
            </button>
          </div>
        )}

        {/* Donations Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-y border-slate-200 text-slate-600">
              <tr>
                <th className="py-2.5 px-3 font-semibold">তারিখ (Date)</th>
                <th className="py-2.5 px-3 font-semibold">রক্তদাতা ও আইডি</th>
                <th className="py-2.5 px-3 font-semibold">গ্রুপ</th>
                <th className="py-2.5 px-3 font-semibold">হাসপাতাল / স্থান</th>
                <th className="py-2.5 px-3 font-semibold">ধরন ও পরিমাণ</th>
                <th className="py-2.5 px-3 font-semibold">উৎস (Source)</th>
                <th className="py-2.5 px-3 font-semibold">যাচাইকারী</th>
                <th className="py-2.5 px-3 font-semibold text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedDonations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 text-xs">
                    কোনো রক্তদান রেকর্ড পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                paginatedDonations.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-medium text-slate-800">
                      {d.donationDate ? (
                        <span className="font-mono font-semibold">{d.donationDate}</span>
                      ) : (
                        <span className="italic text-slate-400 text-[11px]">তারিখ উল্লেখ নেই</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{d.donorName}</div>
                      <span className="text-[10px] text-slate-400 font-mono">{d.donorId}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 font-black text-xs border border-red-200">
                        {d.bloodGroup}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      <div>{d.hospital || d.location || 'ধামরাই রক্তদান কেন্দ্র'}</div>
                      {d.bloodRequestId && (
                        <span className="text-[10px] font-mono text-blue-600 block">
                          আবেদন: {d.bloodRequestId}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      <span className="font-semibold">{d.units || 1} ব্যাগ</span>
                      <span className="text-[10px] text-slate-400 block">{d.donationType || 'Whole Blood'}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          d.source === 'camp'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : d.source === 'request'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : d.source === 'imported'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {d.source === 'camp'
                          ? 'ক্যাম্পেইন'
                          : d.source === 'request'
                          ? 'জরুরি আবেদন'
                          : d.source === 'imported'
                          ? 'কাগজের তালিকা'
                          : 'সরাসরি'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {d.verifiedBy || 'এডমিন'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(d)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="রেকর্ড সম্পাদনা"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button (Admin Only) */}
                        {isSuperAdminOrAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDelete(d)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="রেকর্ড মুছে ফেলুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredDonations.length > pageSize && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
            <div>
              পৃষ্ঠা <strong>{currentPage}</strong> / <strong>{totalPages}</strong> (মোট {filteredDonations.length} টি রেকর্ড)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 rounded-lg font-bold ${
                    currentPage === page
                      ? 'bg-red-600 text-white'
                      : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      </>
      )}

      {/* Reusable Record Donation Modal */}
      {showRecordModal && (
        <RecordDonationModal
          isOpen={showRecordModal}
          onClose={() => setShowRecordModal(false)}
        />
      )}

      {/* Edit Donation Modal */}
      {editingDonation && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-red-600" />
                রক্তদান রেকর্ড সম্পাদনা (Edit Donation)
              </h3>
              <button
                type="button"
                onClick={() => setEditingDonation(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">রক্তদাতা</label>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-semibold text-slate-900">
                  {editingDonation.donorName} ({editingDonation.bloodGroup}, ID: {editingDonation.donorId})
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">রক্তদানের তারিখ *</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">হাসপাতাল / স্থান</label>
                <input
                  type="text"
                  value={editHospital}
                  onChange={(e) => setEditHospital(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">পরিমাণ (ব্যাগ)</label>
                  <input
                    type="number"
                    min={1}
                    max={4}
                    value={editUnits}
                    onChange={(e) => setEditUnits(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">রক্তদানের ধরন</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as DonationType)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Whole Blood">হোল ব্লাড</option>
                    <option value="Platelets">প্লাটিলেট</option>
                    <option value="Plasma">প্লাজমা</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">মন্তব্য</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDonation(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-semibold hover:bg-slate-50"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  {isUpdating ? 'সংরক্ষণ হচ্ছে...' : 'হালনাগাদ সম্পন্ন করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
