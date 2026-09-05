import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  AlertCircle,
  Award,
  CheckCircle,
  XCircle,
  Plus,
  RotateCcw,
  Settings,
  MapPin,
  Building2,
  FileText,
  Search,
  Filter,
  Eye,
  Sliders,
  Droplets,
  Sparkles,
  Phone,
  Clock,
  Edit2,
  Trash2,
  CheckCircle2,
  Heart,
  Database,
  Download,
  Upload,
  CreditCard,
  TrendingUp,
  Lock,
  Key,
  Shield,
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useOrgConfig } from '../contexts/OrgConfigContext';
import { useAuth } from '../contexts/AuthContext';
import { useDialog } from '../contexts/DialogContext';
import { PERMISSION_DEFINITIONS } from '../data/seedData';
import type {
  BloodGroup,
  VerificationStatus,
  BloodRequest,
  Hospital,
  FundDonation,
  PaymentMethodConfig,
  FundDisbursement,
  User,
  UserRole,
  PermissionKey,
} from '../types';
import {
  HospitalFormModal,
  PaymentMethodModal,
  UserFormModal,
} from '../components/modals';

export const AdminDashboardPage: React.FC = () => {
  const { config, updateConfig } = useOrgConfig();
  const { currentUser } = useAuth();
  const dialog = useDialog();
  const {
    donors,
    bloodRequests,
    donations,
    branches,
    locations,
    auditLogs,
    hospitals,
    fundDonations,
    paymentMethods,
    donationCauses,
    fundDisbursements,
    users,
    verifyDonor,
    updateBloodRequestStatus,
    verifyBloodRequest,
    recordDonation,
    addLocation,
    addBranch,
    addHospital,
    updateHospital,
    deleteHospital,
    verifyHospital,
    addFundDonation,
    verifyFundDonation,
    rejectFundDonation,
    addFundDisbursement,
    deleteFundDisbursement,
    updatePaymentMethod,
    addPaymentMethod,
    deletePaymentMethod,
    updateUserRole,
    updateUser,
    addUser,
    deleteUser,
    permissionMatrix,
    updateRolePermission,
    resetPermissionMatrix,
    hasPermission,
    exportBackupData,
    importBackupData,
    resetDemoData,
  } = useData();

  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'donors'
    | 'requests'
    | 'donations'
    | 'hospitals'
    | 'funds'
    | 'users'
    | 'branches'
    | 'backup'
    | 'audit'
    | 'settings'
  >('overview');

  // Hospital management state
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [hospitalAreaFilter, setHospitalAreaFilter] = useState('all');
  const [showHospitalModal, setShowHospitalModal] = useState(false);
  const [selectedHospitalForEdit, setSelectedHospitalForEdit] = useState<Hospital | null>(null);

  // Fund management state
  const [fundFilterStatus, setFundFilterStatus] = useState<string>('all');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentForEdit, setSelectedPaymentForEdit] = useState<PaymentMethodConfig | null>(null);
  const [showAddDisbModal, setShowAddDisbModal] = useState(false);
  const [disbTitle, setDisbTitle] = useState('');
  const [disbAmount, setDisbAmount] = useState(1000);
  const [disbRecipient, setDisbRecipient] = useState('');
  const [disbArea, setDisbArea] = useState('ধামরাই');
  const [disbCause, setDisbCause] = useState('emergency_patient');
  const [disbNotes, setDisbNotes] = useState('');

  // User management state
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null);
  const [userTabMode, setUserTabMode] = useState<'users' | 'matrix'>('users');
  const [matrixCategoryFilter, setMatrixCategoryFilter] = useState<'all' | 'blood' | 'directory' | 'funds' | 'system'>('all');

  // Backup state
  const [backupRestoreMsg, setBackupRestoreMsg] = useState('');

  // Donors filter
  const [donorFilterStatus, setDonorFilterStatus] = useState<string>('all');
  const [donorSearch, setDonorSearch] = useState('');

  // Requests filter
  const [requestFilterStatus, setRequestFilterStatus] = useState<string>('all');

  // Add donation form state
  const [showAddDonationModal, setShowAddDonationModal] = useState(false);
  const [donationDonorId, setDonationDonorId] = useState('');
  const [donationHospital, setDonationHospital] = useState('ধামরাই উপজেলা স্বাস্থ্য কমপ্লেক্স');
  const [donationDate, setDonationDate] = useState(new Date().toISOString().split('T')[0]);
  const [donationUnits, setDonationUnits] = useState(1);

  // Add branch form state
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchDistrict, setNewBranchDistrict] = useState('Dhaka');
  const [newBranchUpazila, setNewBranchUpazila] = useState('');
  const [newBranchCoordinator, setNewBranchCoordinator] = useState('');
  const [newBranchPhone, setNewBranchPhone] = useState('');

  // Live Settings state
  const [settingsName, setSettingsName] = useState(config.name);
  const [settingsNameBn, setSettingsNameBn] = useState(config.nameBn || 'রক্তবন্ধন রক্তদান সংগঠন');
  const [settingsSlogan, setSettingsSlogan] = useState(config.sloganBn);
  const [settingsHeaderSubtitle, setSettingsHeaderSubtitle] = useState(config.headerSubtitleBn || 'ধামরাই • সাভার • মানিকগঞ্জ');
  const [settingsShowAnnouncement, setSettingsShowAnnouncement] = useState(config.showAnnouncement ?? true);
  const [settingsAnnouncementText, setSettingsAnnouncementText] = useState(config.announcementTextBn || '');
  const [settingsAnnouncementLink, setSettingsAnnouncementLink] = useState(config.announcementLink || '/request-blood');
  const [settingsHotline, setSettingsHotline] = useState(config.emergencyHotline);
  const [settingsEmail, setSettingsEmail] = useState(config.email);
  const [settingsAddress, setSettingsAddress] = useState(config.address || 'ধামরাই ও সাভার কেন্দ্রীয় কার্যালয়, ঢাকা');
  const [settingsFacebook, setSettingsFacebook] = useState(config.facebookUrl || 'https://facebook.com/roktobondon');
  const [settingsFooterAbout, setSettingsFooterAbout] = useState(
    config.footerAboutBn ||
      'ধামরাই, সাভার ও মানিকগঞ্জে জরুরি রক্তের প্রয়োজনে নিঃস্বার্থ রক্তদাতাদের তাৎক্ষণিক সংযোগকারী মানবিক ও স্বেচ্ছাসেবী প্রযুক্তি প্ল্যাটফর্ম।'
  );
  const [settingsFooterSecurity, setSettingsFooterSecurity] = useState(
    config.footerSecurityBadgeBn || 'নিরাপদ ও প্রাইভেসি-সুরক্ষিত ডোনার ডেটাবেজ'
  );
  const [settingsFooterTagline, setSettingsFooterTagline] = useState(
    config.footerTaglineBn || 'ধামরাই, সাভার ও মানিকগঞ্জ'
  );
  const [settingsFooterCopyright, setSettingsFooterCopyright] = useState(
    config.footerCopyrightText || 'সর্বস্বত্ব সংরক্ষিত।'
  );
  const [settingsCoverage1Title, setSettingsCoverage1Title] = useState(
    config.coverageArea1Title || 'ধামরাই ও সাভার শাখা (ঢাকা)'
  );
  const [settingsCoverage1Details, setSettingsCoverage1Details] = useState(
    config.coverageArea1Details || 'ধামরাই সদর, কালামপুর, কুশুরা, বালিয়া, সাভার বাজার, আশুলিয়া'
  );
  const [settingsCoverage2Title, setSettingsCoverage2Title] = useState(
    config.coverageArea2Title || 'মানিকগঞ্জ জেলা শাখা'
  );
  const [settingsCoverage2Details, setSettingsCoverage2Details] = useState(
    config.coverageArea2Details || 'মানিকগঞ্জ সদর, সিংগাইর, সাটুরিয়া, শিবালয়, হরিরামপুর'
  );
  const [settingsSavedNotice, setSettingsSavedNotice] = useState(false);

  // Settings active subtab
  const [settingsActiveSubtab, setSettingsActiveSubtab] = useState<'header' | 'footer' | 'contact' | 'quick'>('header');

  // Stats calculation
  const totalDonors = donors.length;
  const verifiedDonors = donors.filter((d) => d.verificationStatus === 'verified').length;
  const pendingDonors = donors.filter((d) => d.verificationStatus === 'pending').length;
  const activeReqs = bloodRequests.filter((r) => r.status === 'active' || r.status === 'matched');
  const criticalReqs = bloodRequests.filter((r) => r.emergencyLevel === 'CRITICAL');
  const totalDonations = donations.length;

  // Donors by Blood Group count
  const bloodGroupCounts: Record<BloodGroup, number> = {
    'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0
  };
  donors.forEach((d) => {
    if (bloodGroupCounts[d.bloodGroup] !== undefined) {
      bloodGroupCounts[d.bloodGroup]++;
    }
  });

  // Filtered Donors
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

  // Filtered Requests
  const filteredRequests = bloodRequests.filter((r) => {
    if (requestFilterStatus !== 'all' && r.status !== requestFilterStatus) return false;
    return true;
  });

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig({
      name: settingsName,
      nameBn: settingsNameBn,
      sloganBn: settingsSlogan,
      headerSubtitleBn: settingsHeaderSubtitle,
      showAnnouncement: settingsShowAnnouncement,
      announcementTextBn: settingsAnnouncementText,
      announcementLink: settingsAnnouncementLink,
      emergencyHotline: settingsHotline,
      email: settingsEmail,
      address: settingsAddress,
      facebookUrl: settingsFacebook,
      footerAboutBn: settingsFooterAbout,
      footerSecurityBadgeBn: settingsFooterSecurity,
      footerTaglineBn: settingsFooterTagline,
      footerCopyrightText: settingsFooterCopyright,
      coverageArea1Title: settingsCoverage1Title,
      coverageArea1Details: settingsCoverage1Details,
      coverageArea2Title: settingsCoverage2Title,
      coverageArea2Details: settingsCoverage2Details,
    });
    setSettingsSavedNotice(true);
    dialog.alert({
      title: 'সেটিংস সফলভাবে সংরক্ষিত',
      message: 'হেডার, ফুটার টেক্সট, ঘোষণা ব্যানার ও যোগাযোগ তথ্য সফলভাবে আপডেট করা হয়েছে।',
      theme: 'success',
    });
    setTimeout(() => setSettingsSavedNotice(false), 3000);
  };

  const handleCreateDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    const donor = donors.find((d) => d.donorId === donationDonorId || d.id === donationDonorId);
    if (!donor) {
      dialog.alert({
        title: 'ভুল ডোনার আইডি',
        message: 'সঠিক ডোনার আইডি প্রদান করুন (যেমন: DNR-DHM-001001)',
        type: 'danger',
      });
      return;
    }

    await recordDonation({
      donorId: donor.donorId,
      donorUserId: donor.userId,
      donorName: donor.fullName,
      bloodGroup: donor.bloodGroup,
      donationDate,
      hospital: donationHospital,
      units: donationUnits,
      donationType: 'Whole Blood',
      verifiedBy: currentUser?.fullName || 'এডমিন',
      verificationDate: new Date().toISOString().split('T')[0],
      notes: 'সরাসরি এডমিন প্যানেল থেকে সত্যায়িত রক্তদান রেকর্ড।',
    });

    setShowAddDonationModal(false);
    setDonationDonorId('');
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName || !newBranchUpazila) return;

    await addBranch({
      organizationId: config.id,
      name: newBranchName,
      nameBn: newBranchName,
      district: newBranchDistrict,
      upazila: newBranchUpazila,
      coordinatorName: newBranchCoordinator || 'শাখা সমন্বয়ক',
      coordinatorPhone: newBranchPhone || '+8801700000000',
      isActive: true,
    });

    setShowAddBranchModal(false);
    setNewBranchName('');
    setNewBranchUpazila('');
  };

  const handleCreateDisbursement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disbTitle.trim() || !disbAmount || !disbRecipient.trim()) {
      dialog.alert({
        title: 'তথ্য অসম্পূর্ণ',
        message: 'অনুগ্রহ করে ব্যয়ের শিরোনাম, পরিমাণ এবং উপকারভোগীর নাম প্রদান করুন।',
        theme: 'warning',
      });
      return;
    }
    await addFundDisbursement({
      title: disbTitle.trim(),
      amount: Number(disbAmount),
      recipient: disbRecipient.trim(),
      area: disbArea,
      cause: disbCause,
      approvedBy: currentUser?.fullName || 'সুপার এডমিন',
      voucherNo: `VCH-${new Date().getFullYear()}-${String(fundDisbursements.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      notes: disbNotes.trim() || undefined,
    });
    setShowAddDisbModal(false);
    setDisbTitle('');
    setDisbAmount(1000);
    setDisbRecipient('');
    setDisbNotes('');
    dialog.alert({
      title: 'ভাউচার সংরক্ষিত',
      message: 'রোগী সহায়তা বা ব্যয়ের ভাউচার সফলভাবে সিস্টেমে সংরক্ষণ করা হয়েছে।',
      theme: 'success',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-xs font-black uppercase bg-slate-900 text-white tracking-wider">
              Admin Portal
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              এডমিন ও মডারেশন কন্ট্রোল প্যানেল
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ধামরাই, সাভার ও মানিকগঞ্জ জেলা ও উপজেলা ভিত্তিক পূর্ণাঙ্গ রক্তদান ব্যবস্থাপনা
          </p>
        </div>

        {/* Demo Data Reset Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              const confirmed = await dialog.confirm({
                title: 'টেস্ট ডেটাবেজ রিসেট',
                message: 'আপনি কি টেস্ট ডেটাবেজ রিসেট করতে চান? (১০০ ডোনার, ২০ রিকোয়েস্ট, ৫০ রক্তদান তৈরি হবে)',
                type: 'danger',
                confirmText: 'হ্যাঁ, রিসেট করুন',
                cancelText: 'বাতিল',
              });
              if (confirmed) {
                resetDemoData();
                dialog.alert({
                  title: 'রিসেট সম্পন্ন!',
                  message: 'ডেটাবেজ সফলভাবে রিসেট ও সিড করা হয়েছে!',
                  type: 'success',
                });
              }
            }}
            className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200"
            title="১০০ জন ডোনার, ২০ আবেদন এবং ৫০ রক্তদান পুনঃলোড করুন"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            ডেমো ডেটা রিসেট (100 Donors Seed)
          </button>
        </div>
      </div>

      {/* Admin Tab Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2 text-xs font-semibold">
        {[
          { id: 'overview', label: 'ওভারভিউ', icon: Sliders },
          { id: 'donors', label: `রক্তদাতা (${donors.length})`, icon: Users },
          { id: 'requests', label: `আবেদন (${bloodRequests.length})`, icon: Droplets },
          { id: 'donations', label: `রক্তদান (${donations.length})`, icon: Award },
          { id: 'hospitals', label: `হাসপাতাল (${hospitals.length})`, icon: Building2 },
          { id: 'funds', label: `তহবিল ও অনুদান (${fundDonations.length})`, icon: Heart },
          { id: 'users', label: `ইউজার ও রোল (${users.length})`, icon: ShieldCheck },
          { id: 'branches', label: `শাখা (${branches.length})`, icon: MapPin },
          { id: 'backup', label: 'ব্যাকআপ ও রিস্টোর', icon: Database },
          { id: 'audit', label: `অডিট (${auditLogs.length})`, icon: FileText },
          { id: 'settings', label: 'সেটিংস', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg flex items-center gap-1.5 transition-colors ${
                activeTab === tab.id
                  ? 'bg-red-600 text-white shadow-xs font-bold border border-red-700/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-slate-50 sm:bg-transparent border border-slate-200/80 sm:border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-xs text-slate-400 font-medium">মোট ডোনার</span>
              <span className="text-2xl font-black text-slate-900 block mt-1 tracking-tight">{totalDonors}</span>
              <span className="text-[10px] text-slate-500">ধামরাই, সাভার, মানিকগঞ্জ</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-xs text-slate-400 font-medium">ভেরিফাইড ডোনার</span>
              <span className="text-2xl font-black text-emerald-600 block mt-1 tracking-tight">{verifiedDonors}</span>
              <span className="text-[10px] text-emerald-700 font-medium">পরিচয় নিশ্চিত</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-xs text-slate-400 font-medium">যাচাইকরণ বাকি</span>
              <span className="text-2xl font-black text-amber-600 block mt-1 tracking-tight">{pendingDonors}</span>
              <span className="text-[10px] text-amber-700 font-medium">রিভিউ প্রয়োজন</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-xs text-slate-400 font-medium">সক্রিয় রক্তের আবেদন</span>
              <span className="text-2xl font-black text-blue-600 block mt-1 tracking-tight">{activeReqs.length}</span>
              <span className="text-[10px] text-blue-700 font-medium">চলমান সেবা</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-xs text-slate-400 font-medium">জরুরি ক্রাইসিস</span>
              <span className="text-2xl font-black text-red-600 block mt-1 tracking-tight">{criticalReqs.length}</span>
              <span className="text-[10px] text-red-600 font-bold">আইসিইউ/অপারেশন</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-xs text-slate-400 font-medium">মোট রক্তদান সম্পন্ন</span>
              <span className="text-2xl font-black text-purple-600 block mt-1 tracking-tight">{totalDonations}</span>
              <span className="text-[10px] text-purple-700 font-medium">জীবন বাঁচানো হয়েছে</span>
            </div>
          </div>

          {/* Blood Group Breakdown Chart / Bars */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Droplets className="w-4 h-4 text-red-600" />
                রক্তের গ্রুপ অনুযায়ী ডোনারের সংখ্যা
              </h2>
              <div className="grid grid-cols-4 gap-3">
                {(Object.keys(bloodGroupCounts) as BloodGroup[]).map((group) => {
                  const count = bloodGroupCounts[group];
                  const percent = totalDonors > 0 ? Math.round((count / totalDonors) * 100) : 0;
                  return (
                    <div key={group} className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-center">
                      <span className="text-base font-black text-red-700 font-mono block">{group}</span>
                      <span className="text-xs font-bold text-slate-800 block mt-0.5">{count} জন</span>
                      <span className="text-[10px] text-slate-400 font-mono block">{percent}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* District Breakdown */}
            <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-600" />
                 শাখা ও জেলা অনুযায়ী ডোনারের বণ্টন
              </h2>
              <div className="space-y-3 text-xs">
                {branches.map((branch) => {
                  const branchDonors = donors.filter(
                    (d) => d.district === branch.district || d.upazila === branch.upazila
                  ).length;
                  const pct = totalDonors > 0 ? Math.round((branchDonors / totalDonors) * 100) : 0;
                  return (
                    <div key={branch.id} className="space-y-1">
                      <div className="flex items-center justify-between font-semibold text-slate-700">
                        <span>{branch.nameBn} ({branch.upazila})</span>
                        <span>{branchDonors} জন ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-600 rounded-full"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DONORS MANAGEMENT */}
      {activeTab === 'donors' && (
        <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {['all', 'pending', 'verified', 'unverified'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setDonorFilterStatus(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                    donorFilterStatus === status
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {status === 'all'
                    ? 'সকল রক্তদাতা'
                    : status === 'pending'
                    ? 'যাচাইকরণ বাকি (Pending)'
                    : status === 'verified'
                    ? 'ভেরিফাইড (Verified)'
                    : 'অপ্রমাণিত'}
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

          <div className="overflow-x-auto">
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
                {filteredDonors.slice(0, 50).map((d) => (
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
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
                          ✓ Verified
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
                          onClick={() => verifyDonor(d.id, 'verified', currentUser?.fullName || 'Admin')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition-colors"
                        >
                          Verify
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => verifyDonor(d.id, 'suspended', currentUser?.fullName || 'Admin')}
                          className="px-2 py-1 bg-slate-200 hover:bg-red-100 text-slate-700 hover:text-red-700 rounded text-[11px] transition-colors"
                        >
                          Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BLOOD REQUESTS */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all', label: 'সকল আবেদন' },
              { id: 'active', label: 'সক্রিয় (Active)' },
              { id: 'matched', label: 'ম্যাচড (Matched)' },
              { id: 'fulfilled', label: 'সম্পন্ন (Fulfilled)' },
              { id: 'pending', label: 'যাচাইকরণ বাকি' },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setRequestFilterStatus(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  requestFilterStatus === s.id
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-y border-slate-200 text-slate-600">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">রিকুয়েস্ট আইডি</th>
                  <th className="py-2.5 px-3 font-semibold">রোগীর নাম</th>
                  <th className="py-2.5 px-3 font-semibold">গ্রুপ ও পরিমাণ</th>
                  <th className="py-2.5 px-3 font-semibold">হাসপাতাল</th>
                  <th className="py-2.5 px-3 font-semibold">জরুরি মাত্রা</th>
                  <th className="py-2.5 px-3 font-semibold">স্ট্যাটাস</th>
                  <th className="py-2.5 px-3 text-right font-semibold">মডারেশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                      {r.requestId}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {r.patientName}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-red-700">
                      {r.bloodGroup} ({r.requiredUnits} ব্যাগ)
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {r.hospital}
                    </td>
                    <td className="py-2.5 px-3 font-bold">
                      <span className={r.emergencyLevel === 'CRITICAL' ? 'text-red-600' : 'text-slate-700'}>
                        {r.emergencyLevel}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="capitalize px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100">
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-1">
                      {!r.verification.isVerified && (
                        <button
                          type="button"
                          onClick={() => verifyBloodRequest(r.id, currentUser?.fullName || 'Admin')}
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[11px] font-semibold"
                        >
                          Verify
                        </button>
                      )}
                      {r.status !== 'fulfilled' && (
                        <button
                          type="button"
                          onClick={() => updateBloodRequestStatus(r.id, 'fulfilled')}
                          className="px-2 py-1 bg-purple-600 text-white rounded text-[11px] font-semibold"
                        >
                          Complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DONATIONS LOG */}
      {activeTab === 'donations' && (
        <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              সফল রক্তদানের রেজিস্টার ({donations.length} টি সম্পন্ন)
            </h2>
            <button
              type="button"
              onClick={() => setShowAddDonationModal(true)}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs border border-red-700/60"
            >
              <Plus className="w-4 h-4" />
              নতুন রক্তদান রেকর্ড করুন
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-y border-slate-200 text-slate-600">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">তারিখ</th>
                  <th className="py-2.5 px-3 font-semibold">ডোনার আইডি</th>
                  <th className="py-2.5 px-3 font-semibold">ডোনারের নাম</th>
                  <th className="py-2.5 px-3 font-semibold">গ্রুপ</th>
                  <th className="py-2.5 px-3 font-semibold">হাসপাতাল</th>
                  <th className="py-2.5 px-3 font-semibold">পরিমাণ</th>
                  <th className="py-2.5 px-3 font-semibold">যাচাইকারী</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {donations.slice(0, 50).map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-medium text-slate-800">{d.donationDate}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{d.donorId}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{d.donorName}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-red-700">{d.bloodGroup}</td>
                    <td className="py-2.5 px-3 text-slate-600">{d.hospital}</td>
                    <td className="py-2.5 px-3">{d.units} ব্যাগ</td>
                    <td className="py-2.5 px-3 text-slate-500">{d.verifiedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: BRANCHES & LOCATIONS */}
      {activeTab === 'branches' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  সক্রিয় শাখা ও চ্যাপ্টারসমূহ
                </h2>
                <p className="text-xs text-slate-500">
                  ধামরাই, সাভার ও মানিকগঞ্জ কেন্দ্রিক বর্তমান চ্যাপ্টার
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddBranchModal(true)}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs border border-red-700/60"
              >
                <Plus className="w-4 h-4" />
                নতুন শাখা যুক্ত করুন
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {branches.map((b) => (
                <div key={b.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-2 text-xs">
                  <span className="font-mono text-[10px] text-slate-400 block">{b.id}</span>
                  <h3 className="font-bold text-sm text-slate-900">{b.nameBn}</h3>
                  <p className="text-slate-600">{b.district} • {b.upazila}</p>
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="font-medium text-slate-700">{b.coordinatorName}</span>
                    <span className="font-mono text-red-700 font-bold">{b.coordinatorPhone}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: HOSPITALS */}
      {activeTab === 'hospitals' && (
        <div className="space-y-6">
          {/* Metrics summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-xs text-slate-400 font-medium">মোট স্বাস্থ্যকেন্দ্র</span>
              <span className="text-2xl font-black text-slate-900 block mt-1 tracking-tight">{hospitals.length}</span>
              <span className="text-[10px] text-slate-500">সরকারি ও বেসরকারি</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-xs text-slate-400 font-medium">ব্লাড ব্যাংক ও ল্যাব</span>
              <span className="text-2xl font-black text-red-600 block mt-1 tracking-tight">{hospitals.filter((h) => h.hasBloodBank).length}</span>
              <span className="text-[10px] text-slate-500">রক্ত পরিসঞ্চালন সুবিধা</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-xs text-slate-400 font-medium">আইসিইউ (ICU)</span>
              <span className="text-2xl font-black text-blue-600 block mt-1 tracking-tight">{hospitals.filter((h) => h.hasICU).length}</span>
              <span className="text-[10px] text-slate-500">ইনটেনসিভ কেয়ার ইউনিট</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-xs text-slate-400 font-medium">অনিবন্ধিত / পেন্ডিং</span>
              <span className="text-2xl font-black text-amber-600 block mt-1 tracking-tight">
                {hospitals.filter((h) => h.isCommunityAdded || h.verificationStatus === 'unverified').length}
              </span>
              <span className="text-[10px] text-slate-500">কমিউনিটি কর্তৃক যুক্ত</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  হাসপাতাল ও ব্লাড ব্যাংক ব্যবস্থাপনা ডিরেক্টরি
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  ধামরাই, কালামপুর, সাভার ও মানিকগঞ্জের স্বাস্থ্যসেবা কেন্দ্রসমূহের তালিকা ও তথ্য নিয়ন্ত্রণ
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedHospitalForEdit(null);
                  setShowHospitalModal(true);
                }}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs border border-red-700/60"
              >
                <Plus className="w-4 h-4" />
                নতুন হাসপাতাল যোগ করুন
              </button>
            </div>

            {/* Filter and Search */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={hospitalSearch}
                  onChange={(e) => setHospitalSearch(e.target.value)}
                  placeholder="নাম, উপজেলা বা ঠিকানা দিয়ে অনুসন্ধান..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <select
                value={hospitalAreaFilter}
                onChange={(e) => setHospitalAreaFilter(e.target.value)}
                className="w-full sm:w-48 px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 font-medium"
              >
                <option value="all">সকল এলাকা ({hospitals.length})</option>
                <option value="Kalampur">কালামপুর বাজার</option>
                <option value="Dhamrai">ধামরাই উপজেলা</option>
                <option value="Savar">সাভার উপজেলা</option>
                <option value="Manikganj">মানিকগঞ্জ জেলা</option>
                <option value="unverified">শুধুমাত্র অনিবন্ধিত/পেন্ডিং</option>
              </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-y border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">হাসপাতালের নাম</th>
                    <th className="py-2.5 px-3 font-semibold">ক্যাটাগরি</th>
                    <th className="py-2.5 px-3 font-semibold">এলাকা / উপজেলা</th>
                    <th className="py-2.5 px-3 font-semibold">যোগাযোগ</th>
                    <th className="py-2.5 px-3 font-semibold">সুবিধাসমূহ</th>
                    <th className="py-2.5 px-3 font-semibold text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {hospitals
                    .filter((h) => {
                      if (hospitalAreaFilter === 'unverified') {
                        if (!h.isCommunityAdded && h.verificationStatus !== 'unverified') return false;
                      } else if (hospitalAreaFilter === 'Kalampur') {
                        if (!h.address.includes('কালামপুর') && !h.nameBn.includes('কালামপুর') && !h.id.includes('klm')) return false;
                      } else if (hospitalAreaFilter !== 'all') {
                        if (h.upazila !== hospitalAreaFilter && h.district !== hospitalAreaFilter) return false;
                      }
                      if (hospitalSearch.trim()) {
                        const q = hospitalSearch.toLowerCase();
                        return (
                          h.nameBn.toLowerCase().includes(q) ||
                          h.nameEn.toLowerCase().includes(q) ||
                          h.address.toLowerCase().includes(q) ||
                          h.upazila.toLowerCase().includes(q)
                        );
                      }
                      return true;
                    })
                    .map((h) => {
                      const isUnverified = h.isCommunityAdded || h.verificationStatus === 'unverified';
                      return (
                        <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{h.nameBn}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{h.nameEn}</div>
                            {isUnverified && (
                              <span className="inline-flex items-center gap-1 mt-1 text-[10px] px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-900 font-bold border border-amber-300">
                                <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                                অনিবন্ধিত এন্ট্রি
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-slate-50 text-slate-700 border-slate-200">
                              {h.category === 'government'
                                ? 'সরকারি'
                                : h.category === 'medical_college'
                                ? 'মেডিকেল কলেজ'
                                : h.category === 'blood_bank'
                                ? 'ব্লাড ব্যাংক'
                                : 'বেসরকারি'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            <div>{h.upazila}, {h.district}</div>
                            <div className="text-[10px] text-slate-400 max-w-xs truncate">{h.address}</div>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-700">
                            <div>📞 {h.hotline}</div>
                            {h.ambulancePhone && <div className="text-red-600 text-[10px]">🚑 {h.ambulancePhone}</div>}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1 flex-wrap">
                              {h.hasBloodBank && (
                                <span className="px-1.5 py-0.5 rounded-sm bg-red-50 text-red-700 text-[10px] font-bold border border-red-200">
                                  ব্লাড ব্যাংক
                                </span>
                              )}
                              {h.hasICU && (
                                <span className="px-1.5 py-0.5 rounded-sm bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                                  ICU
                                </span>
                              )}
                              {h.isOpen24Hours && (
                                <span className="px-1.5 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
                                  ২৪/৭
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isUnverified && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await verifyHospital(h.id);
                                    dialog.alert({
                                      title: 'যাচাইকৃত হয়েছে',
                                      message: `"${h.nameBn}" স্থায়ীভাবে অনুমোদন করা হয়েছে।`,
                                      theme: 'success',
                                    });
                                  }}
                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg border border-emerald-200 flex items-center gap-1"
                                  title="অনুমোদন করুন"
                                >
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  ভেরিফাই
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedHospitalForEdit(h);
                                  setShowHospitalModal(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-slate-200"
                                title="তথ্য এডিট করুন"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  const ok = await dialog.confirm({
                                    title: 'হাসপাতাল মুছে ফেলবেন?',
                                    message: `"${h.nameBn}" ডিরেক্টরি থেকে মুছে ফেলতে চান?`,
                                    confirmText: 'হ্যাঁ, মুছুন',
                                    confirmTheme: 'danger',
                                  });
                                  if (ok) {
                                    await deleteHospital(h.id);
                                    dialog.alert({
                                      title: 'মুছে ফেলা হয়েছে',
                                      message: 'হাসপাতালটি সফলভাবে অপসারণ করা হয়েছে।',
                                      theme: 'success',
                                    });
                                  }
                                }}
                                className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg border border-slate-200"
                                title="মুছে ফেলুন"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: FUNDS & DONATIONS */}
      {activeTab === 'funds' && (
        <div className="space-y-6">
          {/* Financial Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-xs text-slate-400 font-medium">মোট অনুদান প্রাপ্তি</span>
              <span className="text-2xl font-black text-slate-900 block mt-1 tracking-tight font-mono">
                ৳ {fundDonations.filter((d) => d.status === 'verified').reduce((s, d) => s + d.amount, 0).toLocaleString()}
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold">যাচাইকৃত ডোনেশন</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-xs text-slate-400 font-medium">রোগী সহায়তা ব্যয়</span>
              <span className="text-2xl font-black text-red-600 block mt-1 tracking-tight font-mono">
                ৳ {fundDisbursements.reduce((s, d) => s + d.amount, 0).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold">{fundDisbursements.length}টি কার্যক্রমে প্রদান</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-xs text-slate-400 font-medium">চলতি ফান্ড ব্যালেন্স</span>
              <span className="text-2xl font-black text-emerald-600 block mt-1 tracking-tight font-mono">
                ৳ {(
                  fundDonations.filter((d) => d.status === 'verified').reduce((s, d) => s + d.amount, 0) -
                  fundDisbursements.reduce((s, d) => s + d.amount, 0)
                ).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold">বর্তমান রিজার্ভ ফান্ড</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-xs text-slate-400 font-medium">যাচাইকরণ বাকি</span>
              <span className="text-2xl font-black text-amber-600 block mt-1 tracking-tight font-mono">
                {fundDonations.filter((d) => d.status === 'pending').length} টি
              </span>
              <span className="text-[10px] text-amber-700 font-semibold">অনুমোদন প্রয়োজন</span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/90">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">আর্থিক অনুদান ও তহবিল ব্যবস্থাপনা</h3>
              <p className="text-xs text-slate-500">বিকাশ, নগদ, ব্যাংক ডোনেশন ভেরিফিকেশন ও রোগী সহায়তা ভাউচার</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowAddDisbModal(true)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                নতুন রোগী সহায়তা / ব্যয় এন্ট্রি
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedPaymentForEdit(null);
                  setShowPaymentModal(true);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-200"
              >
                <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                পেমেন্ট মেথড সেটিংস
              </button>
            </div>
          </div>

          {/* Section 1: Donations List */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h4 className="font-bold text-slate-900 text-sm">প্রাপ্ত অনুদানের তালিকা ({fundDonations.length})</h4>
              <select
                value={fundFilterStatus}
                onChange={(e) => setFundFilterStatus(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 font-medium"
              >
                <option value="all">সকল ডোনেশন ({fundDonations.length})</option>
                <option value="pending">পেন্ডিং ভেরিফিকেশন ({fundDonations.filter((d) => d.status === 'pending').length})</option>
                <option value="verified">যাচাইকৃত / অনুমোদিত ({fundDonations.filter((d) => d.status === 'verified').length})</option>
                <option value="rejected">বাতিলকৃত</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-y border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">দাতার নাম ও ফোন</th>
                    <th className="py-2.5 px-3 font-semibold">পরিমাণ</th>
                    <th className="py-2.5 px-3 font-semibold">মেথড ও TrxID</th>
                    <th className="py-2.5 px-3 font-semibold">উদ্দেশ্য / খাত</th>
                    <th className="py-2.5 px-3 font-semibold">তারিখ ও এলাকা</th>
                    <th className="py-2.5 px-3 font-semibold">স্ট্যাটাস</th>
                    <th className="py-2.5 px-3 font-semibold text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fundDonations
                    .filter((d) => fundFilterStatus === 'all' || d.status === fundFilterStatus)
                    .map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">
                            {d.isAnonymous ? 'গোপন শুভানুধ্যায়ী' : d.donorName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {d.donorPhone}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-emerald-600">
                          ৳ {d.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-mono">
                          <span className="font-semibold text-slate-800">{d.paymentMethod}</span>
                          <div className="text-[10px] text-red-700 font-bold">{d.transactionId}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {d.fundCause === 'emergency_patient'
                            ? 'জরুরি রোগী ফান্ড'
                            : d.fundCause === 'blood_bags_kits'
                            ? 'ব্লাড ব্যাগ ও কিটস'
                            : d.fundCause === 'volunteer_campaign'
                            ? 'ক্যাম্পেইন ফান্ড'
                            : 'সাধারণ ফান্ড'}
                        </td>
                        <td className="py-3 px-3 text-slate-500 text-[11px]">
                          <div>{new Date(d.createdAt).toLocaleDateString()}</div>
                          <div className="text-slate-400">{d.area || 'ধামরাই'}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              d.status === 'verified'
                                ? 'bg-emerald-100 text-emerald-800'
                                : d.status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {d.status === 'verified' ? 'যাচাইকৃত ✓' : d.status === 'pending' ? 'পেন্ডিং' : 'বাতিল'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {d.status === 'pending' && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={async () => {
                                  await verifyFundDonation(d.id, currentUser?.fullName || 'এডমিন');
                                  dialog.alert({
                                    title: 'অনুমোদন সফল',
                                    message: `৳${d.amount} টাকার অনুদান সফলভাবে অনুমোদন করা হয়েছে।`,
                                    theme: 'success',
                                  });
                                }}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-bold"
                              >
                                অনুমোদন
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await rejectFundDonation(d.id);
                                  dialog.alert({
                                    title: 'বাতিল করা হয়েছে',
                                    message: 'অনুদানের আবেদনটি বাতিল হিসেবে চিহ্নিত করা হয়েছে।',
                                    theme: 'warning',
                                  });
                                }}
                                className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-[10px] font-semibold"
                              >
                                বাতিল
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Disbursements Table */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">রোগী সহায়তা ও ব্যয় ভাউচার ({fundDisbursements.length})</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-y border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">তারিখ ও ভাউচার</th>
                    <th className="py-2.5 px-3 font-semibold">ব্যয়ের বিবরণ</th>
                    <th className="py-2.5 px-3 font-semibold">উপকারভোগী / হাসপাতাল</th>
                    <th className="py-2.5 px-3 font-semibold">এলাকা</th>
                    <th className="py-2.5 px-3 font-semibold">পরিমাণ</th>
                    <th className="py-2.5 px-3 font-semibold">অনুমোদনকারী</th>
                    <th className="py-2.5 px-3 font-semibold text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fundDisbursements.map((disb) => (
                    <tr key={disb.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-mono">
                        <div className="font-bold">{disb.date}</div>
                        <div className="text-[10px] text-slate-400">{disb.voucherNo}</div>
                      </td>
                      <td className="py-2.5 px-3 max-w-xs text-slate-800 font-medium">
                        {disb.title}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{disb.recipient}</td>
                      <td className="py-2.5 px-3 text-slate-600">{disb.area}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-red-600">
                        ৳ {disb.amount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">{disb.approvedBy}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={async () => {
                            const ok = await dialog.confirm({
                              title: 'ব্যয় রেকর্ড মুছে ফেলবেন?',
                              message: `"${disb.title}" রেকর্ডটি তালিকা থেকে মুছে ফেলতে চান?`,
                              confirmText: 'হ্যাঁ, মুছুন',
                              confirmTheme: 'danger',
                            });
                            if (ok) {
                              await deleteFundDisbursement(disb.id);
                              dialog.alert({
                                title: 'মুছে ফেলা হয়েছে',
                                message: 'ব্যয় রেকর্ডটি সফলভাবে মুছে ফেলা হয়েছে।',
                                theme: 'success',
                              });
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: USER & ROLE MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* User Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-xs text-slate-400 font-medium">মোট ইউজার</span>
              <span className="text-2xl font-black text-slate-900 block mt-1 tracking-tight">{users.length}</span>
              <span className="text-[10px] text-slate-500">নিবন্ধিত অ্যাকাউন্ট</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-xs text-slate-400 font-medium">সুপার এডমিন</span>
              <span className="text-2xl font-black text-purple-700 block mt-1 tracking-tight">
                {users.filter((u) => u.role === 'super_admin').length}
              </span>
              <span className="text-[10px] text-purple-600 font-semibold">পূর্ণ নিয়ন্ত্রণ ক্ষমতা</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-xs text-slate-400 font-medium">এডমিন ও মডারেটর</span>
              <span className="text-2xl font-black text-blue-600 block mt-1 tracking-tight">
                {users.filter((u) => u.role === 'admin' || u.role === 'moderator').length}
              </span>
              <span className="text-[10px] text-blue-600 font-semibold">ধামরাই ও সাভার চ্যাপ্টার</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-xs text-slate-400 font-medium">স্বেচ্ছাসেবক ও ডোনার</span>
              <span className="text-2xl font-black text-emerald-600 block mt-1 tracking-tight">
                {users.filter((u) => u.role === 'volunteer' || u.role === 'donor').length}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold">ফিল্ড সাপোর্ট সদস্য</span>
            </div>
          </div>

          {/* Sub Navigation: Users List vs Permission Matrix */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setUserTabMode('users')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  userTabMode === 'users'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>নিবন্ধিত সদস্য তালিকা ({users.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setUserTabMode('matrix')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  userTabMode === 'matrix'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Key className="w-4 h-4" />
                <span>রোল ও পারমিশন ম্যাট্রিক্স (Permission Matrix)</span>
              </button>
            </div>

            {userTabMode === 'users' ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedUserForEdit(null);
                  setShowUserModal(true);
                }}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন সদস্য যুক্ত করুন</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  const ok = await dialog.confirm({
                    title: 'ডিফল্ট পারমিশন রিস্টোর করবেন?',
                    message: 'সকল রোলের পারমিশন সিস্টেমের আদি ডিফল্ট অবস্থায় ফিরিয়ে নিতে চান?',
                    confirmText: 'হ্যাঁ, রিস্টোর করুন',
                    confirmTheme: 'warning',
                  });
                  if (ok) {
                    resetPermissionMatrix();
                    dialog.alert({
                      title: 'রিস্টোর সম্পন্ন',
                      message: 'রোল ও পারমিশন ম্যাট্রিক্স সফলভাবে ডিফল্ট সেটিংসে ফিরিয়ে নেওয়া হয়েছে।',
                      theme: 'success',
                    });
                  }
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-200 shrink-0 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ডিফল্ট পারমিশন রিস্টোর</span>
              </button>
            )}
          </div>

          {/* VIEW 1: USERS LIST */}
          {userTabMode === 'users' && (
            <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">ব্যবহারকারী ও ডায়নামিক রোল ব্যবস্থাপনা</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    সদস্যদের রোল পরিবর্তন, মডারেটর অনুমোদন এবং তাৎক্ষণিক পদবী নির্ধারণ
                  </p>
                </div>
              </div>

              {/* Filter toolbar */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="নাম, মোবাইল বা ইমেইল দিয়ে অনুসন্ধান..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="w-full sm:w-48 px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 font-medium"
                >
                  <option value="all">সকল রোল ({users.length})</option>
                  <option value="super_admin">সুপার এডমিন</option>
                  <option value="admin">এডমিন</option>
                  <option value="moderator">মডারেটর</option>
                  <option value="volunteer">স্বেচ্ছাসেবক</option>
                  <option value="donor">রক্তদাতা</option>
                  <option value="recipient">রক্ত গ্রহীতা</option>
                </select>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-y border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">সদস্যের নাম</th>
                      <th className="py-2.5 px-3 font-semibold">বর্তমান রোল (ডায়নামিক পরিবর্তন)</th>
                      <th className="py-2.5 px-3 font-semibold">মোবাইল</th>
                      <th className="py-2.5 px-3 font-semibold">ইমেইল</th>
                      <th className="py-2.5 px-3 font-semibold">শাখা</th>
                      <th className="py-2.5 px-3 font-semibold text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users
                      .filter((u) => {
                        if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
                        if (userSearch.trim()) {
                          const q = userSearch.toLowerCase();
                          return (
                            u.fullName.toLowerCase().includes(q) ||
                            u.phone.includes(q) ||
                            (u.email && u.email.toLowerCase().includes(q))
                          );
                        }
                        return true;
                      })
                      .map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{u.fullName}</div>
                            <span className="text-[10px] text-slate-400 font-mono">{u.id}</span>
                          </td>
                          <td className="py-3 px-3">
                            <select
                              value={u.role}
                              onChange={async (e) => {
                                const newRole = e.target.value as UserRole;
                                await updateUserRole(u.id, newRole);
                                dialog.alert({
                                  title: 'রোল পরিবর্তন সফল',
                                  message: `"${u.fullName}"-এর রোল সফলভাবে "${newRole}" নির্ধারণ করা হয়েছে।`,
                                  theme: 'success',
                                });
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                                u.role === 'super_admin'
                                  ? 'bg-purple-50 text-purple-800 border-purple-200'
                                  : u.role === 'admin'
                                  ? 'bg-red-50 text-red-800 border-red-200'
                                  : u.role === 'moderator'
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : u.role === 'volunteer'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-slate-50 text-slate-700 border-slate-200'
                              }`}
                            >
                              <option value="super_admin">সুপার এডমিন</option>
                              <option value="admin">এডমিন</option>
                              <option value="moderator">মডারেটর</option>
                              <option value="volunteer">স্বেচ্ছাসেবক</option>
                              <option value="donor">রক্তদাতা</option>
                              <option value="recipient">রক্ত গ্রহীতা</option>
                            </select>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-700">{u.phone}</td>
                          <td className="py-3 px-3 text-slate-500 font-mono">{u.email || '—'}</td>
                          <td className="py-3 px-3 text-slate-600">
                            {u.branchId === 'br-dhm'
                              ? 'ধামরাই শাখা'
                              : u.branchId === 'br-svr'
                              ? 'সাভার শাখা'
                              : 'মানিকগঞ্জ শাখা'}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedUserForEdit(u);
                                  setShowUserModal(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                                title="ইউজার এডিট"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  const ok = await dialog.confirm({
                                    title: 'ইউজার মুছে ফেলতে চান?',
                                    message: `"${u.fullName}" অ্যাকাউন্টটি প্ল্যাটফর্ম থেকে মুছে ফেলতে চান?`,
                                    confirmText: 'হ্যাঁ, মুছুন',
                                    confirmTheme: 'danger',
                                  });
                                  if (ok) {
                                    await deleteUser(u.id);
                                    dialog.alert({
                                      title: 'ইউজার মুছে ফেলা হয়েছে',
                                      message: 'অ্যাকাউন্টটি সফলভাবে অপসারণ করা হয়েছে।',
                                      theme: 'success',
                                    });
                                  }
                                }}
                                className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                                title="ইউজার ডিলিট"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 2: DYNAMIC ROLE & PERMISSION MATRIX */}
          {userTabMode === 'matrix' && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-red-600" />
                    ডায়নামিক রোল ও পারমিশন ম্যাট্রিক্স (Role Permission Matrix)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    প্রতিটি ইউজার রোলের বিপরীতে ফিচার ব্যবহারের স্বাধীনতা ও অনুমোদন স্তর নিয়ন্ত্রণ করুন
                  </p>
                </div>

                {/* Category filters */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: 'all', label: 'সকল পারমিশন' },
                    { id: 'blood', label: '🩸 রক্তদান' },
                    { id: 'directory', label: '🏥 ডিরেক্টরি' },
                    { id: 'funds', label: '💳 তহবিল' },
                    { id: 'system', label: '⚙️ সিস্টেম' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setMatrixCategoryFilter(cat.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        matrixCategoryFilter === cat.id
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Matrix Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-y border-slate-200 text-slate-700">
                    <tr>
                      <th className="py-3 px-3 font-bold min-w-[240px]">ফিচার ও পারমিশন বিবরণী</th>
                      <th className="py-3 px-2 font-bold text-center">
                        <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 font-black">
                          সুপার এডমিন
                        </span>
                      </th>
                      <th className="py-3 px-2 font-bold text-center">
                        <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-900 font-bold">
                          এডমিন
                        </span>
                      </th>
                      <th className="py-3 px-2 font-bold text-center">
                        <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 font-bold">
                          মডারেটর
                        </span>
                      </th>
                      <th className="py-3 px-2 font-bold text-center">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-bold">
                          স্বেচ্ছাসেবক
                        </span>
                      </th>
                      <th className="py-3 px-2 font-bold text-center">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-medium">
                          রক্তদাতা
                        </span>
                      </th>
                      <th className="py-3 px-2 font-bold text-center">
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-medium">
                          রক্ত গ্রহীতা
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {PERMISSION_DEFINITIONS
                      .filter((p) => matrixCategoryFilter === 'all' || p.category === matrixCategoryFilter)
                      .map((perm) => {
                        const otherRoles: UserRole[] = ['admin', 'moderator', 'volunteer', 'donor', 'recipient'];
                        return (
                          <tr key={perm.key} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${
                                  perm.category === 'blood'
                                    ? 'bg-red-500'
                                    : perm.category === 'directory'
                                    ? 'bg-blue-500'
                                    : perm.category === 'funds'
                                    ? 'bg-emerald-500'
                                    : 'bg-purple-500'
                                }`} />
                                {perm.labelBn}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                {perm.descriptionBn}
                              </div>
                            </td>

                            {/* super_admin: locked full access */}
                            <td className="py-3 px-2 text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 text-purple-700 font-bold text-[10px] border border-purple-200">
                                <Lock className="w-3 h-3 text-purple-600" />
                                পূর্ণ কর্তৃত্ব
                              </span>
                            </td>

                            {/* other roles: interactive toggle */}
                            {otherRoles.map((r) => {
                              const allowed = Boolean(permissionMatrix[r]?.[perm.key]);
                              return (
                                <td key={r} className="py-3 px-2 text-center">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await updateRolePermission(r, perm.key, !allowed);
                                      dialog.alert({
                                        title: 'পারমিশন আপডেট সম্পন্ন',
                                        message: `"${r}" রোলে "${perm.labelBn}" পারমিশন ${!allowed ? 'অনুমোদন (সক্রিয়)' : 'প্রত্যাহার (নিষ্ক্রিয়)'} করা হয়েছে।`,
                                        theme: !allowed ? 'success' : 'warning',
                                      });
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                                      allowed
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-2xs'
                                        : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-600'
                                    }`}
                                    title={`ক্লিক করে ${r} রোলের জন্য এই পারমিশন পরিবর্তন করুন`}
                                  >
                                    {allowed ? '✓ সক্রিয়' : '✕ নিষ্ক্রিয়'}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* Role Scope Guideline Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 space-y-1">
                  <span className="font-bold text-purple-900 text-xs block">সুপার এডমিন (Root SuperAdmin):</span>
                  <p className="text-[11px] text-purple-700 leading-relaxed">
                    সিস্টেমের সকল ডেটা, রোল পারমিশন ম্যাট্রিক্স, আর্থিক তহবিল, ডাটাবেজ ব্যাকআপ ও প্ল্যাটফর্ম সেটিংস পরিবর্তনের সর্বোচ্চ একক ক্ষমতা।
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 space-y-1">
                  <span className="font-bold text-blue-900 text-xs block">এডমিন ও চ্যাপ্টার মডারেটর:</span>
                  <p className="text-[11px] text-blue-700 leading-relaxed">
                    ধামরাই, সাভার ও মানিকগঞ্জ চ্যাপ্টারের রক্তদাতা ভেরিফিকেশন, আবেদন অনুমোদন, হাসপাতাল ডিরেক্টরি এবং অনুদান ট্র্যাকিং।
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-1">
                  <span className="font-bold text-emerald-900 text-xs block">স্বেচ্ছাসেবক ও সাধারণ সদস্য:</span>
                  <p className="text-[11px] text-emerald-700 leading-relaxed">
                    জরুরি রক্তের আবেদন প্রচার, ডোনারদের সাথে যোগাযোগ, রক্তদান রেকর্ড সম্পন্নকরণ এবং রোগীদের তাৎক্ষণিক সহযোগিতা প্রদান।
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: BACKUP & RESTORE */}
      {activeTab === 'backup' && (
        <div className="space-y-6 max-w-4xl">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-slate-900">
              <Database className="w-5 h-5 text-red-600" />
              <h3 className="font-bold text-base">সম্পূর্ণ ডাটাবেজ ব্যাকআপ ও রিস্টোর (JSON Engine)</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              প্ল্যাটফর্মের ডোনার তালিকা, রক্তের আবেদন, রক্তদান হিসাব, হাসপাতাল ডিরেক্টরি, আর্থিক অনুদান এবং অডিট হিস্টোরির সম্পূর্ণ ডেটা এক ক্লিকে অফলাইনে সংরক্ষণ করুন অথবা রিস্টোর করুন।
            </p>

            {backupRestoreMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                {backupRestoreMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Backup Export */}
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span>ডাটাবেজ এক্সপোর্ট (Download)</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    সিস্টেমের বর্তমান সকল ডেটা একত্রিত করে একটি নিরাপদ `.json` ফাইল ডাউনলোড করুন।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    exportBackupData();
                    dialog.alert({
                      title: 'ব্যাকআপ ডাউনলোড সম্পন্ন',
                      message: 'সম্পূর্ণ ডাটাবেজের ব্যাকআপ JSON ফাইল ডাউনলোড করা হয়েছে। এটি নিরাপদে সংরক্ষণ করুন।',
                      theme: 'success',
                    });
                  }}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>ব্যাকআপ ডাউনলোড করুন (JSON)</span>
                </button>
              </div>

              {/* Backup Restore */}
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span>ব্যাকআপ রিস্টোর (Import)</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    পূর্বে ডাউনলোড করা `.json` ফাইল আপলোড করে সম্পূর্ণ সিস্টেমের তথ্য পুনরুদ্ধার করুন।
                  </p>
                </div>
                <label className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors">
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>ব্যাকআপ ফাইল আপলোড করুন</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const content = event.target?.result as string;
                        if (content) {
                          const result = importBackupData(content);
                          if (result.success) {
                            setBackupRestoreMsg(result.message);
                            dialog.alert({
                              title: 'রিস্টোর সফল হয়েছে',
                              message: result.message,
                              theme: 'success',
                            });
                          } else {
                            dialog.alert({
                              title: 'রিস্টোর ব্যর্থ হয়েছে',
                              message: result.message,
                              theme: 'danger',
                            });
                          }
                        }
                      };
                      reader.readAsText(file);
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              নিরাপত্তা ও অডিট ট্রেইল (Security Audit Logs)
            </h2>
            <span className="text-xs text-slate-400">সর্বশেষ ১০০টি গুরুত্বপূর্ণ ইভেন্ট</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 border-y border-slate-200 text-slate-600">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">টাইমস্ট্যাম্প</th>
                  <th className="py-2.5 px-3 font-semibold">ব্যবহারকারী / রোল</th>
                  <th className="py-2.5 px-3 font-semibold">অ্যাকশন</th>
                  <th className="py-2.5 px-3 font-semibold">টার্গেট</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60">
                    <td className="py-2 px-3 text-slate-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-800">
                      {log.userName} ({log.userRole})
                    </td>
                    <td className="py-2 px-3 text-red-700 font-bold">{log.action}</td>
                    <td className="py-2 px-3 text-slate-600">
                      {log.targetType} [{log.targetId}]
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: ADVANCED SYSTEM & PLATFORM SETTINGS */}
      {activeTab === 'settings' && (
        <div className="space-y-6 max-w-4xl">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Settings className="w-5 h-5 text-red-600" />
                  প্ল্যাটফর্ম, হেডার ও ফুটার ডায়নামিক সেটিংস (Admin Settings)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  হেডার টেক্সট, ফুটার টেক্সট, কভারেজ এলাকা, নোটিশ ব্যানার, পেমেন্ট মেথড ও সিস্টেম কনফিগারেশন নিয়ন্ত্রণ করুন
                </p>
              </div>

              {settingsSavedNotice && (
                <div className="px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200 animate-pulse">
                  ✓ সকল সেটিংস সফলভাবে আপডেট হয়েছে!
                </div>
              )}
            </div>

            {/* Sub-navigation tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-100">
              {[
                { id: 'header', label: 'হেডার ও ব্যানার', icon: Sparkles },
                { id: 'footer', label: 'ফুটার ও কভারেজ এলাকা', icon: Building2 },
                { id: 'contact', label: 'জরুরি যোগাযোগ ও সোশ্যাল', icon: Phone },
                { id: 'quick', label: 'পেমেন্ট ও সিস্টেম শর্টকাট', icon: CreditCard },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSettingsActiveSubtab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      settingsActiveSubtab === tab.id
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-6 pt-2">
              {/* SUBTAB 1: HEADER & BANNER */}
              {settingsActiveSubtab === 'header' && (
                <div className="space-y-4 text-xs">
                  <div className="bg-red-50/60 p-3.5 rounded-xl border border-red-100 text-slate-700 text-xs flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-red-900 block">হেডার টেক্সট ও নোটিশ ব্যানার নিয়ন্ত্রণ:</span>
                      এখান থেকে পরিবর্তন করলে ওয়েবসাইটের একদম উপরের জরুরি নোটিশ ব্যানার, লোগোর পাশের নাম ও সাবটাইটেল তাৎক্ষণিকভাবে আপডেট হবে।
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        প্ল্যাটফর্মের নাম (Brand Name) *
                      </label>
                      <input
                        type="text"
                        required
                        value={settingsName}
                        onChange={(e) => setSettingsName(e.target.value)}
                        placeholder="যেমন: রক্তবন্ধন (RoktoBondon)"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        সংগঠনের পূর্ণ নাম (বাংলা)
                      </label>
                      <input
                        type="text"
                        value={settingsNameBn}
                        onChange={(e) => setSettingsNameBn(e.target.value)}
                        placeholder="যেমন: রক্তবন্ধন রক্তদান সংগঠন"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        হেডার সাব-টাইটেল / এলাকা ট্যাগ *
                      </label>
                      <input
                        type="text"
                        required
                        value={settingsHeaderSubtitle}
                        onChange={(e) => setSettingsHeaderSubtitle(e.target.value)}
                        placeholder="যেমন: ধামরাই • সাভার • মানিকগঞ্জ"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none font-semibold text-red-700"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">হেডারে লোগোর নামের নিচে প্রদর্শিত হবে</span>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        মূল স্লোগান (Main Slogan)
                      </label>
                      <input
                        type="text"
                        value={settingsSlogan}
                        onChange={(e) => setSettingsSlogan(e.target.value)}
                        placeholder="যেমন: রক্তের বন্ধনে বাঁচুক প্রতিটি প্রাণ..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Announcement Banner */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span className="font-bold text-slate-900 text-xs">হেডারের উপরে জরুরি নোটিশ ব্যানার</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settingsShowAnnouncement}
                          onChange={(e) => setSettingsShowAnnouncement(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                        <span className="ml-2 text-xs font-semibold text-slate-700">
                          {settingsShowAnnouncement ? 'সক্রিয় (Visible)' : 'লুকানো (Hidden)'}
                        </span>
                      </label>
                    </div>

                    {settingsShowAnnouncement && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <div className="sm:col-span-2">
                          <label className="block font-semibold text-slate-700 mb-1">
                            ব্যানার নোটিশ মেসেজ
                          </label>
                          <input
                            type="text"
                            value={settingsAnnouncementText}
                            onChange={(e) => setSettingsAnnouncementText(e.target.value)}
                            placeholder="যেমন: জরুরি রক্তের প্রয়োজনে ২৪ ঘণ্টা হটলাইনে যোগাযোগ করুন..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            বিস্তারিত বাটন লিংক
                          </label>
                          <input
                            type="text"
                            value={settingsAnnouncementLink}
                            onChange={(e) => setSettingsAnnouncementLink(e.target.value)}
                            placeholder="/request-blood অথবা /donate"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUBTAB 2: FOOTER & COVERAGE AREAS */}
              {settingsActiveSubtab === 'footer' && (
                <div className="space-y-4 text-xs">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-slate-700 text-xs flex items-start gap-2">
                    <Building2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-900 block">ফুটার টেক্সট ও কভারেজ এলাকা কনফিগারেশন:</span>
                      এখান থেকে ওয়েবসাইটের ফুটারের পরিচিতি প্যারাগ্রাফ, সিকিউরিটি ব্যাজ টেক্সট, কার্যক্রমের আওতাভুক্ত এলাকা এবং কপিরাইট মেসেজ পরিবর্তন করুন।
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      ফুটার পরিচিতি ও মিশন বিবরণী (About Mission Text) *
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={settingsFooterAbout}
                      onChange={(e) => setSettingsFooterAbout(e.target.value)}
                      placeholder="ধামরাই, সাভার ও মানিকগঞ্জে জরুরি রক্তের প্রয়োজনে নিঃস্বার্থ রক্তদাতাদের..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        সিকিউরিটি ব্যাজ টেক্সট
                      </label>
                      <input
                        type="text"
                        value={settingsFooterSecurity}
                        onChange={(e) => setSettingsFooterSecurity(e.target.value)}
                        placeholder="যেমন: নিরাপদ ও প্রাইভেসি-সুরক্ষিত ডোনার ডেটাবেজ"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        নিচের মানবিক ট্যাগলাইন
                      </label>
                      <input
                        type="text"
                        value={settingsFooterTagline}
                        onChange={(e) => setSettingsFooterTagline(e.target.value)}
                        placeholder="যেমন: ধামরাই, সাভার ও মানিকগঞ্জ"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        কপিরাইট সমাপ্তি টেক্সট
                      </label>
                      <input
                        type="text"
                        value={settingsFooterCopyright}
                        onChange={(e) => setSettingsFooterCopyright(e.target.value)}
                        placeholder="যেমন: সর্বস্বত্ব সংরক্ষিত।"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Coverage Areas 1 & 2 */}
                  <div className="pt-2 border-t border-slate-200/80 space-y-3">
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-red-600" />
                      ফুটারের আওতাভুক্ত শাখা ও এলাকাসমূহ (Coverage Areas)
                    </h4>

                    {/* Area 1 */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                      <span className="font-bold text-slate-700 text-[11px] block">শাখা ১ (ঢাকা জোন):</span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <input
                            type="text"
                            value={settingsCoverage1Title}
                            onChange={(e) => setSettingsCoverage1Title(e.target.value)}
                            placeholder="যেমন: ধামরাই ও সাভার শাখা (ঢাকা)"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            value={settingsCoverage1Details}
                            onChange={(e) => setSettingsCoverage1Details(e.target.value)}
                            placeholder="যেমন: ধামরাই সদর, কালামপুর, কুশুরা, বালিয়া, সাভার বাজার, আশুলিয়া"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Area 2 */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                      <span className="font-bold text-slate-700 text-[11px] block">শাখা ২ (মানিকগঞ্জ জোন):</span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <input
                            type="text"
                            value={settingsCoverage2Title}
                            onChange={(e) => setSettingsCoverage2Title(e.target.value)}
                            placeholder="যেমন: মানিকগঞ্জ জেলা শাখা"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            value={settingsCoverage2Details}
                            onChange={(e) => setSettingsCoverage2Details(e.target.value)}
                            placeholder="যেমন: মানিকগঞ্জ সদর, সিংগাইর, সাটুরিয়া, শিবালয়, হরিরামপুর"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 3: CONTACT & SOCIAL */}
              {settingsActiveSubtab === 'contact' && (
                <div className="space-y-4 text-xs">
                  <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100 text-slate-700 text-xs flex items-start gap-2">
                    <Phone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-emerald-900 block">জরুরি যোগাযোগ ও সোশ্যাল মিডিয়া সেটিংস:</span>
                      ২৪ ঘণ্টার জরুরি হটলাইন, প্রাতিষ্ঠানিক ইমেইল এবং অফিস ঠিকানার পরিবর্তন সরাসরি ওয়েবসাইটের হেডার, ফুটার এবং জরুরি কল বাটনে প্রতিফলিত হবে।
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        ২৪/৭ জরুরি হটলাইন (Emergency Hotline) *
                      </label>
                      <input
                        type="text"
                        required
                        value={settingsHotline}
                        onChange={(e) => setSettingsHotline(e.target.value)}
                        placeholder="+8801712-345678"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none font-mono font-bold text-red-700"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        অফিসিয়াল ইমেইল (Helpdesk Email) *
                      </label>
                      <input
                        type="email"
                        required
                        value={settingsEmail}
                        onChange={(e) => setSettingsEmail(e.target.value)}
                        placeholder="help@roktobondon.org"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        কেন্দ্রীয় কার্যালয়ের ঠিকানা
                      </label>
                      <input
                        type="text"
                        value={settingsAddress}
                        onChange={(e) => setSettingsAddress(e.target.value)}
                        placeholder="ধামরাই ও সাভার কেন্দ্রীয় কার্যালয়, ঢাকা"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        অফিসিয়াল ফেসবুক পেজ / গ্রুপ ইউআরএল
                      </label>
                      <input
                        type="url"
                        value={settingsFacebook}
                        onChange={(e) => setSettingsFacebook(e.target.value)}
                        placeholder="https://facebook.com/roktobondon"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 4: QUICK SHORTCUTS & PAYMENT METHODS */}
              {settingsActiveSubtab === 'quick' && (
                <div className="space-y-4 text-xs">
                  <div className="bg-purple-50/60 p-3.5 rounded-xl border border-purple-100 text-slate-700 text-xs flex items-start gap-2">
                    <CreditCard className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-purple-900 block">পেমেন্ট মেথড ও আর্থিক অনুদান সরাসরি ব্যবস্থাপনা:</span>
                      বিকাশ, নগদ, রকেট, ব্যাংক অ্যাকাউন্ট সেটিংস পরিবর্তন করতে বা নতুন পেমেন্ট মেথড যুক্ত করতে নিচের শর্টকাটগুলো ব্যবহার করুন।
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                      <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                        <CreditCard className="w-4 h-4 text-red-600" />
                        পেমেন্ট মেথড কনফিগারেশন
                      </h4>
                      <p className="text-slate-500 text-[11px]">
                        বর্তমান সক্রিয় মেথড: {paymentMethods.filter((m) => m.isActive).length} টি (বিকাশ, নগদ, রকেট, ইত্যাদি)
                      </p>
                      <div className="pt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPaymentForEdit(null);
                            setShowPaymentModal(true);
                          }}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs"
                        >
                          + নতুন মেথড যুক্ত করুন
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('funds')}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
                        >
                          তহবিল তালিকা দেখুন
                        </button>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                      <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                        <Database className="w-4 h-4 text-emerald-600" />
                        ডাটা ব্যাকআপ ও নিরাপত্তা
                      </h4>
                      <p className="text-slate-500 text-[11px]">
                        সম্পূর্ণ প্ল্যাটফর্ম কনফিগারেশন ও ডাটাবেজ এক ক্লিকে JSON ফাইলে ডাউনলোড ও রিস্টোর করুন।
                      </p>
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab('backup')}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          ডাটা ব্যাকআপ ট্যাবে যান
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
                <div className="text-[11px] text-slate-500">
                  পরিবর্তনগুলো সাথে সাথে অ্যাপ্লিকেশনের লাইভ সাইটে প্রযোজ্য হবে।
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="submit"
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-xs transition-colors border border-red-700/60 text-xs flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>সেটিংস সংরক্ষণ করুন (Save All Settings)</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Donation Modal */}
      {showAddDonationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">
              নতুন রক্তদান রেকর্ড লিপিবদ্ধ করুন
            </h3>

            <form onSubmit={handleCreateDonation} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ডোনার আইডি (Donor ID) *
                </label>
                <input
                  type="text"
                  required
                  value={donationDonorId}
                  onChange={(e) => setDonationDonorId(e.target.value)}
                  placeholder="যেমন: DNR-DHM-001001"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  হাসপাতাল *
                </label>
                <input
                  type="text"
                  required
                  value={donationHospital}
                  onChange={(e) => setDonationHospital(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    তারিখ *
                  </label>
                  <input
                    type="date"
                    required
                    value={donationDate}
                    onChange={(e) => setDonationDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    পরিমাণ (ব্যাগ) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="4"
                    value={donationUnits}
                    onChange={(e) => setDonationUnits(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddDonationModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors border border-red-700/60"
                >
                  রেকর্ড সংরক্ষণ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Branch Modal */}
      {showAddBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">
              নতুন শাখা / চ্যাপ্টার যুক্ত করুন
            </h3>

            <form onSubmit={handleCreateBranch} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  শাখার নাম (বাংলায়) *
                </label>
                <input
                  type="text"
                  required
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="যেমন: সাটুরিয়া উপজেলা শাখা"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    জেলা *
                  </label>
                  <select
                    value={newBranchDistrict}
                    onChange={(e) => setNewBranchDistrict(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50"
                  >
                    <option value="Dhaka">Dhaka</option>
                    <option value="Manikganj">Manikganj</option>
                    <option value="Gazipur">Gazipur</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    উপজেলা *
                  </label>
                  <input
                    type="text"
                    required
                    value={newBranchUpazila}
                    onChange={(e) => setNewBranchUpazila(e.target.value)}
                    placeholder="যেমন: Saturia"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  সমন্বয়কের নাম
                </label>
                <input
                  type="text"
                  value={newBranchCoordinator}
                  onChange={(e) => setNewBranchCoordinator(e.target.value)}
                  placeholder="সমন্বয়কের নাম"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  মোবাইল নম্বর
                </label>
                <input
                  type="tel"
                  value={newBranchPhone}
                  onChange={(e) => setNewBranchPhone(e.target.value)}
                  placeholder="+88017..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddBranchModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors border border-red-700/60"
                >
                  শাখা তৈরি করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hospital Form Modal */}
      <HospitalFormModal
        isOpen={showHospitalModal}
        onClose={() => {
          setShowHospitalModal(false);
          setSelectedHospitalForEdit(null);
        }}
        hospitalToEdit={selectedHospitalForEdit}
        onSave={async (data) => {
          if (selectedHospitalForEdit) {
            await updateHospital(selectedHospitalForEdit.id, data);
            dialog.alert({
              title: 'তথ্য আপডেট সফল',
              message: `"${data.nameBn}" তথ্য সফলভাবে হালনাগাদ করা হয়েছে।`,
              theme: 'success',
            });
          } else {
            await addHospital(data);
            dialog.alert({
              title: 'হাসপাতাল যোগ হয়েছে',
              message: `"${data.nameBn}" সফলভাবে হাসপাতাল ডিরেক্টরিতে যুক্ত করা হয়েছে।`,
              theme: 'success',
            });
          }
        }}
      />

      {/* Add Disbursement / Expense Modal */}
      {showAddDisbModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-red-600" />
                নতুন রোগী সহায়তা / খরচ ভাউচার এন্ট্রি
              </h3>
              <button
                type="button"
                onClick={() => setShowAddDisbModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDisbursement} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ব্যয়ের শিরোনাম / কারণ *
                </label>
                <input
                  type="text"
                  required
                  value={disbTitle}
                  onChange={(e) => setDisbTitle(e.target.value)}
                  placeholder="যেমন: রোগীর ও-নেগেটিভ রক্ত সংগ্রহ ও টেস্ট খরচ"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    টাকার পরিমাণ (৳) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={disbAmount}
                    onChange={(e) => setDisbAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    অনুদান খাত / তহবিল *
                  </label>
                  <select
                    value={disbCause}
                    onChange={(e) => setDisbCause(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-medium outline-none"
                  >
                    {donationCauses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameBn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    উপকারভোগী / রোগী / গ্রহীতা *
                  </label>
                  <input
                    type="text"
                    required
                    value={disbRecipient}
                    onChange={(e) => setDisbRecipient(e.target.value)}
                    placeholder="রোগীর নাম বা প্রতিনিধি"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    এলাকা / উপজেলা *
                  </label>
                  <select
                    value={disbArea}
                    onChange={(e) => setDisbArea(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-medium outline-none"
                  >
                    <option value="ধামরাই">ধামরাই</option>
                    <option value="কালামপুর">কালামপুর</option>
                    <option value="সাভার">সাভার</option>
                    <option value="সাটুরিয়া">সাটুরিয়া</option>
                    <option value="মানিকগঞ্জ">মানিকগঞ্জ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  মন্তব্য বা ভাউচার বিবরণী (ঐচ্ছিক)
                </label>
                <textarea
                  rows={2}
                  value={disbNotes}
                  onChange={(e) => setDisbNotes(e.target.value)}
                  placeholder="হাসপাতালের নাম, বেড নম্বর বা ভাউচার বিস্তারিত..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddDisbModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors shadow-xs"
                >
                  ভাউচার সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Method Config Modal */}
      <PaymentMethodModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedPaymentForEdit(null);
        }}
        methodToEdit={selectedPaymentForEdit}
        onSave={async (data) => {
          if (selectedPaymentForEdit) {
            await updatePaymentMethod(selectedPaymentForEdit.id, data);
            dialog.alert({
              title: 'আপডেট সফল',
              message: `"${data.nameBn}" পেমেন্ট মেথড আপডেট করা হয়েছে।`,
              theme: 'success',
            });
          } else {
            await addPaymentMethod(data);
            dialog.alert({
              title: 'যুক্ত হয়েছে',
              message: `"${data.nameBn}" নতুন পেমেন্ট মেথড সফলভাবে যোগ করা হয়েছে।`,
              theme: 'success',
            });
          }
        }}
      />

      {/* User Form Modal */}
      <UserFormModal
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setSelectedUserForEdit(null);
        }}
        userToEdit={selectedUserForEdit}
        onSave={async (data) => {
          if (selectedUserForEdit) {
            await updateUser(selectedUserForEdit.id, data);
            dialog.alert({
              title: 'ব্যবহারকারী আপডেট',
              message: `"${data.fullName}" এর তথ্য সফলভাবে হালনাগাদ করা হয়েছে।`,
              theme: 'success',
            });
          } else {
            await addUser(data);
            dialog.alert({
              title: 'নতুন টিম মেম্বার যুক্ত',
              message: `"${data.fullName}" সফলভাবে প্ল্যাটফর্মে যুক্ত করা হয়েছে।`,
              theme: 'success',
            });
          }
        }}
      />
    </div>
  );
};
