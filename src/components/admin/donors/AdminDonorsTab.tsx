import React, { useState } from 'react';
import {
  Search,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  ArrowRight,
  Trash2,
  Droplets,
  Plus,
  Calendar,
  Building2,
  HeartHandshake,
  UserX,
  FileSpreadsheet,
  History,
  Upload,
  Filter,
} from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useDialog } from '../../../contexts/DialogContext';
import { ROLE_LABELS } from '../../../services/permissionService';
import type { Donor, BloodGroup, Donation, UserRole } from '../../../types';
import { DonorImportWizard } from './import/DonorImportWizard';
import { DonorImportHistory } from './import/DonorImportHistory';
import { RecordDonationModal } from '../donations/RecordDonationModal';
import { PromoteDonorModal } from './PromoteDonorModal';

export const AdminDonorsTab: React.FC = () => {
  const {
    donors,
    donations,
    verifyDonor,
    deleteDonor,
    recordDonation,
    deleteDonation,
    users,
    addUser,
    updateUser,
    updateUserRole,
    updateDonor,
    addAuditLog,
  } = useData();
  const { currentUser } = useAuth();
  const dialog = useDialog();

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isSuperAdminOrAdmin =
    currentUser?.role === 'super_admin' || currentUser?.role === 'admin';
  const canImport = ['super_admin', 'admin', 'moderator'].includes(currentUser?.role || '');

  // Promote Donor to Staff State (Super Admin Only)
  const [promoteTarget, setPromoteTarget] = useState<Donor | null>(null);

  const handlePromoteDonor = async (
    targetDonor: Donor,
    targetRole: UserRole,
    staffEmail: string,
    staffPassword: string,
    targetBranchId: string
  ) => {
    if (!isSuperAdmin) {
      dialog.alert({
        title: 'অননুমোদিত অ্যাকশন',
        message: 'শুধুমাত্র সুপার এডমিন রক্তদাতাকে স্টাফ বা এডমিন পদে অনুমোদন দিতে পারেন।',
        theme: 'danger',
      });
      return;
    }

    const cleanEmail = staffEmail.trim().toLowerCase();
    const cleanPhone = targetDonor.phone.trim();

    // Check if a user account already exists for this donor
    const existingUser = users.find(
      (u) =>
        (targetDonor.userId && u.id === targetDonor.userId) ||
        (u.phone && u.phone === cleanPhone) ||
        (u.email && u.email.toLowerCase() === cleanEmail)
    );

    let assignedUserId = targetDonor.userId;

    if (existingUser) {
      // Update role of existing user
      await updateUserRole(existingUser.id, targetRole);
      await updateUser(existingUser.id, {
        branchId: targetBranchId,
        email: cleanEmail,
        status: 'active',
      });
      assignedUserId = existingUser.id;
    } else {
      // Create new user account for this donor
      const createdUser = await addUser(
        {
          fullName: targetDonor.fullName,
          phone: cleanPhone,
          email: cleanEmail,
          role: targetRole,
          branchId: targetBranchId,
          organizationId: targetDonor.organizationId || 'org-roktobondon',
          status: 'active',
        },
        staffPassword
      );
      assignedUserId = createdUser.id;
    }

    // Explicitly link donor to this user account
    if (assignedUserId && targetDonor.userId !== assignedUserId) {
      await updateDonor(targetDonor.id, {
        userId: assignedUserId,
        email: cleanEmail,
      });
    }

    addAuditLog(
      `সুপার এডমিন কর্তৃক রক্তদাতাকে স্টাফ পদে পদোন্নতি: ${targetDonor.fullName} (${targetDonor.donorId}) -> ${targetRole}`,
      'USER',
      assignedUserId || targetDonor.id,
      { donorId: targetDonor.donorId, role: targetRole, email: cleanEmail }
    );

    dialog.alert({
      title: 'স্টাফ অনুমোদন সম্পন্ন!',
      message: `রক্তদাতা "${targetDonor.fullName}" (${targetDonor.donorId}) সফলভাবে "${ROLE_LABELS[targetRole]?.bn || targetRole}" হিসেবে যুক্ত হয়েছেন। তিনি এখন এই ইমেইল (${cleanEmail}) দিয়ে ড্যাশবোর্ডে লগইন করতে পারবেন।`,
      theme: 'success',
    });
  };

  // Sub-Navigation Mode: 'list' (All/Pending) vs 'import' (Wizard/History)
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'pending' | 'import'>('all');
  const [importSubView, setImportSubView] = useState<'wizard' | 'history'>('wizard');

  // Filters State
  const [donorFilterStatus, setDonorFilterStatus] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [bloodGroupFilter, setBloodGroupFilter] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');
  const [emergencyFilter, setEmergencyFilter] = useState<string>('all');
  const [donorSearch, setDonorSearch] = useState('');

  // Action Loading & Notifications State
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Status Change (Verify/Suspend) Modal State
  const [confirmTarget, setConfirmTarget] = useState<{
    donor: Donor;
    newStatus: 'verified' | 'suspended';
  } | null>(null);
  const [modalNotes, setModalNotes] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  // Delete Donor Modal State
  const [deleteTarget, setDeleteTarget] = useState<Donor | null>(null);
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);

  // Manage Donations Modal State
  const [activeDonationDonor, setActiveDonationDonor] = useState<Donor | null>(null);
  const [isRecordDonationOpen, setIsRecordDonationOpen] = useState(false);
  const [recordTargetDonorId, setRecordTargetDonorId] = useState<string | undefined>(undefined);
  const [showAddDonationForm, setShowAddDonationForm] = useState(false);
  const [newDonationDate, setNewDonationDate] = useState<string>('');
  const [hasSpecificDate, setHasSpecificDate] = useState(true);
  const [newHospital, setNewHospital] = useState('ধামরাই উপজেলা স্বাস্থ্য কমপ্লেক্স');
  const [newUnits, setNewUnits] = useState(1);
  const [newNotes, setNewNotes] = useState('');
  const [isRecordingDonation, setIsRecordingDonation] = useState(false);

  // ==========================================
  // HANDLERS: Status Change (Verify / Suspend)
  // ==========================================
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
    if (verifyingId) return;
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
        currentUser?.fullName || 'Admin',
        modalNotes.trim()
      );

      setActionSuccess(
        `ডোনার ${donor.donorId} (${donor.fullName})-এর স্ট্যাটাস সফলভাবে '${
          newStatus === 'verified' ? 'Verified' : 'Suspended'
        }'-এ পরিবর্তিত হয়েছে।`
      );
      setConfirmTarget(null);
      setModalNotes('');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      const msg = err.message || 'স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে।';
      setModalError(msg);
      setActionError(msg);
    } finally {
      setVerifyingId(null);
    }
  };

  // ==========================================
  // HANDLERS: Donor Deletion
  // ==========================================
  const openDeleteDialog = (donor: Donor) => {
    setDeleteTarget(donor);
    setDeleteModalError(null);
  };

  const closeDeleteDialog = () => {
    if (deletingId) return;
    setDeleteTarget(null);
    setDeleteModalError(null);
  };

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteTarget) return;

    setDeletingId(deleteTarget.id);
    setDeleteModalError(null);
    setActionError(null);

    try {
      await deleteDonor(deleteTarget.id);

      setActionSuccess(
        `ডোনার ${deleteTarget.donorId} (${deleteTarget.fullName})-এর প্রোফাইল/অ্যাকাউন্ট সফলভাবে ডিলিট করা হয়েছে।`
      );
      setDeleteTarget(null);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      const msg = err.message || 'ডোনার ডিলিট করতে সমস্যা হয়েছে।';
      setDeleteModalError(msg);
      setActionError(msg);
    } finally {
      setDeletingId(null);
    }
  };

  // ==========================================
  // HANDLERS: Donation History & Recording
  // ==========================================
  const handleAddDonationForDonor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDonationDonor) return;

    setIsRecordingDonation(true);
    try {
      await recordDonation({
        donorId: activeDonationDonor.donorId,
        donorUserId: activeDonationDonor.userId,
        donorName: activeDonationDonor.fullName,
        bloodGroup: activeDonationDonor.bloodGroup,
        donationDate: hasSpecificDate && newDonationDate ? newDonationDate : null,
        hospital: newHospital.trim() || 'ধামরাই রক্তদান কেন্দ্র',
        units: newUnits || 1,
        donationType: 'Whole Blood',
        verifiedBy: currentUser?.fullName || 'এডমিন',
        verificationDate: new Date().toISOString().split('T')[0],
        notes: newNotes.trim() || undefined,
      });

      setShowAddDonationForm(false);
      setNewDonationDate('');
      setNewNotes('');
      setNewUnits(1);

      setActionSuccess(`"${activeDonationDonor.fullName}"-এর রক্তদান রেকর্ড সফলভাবে যুক্ত হয়েছে।`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      dialog.alert({
        title: 'রেকর্ড ব্যর্থ',
        message: err.message || 'রক্তদান রেকর্ড সংরক্ষণ করা যায়নি।',
        theme: 'danger',
      });
    } finally {
      setIsRecordingDonation(false);
    }
  };

  const handleDeleteDonationRecord = async (donationId: string) => {
    const confirmed = await dialog.confirm({
      title: 'রক্তদান রেকর্ড মুছে ফেলবেন?',
      message: 'এই রক্তদান রেকর্ডটি মুছে ফেলা হবে এবং ডোনারের মোট রক্তদান সংখ্যা স্বয়ংক্রিয়ভাবে আপডেট হবে।',
      theme: 'danger',
      confirmText: 'হ্যাঁ, মুছুন',
      cancelText: 'বাতিল',
    });

    if (!confirmed) return;

    try {
      await deleteDonation(donationId);
      setActionSuccess('রক্তদান রেকর্ড সফলভাবে মুছে ফেলা হয়েছে।');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      dialog.alert({
        title: 'ব্যর্থ হয়েছে',
        message: err.message || 'রক্তদান রেকর্ড মুছতে সমস্যা হয়েছে।',
        theme: 'danger',
      });
    }
  };

  // ==========================================
  // FILTERING LOGIC
  // ==========================================
  const bloodGroups: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const filteredDonors = donors.filter((d) => {
    if (activeSubTab === 'pending' && d.verificationStatus !== 'pending') return false;
    if (donorFilterStatus !== 'all' && d.verificationStatus !== donorFilterStatus) return false;
    if (sourceFilter === 'imported' && (d as any).source !== 'imported') return false;
    if (sourceFilter === 'registered' && (d as any).source === 'imported') return false;
    if (bloodGroupFilter !== 'all' && d.bloodGroup !== bloodGroupFilter) return false;
    if (availabilityFilter === 'available' && !d.availability) return false;
    if (availabilityFilter === 'unavailable' && d.availability) return false;
    if (emergencyFilter === 'emergency_only' && !d.emergencyAvailable) return false;

    if (donorSearch) {
      const q = donorSearch.toLowerCase();
      return (
        d.fullName.toLowerCase().includes(q) ||
        d.donorId.toLowerCase().includes(q) ||
        d.phone.includes(q) ||
        d.area.toLowerCase().includes(q) ||
        d.bloodGroup.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeDonorDonations = activeDonationDonor
    ? donations.filter(
        (don) =>
          don.donorId === activeDonationDonor.donorId ||
          don.donorUserId === activeDonationDonor.userId ||
          don.donorId === activeDonationDonor.id
      )
    : [];

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs space-y-5">
      {/* Top Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('all');
              setDonorFilterStatus('all');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            সকল রক্তদাতা ({donors.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab('pending');
              setDonorFilterStatus('pending');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'pending'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            যাচাইকরণ বাকি ({donors.filter((d) => d.verificationStatus === 'pending').length})
          </button>

          {canImport && (
            <button
              type="button"
              onClick={() => setActiveSubTab('import')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === 'import'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              ডোনার ডাটা আমদানি (Import)
            </button>
          )}
        </div>
      </div>

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

      {/* VIEW 1: IMPORT WIZARD / HISTORY */}
      {activeSubTab === 'import' ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <button
              type="button"
              onClick={() => setImportSubView('wizard')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                importSubView === 'wizard'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              নতুন ফাইল আমদানি (Wizard)
            </button>
            <button
              type="button"
              onClick={() => setImportSubView('history')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                importSubView === 'history'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              আমদানি ইতিহাস ও ব্যাচ (History)
            </button>
          </div>

          {importSubView === 'wizard' ? (
            <DonorImportWizard
              onImportComplete={() => {
                setActiveSubTab('all');
                setDonorFilterStatus('pending');
              }}
              onCancel={() => setActiveSubTab('all')}
            />
          ) : (
            <DonorImportHistory />
          )}
        </div>
      ) : (
        /* VIEW 2: DONOR LIST TABLE */
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="space-y-3">
            {/* Status Filters & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar sm:flex-wrap pb-1 sm:pb-0">
                {[
                  { id: 'all', label: 'সকল স্ট্যাটাস' },
                  { id: 'pending', label: 'যাচাইকরণ বাকি (Pending)' },
                  { id: 'verified', label: 'ভেরিফাইড (Verified)' },
                  { id: 'suspended', label: 'স্থগিত (Suspended)' },
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

            {/* Secondary Filters: Source, Blood Group, Availability, Emergency */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">উৎস (Source):</span>
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 font-bold text-slate-700 text-xs focus:ring-2 focus:ring-red-500"
                >
                  <option value="all">সকল উৎস</option>
                  <option value="registered">অনলাইন রেজিস্টার্ড</option>
                  <option value="imported">কাগজ/এক্সেল আমদানিকৃত</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">রক্তের গ্রুপ:</span>
                <select
                  value={bloodGroupFilter}
                  onChange={(e) => setBloodGroupFilter(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 font-bold text-red-700 text-xs focus:ring-2 focus:ring-red-500"
                >
                  <option value="all">সকল গ্রুপ</option>
                  {bloodGroups.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">প্রাপ্যতা:</span>
                <select
                  value={availabilityFilter}
                  onChange={(e) => setAvailabilityFilter(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 font-semibold text-slate-700 text-xs focus:ring-2 focus:ring-red-500"
                >
                  <option value="all">সকল</option>
                  <option value="available">প্রস্তুত (Available)</option>
                  <option value="unavailable">অপ্রস্তুত (Unavailable)</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <select
                  value={emergencyFilter}
                  onChange={(e) => setEmergencyFilter(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 font-semibold text-slate-700 text-xs focus:ring-2 focus:ring-red-500"
                >
                  <option value="all">জরুরি প্রাপ্যতা (সকল)</option>
                  <option value="emergency_only">🚨 শুধুমাত্র জরুরি প্রস্তুত</option>
                </select>
              </div>

              {(bloodGroupFilter !== 'all' ||
                sourceFilter !== 'all' ||
                availabilityFilter !== 'all' ||
                emergencyFilter !== 'all' ||
                donorSearch) && (
                <button
                  type="button"
                  onClick={() => {
                    setBloodGroupFilter('all');
                    setSourceFilter('all');
                    setAvailabilityFilter('all');
                    setEmergencyFilter('all');
                    setDonorSearch('');
                  }}
                  className="text-red-600 hover:underline font-bold text-[11px] ml-auto cursor-pointer"
                >
                  ফিল্টার রিসেট করুন
                </button>
              )}
            </div>
          </div>

          {/* Donors Table */}
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-y border-slate-200 text-slate-600">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">ডোনার আইডি</th>
                  <th className="py-2.5 px-3 font-semibold">নাম ও উৎস</th>
                  <th className="py-2.5 px-3 font-semibold">রক্তের গ্রুপ</th>
                  <th className="py-2.5 px-3 font-semibold">অবস্থান</th>
                  <th className="py-2.5 px-3 font-semibold">মোবাইল</th>
                  <th className="py-2.5 px-3 font-semibold">রক্তদান</th>
                  <th className="py-2.5 px-3 font-semibold">স্ট্যাটাস</th>
                  <th className="py-2.5 px-3 text-right font-semibold">অ্যাকশন (Action)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDonors.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      কোনো রক্তদাতার রেকর্ড পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  filteredDonors.slice(0, 50).map((d) => {
                    const isCurrentVerifying = verifyingId === d.id;
                    const isCurrentDeleting = deletingId === d.id;
                    const isImported = (d as any).source === 'imported';

                    // Check if this donor is already linked to a staff account
                    const matchingStaff = users.find(
                      (u) =>
                        ['super_admin', 'admin', 'moderator', 'volunteer'].includes(u.role) &&
                        (u.id === d.userId ||
                          (d.phone && u.phone === d.phone) ||
                          (d.email && u.email && d.email.toLowerCase() === u.email.toLowerCase()))
                    );

                    return (
                      <tr key={d.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                          {d.donorId}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{d.fullName}</span>
                            {isImported && (
                              <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded font-sans font-bold">
                                কাগজ/এক্সেল
                              </span>
                            )}
                          </div>
                          {d.emergencyAvailable && (
                            <span className="text-[10px] text-red-600 font-bold flex items-center gap-0.5 mt-0.5">
                              🚨 জরুরি প্রস্তুত
                            </span>
                          )}
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
                          <button
                            type="button"
                            onClick={() => {
                              setActiveDonationDonor(d);
                              setShowAddDonationForm(false);
                            }}
                            className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 font-bold border border-slate-200 text-[11px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                            title="রক্তদানের ইতিহাস দেখুন ও যোগ করুন"
                          >
                            <Droplets className="w-3 h-3 text-red-600" />
                            <span>{d.totalDonations || 0} বার</span>
                          </button>
                        </td>
                        <td className="py-2.5 px-3">
                          {d.verificationStatus === 'verified' ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Verified
                            </span>
                          ) : d.verificationStatus === 'suspended' ? (
                            <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded font-bold border border-red-200 inline-flex items-center gap-1">
                              <UserX className="w-3 h-3 text-red-600" />
                              Suspended
                            </span>
                          ) : (
                            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium border border-amber-200">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-1 whitespace-nowrap">
                          {/* Super Admin Exclusive Action: Promote Donor to Staff/Admin */}
                          {matchingStaff ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold"
                              title={`ইতোমধ্যে ${ROLE_LABELS[matchingStaff.role]?.bn || matchingStaff.role} পদে যুক্ত আছেন`}
                            >
                              <ShieldCheck className="w-3 h-3 text-purple-600" />
                              <span>
                                {matchingStaff.role === 'super_admin'
                                  ? 'সুপার এডমিন'
                                  : matchingStaff.role === 'admin'
                                  ? 'এডমিন'
                                  : matchingStaff.role === 'moderator'
                                  ? 'মডারেটর'
                                  : 'স্বেচ্ছাসেবক'}
                              </span>
                            </span>
                          ) : isSuperAdmin ? (
                            <button
                              type="button"
                              onClick={() => setPromoteTarget(d)}
                              className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 hover:border-indigo-600 transition-all shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                              title="শুধুমাত্র সুপার এডমিন: রক্তদাতাকে স্টাফ/এডমিন পদে অনুমোদন দিন"
                            >
                              <ShieldCheck className="w-3 h-3" />
                              <span>স্টাফ বানান</span>
                            </button>
                          ) : null}

                          {/* Verify / Suspend Toggle Button */}
                          {d.verificationStatus !== 'verified' ? (
                            <button
                              type="button"
                              disabled={Boolean(verifyingId) || Boolean(deletingId)}
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
                              disabled={Boolean(verifyingId) || Boolean(deletingId)}
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

                          {/* Delete Donor Button */}
                          {isSuperAdminOrAdmin && (
                            <button
                              type="button"
                              disabled={Boolean(verifyingId) || Boolean(deletingId)}
                              onClick={() => openDeleteDialog(d)}
                              className="px-2 py-1 rounded-lg text-[11px] font-semibold text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                              title="ডোনার প্রোফাইল মুছে ফেলুন"
                            >
                              <Trash2 className="w-3.5 h-3.5 inline" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. STATUS CONFIRMATION MODAL (Verify / Suspend) */}
      {/* ========================================================================= */}
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
                    অ্যাডমিন অনুমোদন ও ডাটাবেজ সিনক্রোনাইজেশন
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

      {/* ========================================================================= */}
      {/* 2. DELETE DONOR CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-red-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-red-100 flex items-center justify-between bg-red-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    রক্তদাতা অ্যাকাউন্ট স্থায়ীভাবে মুছে ফেলা (Delete Donor)
                  </h3>
                  <p className="text-[11px] text-red-700 font-semibold">
                    সুপার অ্যাডমিন / অ্যাডমিন নিয়ন্ত্রণাধীন অপারেশন
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeDeleteDialog}
                disabled={Boolean(deletingId)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleDeleteSubmit} className="p-5 space-y-4 text-xs">
              {deleteModalError && (
                <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-lg">
                  {deleteModalError}
                </div>
              )}

              {/* Distinction Box: Suspend vs Delete */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 text-amber-900">
                <p className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  গুরুত্বপূর্ণ নিরাপত্তা নির্দেশিকা:
                </p>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-amber-800">
                  <li>
                    <strong>অস্থায়ী স্থগিত (Suspend):</strong> ডোনার ডাটাবেজে থাকবে কিন্তু লগইন বন্ধ থাকবে।
                  </li>
                  <li>
                    <strong>স্থায়ীভাবে মুছে ফেলা (Delete):</strong> ডোনার প্রোফাইল ও লগইন ক্রেডেনশিয়াল স্থায়ীভাবে মুছে যাবে।
                  </li>
                  <li>
                    <strong>স্টাফ + ডোনার সুরক্ষা:</strong> যদি ব্যবহারকারী একই সাথে পোর্টাল স্টাফ (যেমন সুপার এডমিন/এডমিন/ভলান্টিয়ার) হন, তবে শুধুমাত্র তার ডোনার প্রোফাইল মুছে যাবে—<strong>স্টাফ অ্যাকাউন্ট সম্পূর্ণ অক্ষত থাকবে</strong>।
                  </li>
                </ul>
              </div>

              {/* Target Donor Summary */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-800 text-xs">
                    {deleteTarget.donorId}
                  </span>
                  <span className="font-mono font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded text-[11px]">
                    {deleteTarget.bloodGroup}
                  </span>
                </div>
                <div className="text-slate-900 font-bold text-sm">
                  {deleteTarget.fullName}
                </div>
                <div className="text-slate-500 text-[11px] flex justify-between">
                  <span>{deleteTarget.area}, {deleteTarget.upazila}</span>
                  <span className="font-mono">{deleteTarget.phone}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeDeleteDialog}
                  disabled={Boolean(deletingId)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  বাতিল করুন
                </button>

                <button
                  type="submit"
                  disabled={Boolean(deletingId)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    deletingId ? 'opacity-80 cursor-not-allowed' : ''
                  }`}
                >
                  {deletingId ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>ডিলিট হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>হ্যাঁ, নিশ্চিতভাবে মুছে ফেলুন</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DONATION HISTORY & RECORDING MODAL */}
      {/* ========================================================================= */}
      {activeDonationDonor && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    রক্তদানের ইতিহাস ও লগ ব্যবস্থাপনা
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {activeDonationDonor.fullName} ({activeDonationDonor.donorId}) •{' '}
                    <span className="font-bold text-red-700">{activeDonationDonor.bloodGroup}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveDonationDonor(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 text-xs overflow-y-auto">
              {/* Summary Stats Banner */}
              <div className="p-3.5 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-600 font-medium block">রক্তদানের তথ্য</span>
                  <span className="text-base font-black text-red-700">
                    মোট রক্তদান: {activeDonationDonor.totalDonations || activeDonorDonations.length || 0} বার
                  </span>
                  {(activeDonationDonor.historicalDonationCount !== undefined && activeDonationDonor.historicalDonationCount > 0) && (
                    <span className="text-[11px] text-slate-600 block">
                      (কাগজভিত্তিক পূর্ব রেকর্ড: {activeDonationDonor.historicalDonationCount} বার, ডিজিটাল রেকর্ড: {activeDonorDonations.length} বার)
                    </span>
                  )}
                  {activeDonationDonor.lastDonationDate && (
                    <span className="text-[10px] text-slate-500 block font-mono">
                      সর্বশেষ রক্তদান: {activeDonationDonor.lastDonationDate}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRecordTargetDonorId(activeDonationDonor.donorId || activeDonationDonor.id);
                      setIsRecordDonationOpen(true);
                    }}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ রক্তদান রেকর্ড করুন</span>
                  </button>
                </div>
              </div>

              {/* Inline Add Donation Form */}
              {showAddDonationForm && (
                <form
                  onSubmit={handleAddDonationForDonor}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in fade-in duration-150"
                >
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-2">
                    <HeartHandshake className="w-4 h-4 text-red-600" />
                    নতুন রক্তদান ইভেন্ট রেকর্ড করুন
                  </h4>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-700 text-xs">
                        রক্তদানের তারিখ (Donation Date)
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!hasSpecificDate}
                          onChange={(e) => setHasSpecificDate(!e.target.checked)}
                          className="rounded text-red-600 focus:ring-red-500"
                        />
                        <span>তারিখ নির্দিষ্ট নয় / পরে জানানো হবে</span>
                      </label>
                    </div>

                    {hasSpecificDate ? (
                      <input
                        type="date"
                        value={newDonationDate}
                        onChange={(e) => setNewDonationDate(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-red-500"
                      />
                    ) : (
                      <div className="p-2 bg-slate-100 border border-dashed border-slate-300 rounded-lg text-[11px] text-slate-500 font-mono italic">
                        তারিখ উল্লেখ নেই (সরাসরি মোট রক্তদান সংখ্যায় ১ যোগ হবে)
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 text-xs block mb-1">
                        হাসপাতাল / স্থান
                      </label>
                      <input
                        type="text"
                        value={newHospital}
                        onChange={(e) => setNewHospital(e.target.value)}
                        placeholder="যেমন: ধামরাই উপজেলা স্বাস্থ্য কমপ্লেক্স"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-red-500"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 text-xs block mb-1">
                        রক্তের পরিমাণ (ব্যাগ)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={newUnits}
                        onChange={(e) => setNewUnits(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 text-xs block mb-1">
                      মন্তব্য (ঐচ্ছিক)
                    </label>
                    <input
                      type="text"
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="জরুরি সিজারিয়ান / ডেঙ্গু রোগী..."
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setShowAddDonationForm(false)}
                      className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-200 text-xs font-semibold"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      disabled={isRecordingDonation}
                      className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      {isRecordingDonation ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>রেকর্ড সংরক্ষণ করুন</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Donation Records List */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-xs flex items-center justify-between">
                  <span>রক্তদানের ইতিহাস:</span>
                  <span className="text-[11px] text-slate-500">
                    মোট {activeDonorDonations.length} টি ইভেন্ট
                  </span>
                </h4>

                {activeDonorDonations.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-1">
                    <Droplets className="w-6 h-6 mx-auto text-slate-300" />
                    <p className="text-xs">এখনো কোনো রক্তদান রেকর্ড পাওয়া যায়নি।</p>
                    <p className="text-[11px] text-slate-400">
                      উপরের "+ রক্তদান যোগ করুন" বাটনে ক্লিক করে যোগ করতে পারেন।
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeDonorDonations.map((don, idx) => (
                      <div
                        key={don.id || idx}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs hover:bg-slate-100/70 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">
                              {don.hospital || 'ধামরাই রক্তদান কেন্দ্র'}
                            </span>
                            <span className="text-[10px] font-mono bg-white px-1.5 py-0.2 rounded border border-slate-200 text-slate-600">
                              {don.units || 1} ব্যাগ
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {don.donationDate ? (
                                <span className="font-mono font-semibold text-slate-700">
                                  {don.donationDate}
                                </span>
                              ) : (
                                <span className="italic text-slate-400">তারিখ উল্লেখ নেই</span>
                              )}
                            </span>
                            {don.notes && <span>• {don.notes}</span>}
                          </div>
                        </div>

                        {/* Delete single donation record action */}
                        {isSuperAdminOrAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteDonationRecord(don.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="এই রেকর্ডটি মুছুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setActiveDonationDonor(null)}
                className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. REUSABLE RECORD DONATION MODAL */}
      {/* ========================================================================= */}
      <RecordDonationModal
        isOpen={isRecordDonationOpen}
        preSelectedDonorId={recordTargetDonorId}
        onClose={() => {
          setIsRecordDonationOpen(false);
          setRecordTargetDonorId(undefined);
        }}
        onSuccess={() => {
          setIsRecordDonationOpen(false);
          setRecordTargetDonorId(undefined);
          setActionSuccess('রক্তদানের তথ্য সফলভাবে রেকর্ড ও সংরক্ষিত হয়েছে।');
          setTimeout(() => setActionSuccess(null), 4000);
        }}
      />
      {/* ========================================================================= */}
      {/* 5. SUPER ADMIN PROMOTION MODAL */}
      {/* ========================================================================= */}
      <PromoteDonorModal
        isOpen={Boolean(promoteTarget)}
        donor={promoteTarget}
        onClose={() => setPromoteTarget(null)}
        onPromote={handlePromoteDonor}
      />
    </div>
  );
};
