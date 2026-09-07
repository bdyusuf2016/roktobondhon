import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Shield,
  Phone,
  Mail,
  LogOut,
  Droplets,
  Heart,
  Calendar,
  CheckCircle2,
  Clock,
  Settings,
  Edit3,
  KeyRound,
  X,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  MapPin,
  Sparkles,
  Award,
  CreditCard,
  Download,
  Share2,
  Copy,
  Check,
  Activity,
  Flame,
  UserCheck,
  HelpCircle,
  FileText,
  ShieldAlert,
  ShieldCheck,
  ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useOrgConfig } from '../contexts/OrgConfigContext';
import { INITIAL_LOCATIONS } from '../services/locationService';
import type { BloodGroup, Gender } from '../types';

const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, logout, updateCurrentUser, changePassword } = useAuth();
  const { donors, bloodRequests, donations, updateDonor, registerDonor } = useData();
  const { config } = useOrgConfig();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'health' | 'donations' | 'requests' | 'security'>('overview');

  // Modals state
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showDonorCardModal, setShowDonorCardModal] = useState(false);

  // Edit Profile Form State
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [editGender, setEditGender] = useState<'male' | 'female' | 'other'>('male');
  const [editDateOfBirth, setEditDateOfBirth] = useState('');
  const [editWeight, setEditWeight] = useState<number | ''>('');
  const [editBloodGroup, setEditBloodGroup] = useState<BloodGroup>('A+');
  const [editDistrict, setEditDistrict] = useState('Dhaka');
  const [editUpazila, setEditUpazila] = useState('Dhamrai (ধামরাই)');
  const [editArea, setEditArea] = useState('');
  const [editExactAddress, setEditExactAddress] = useState('');
  const [editEmergencyContact, setEditEmergencyContact] = useState('');
  const [editLastDonationDate, setEditLastDonationDate] = useState('');
  const [editAvailability, setEditAvailability] = useState(true);
  const [editShowPhone, setEditShowPhone] = useState(true);
  const [editAllowDirectContact, setEditAllowDirectContact] = useState(true);

  // Dynamic Upazilas and Unions for current selected district
  const currentUpazilas = useMemo(() => {
    const list = INITIAL_LOCATIONS.filter((l) => l.district === editDistrict).map((l) => l.upazila);
    return list.length > 0 ? list : ['Dhamrai (ধামরাই)', 'Savar (সাভার)'];
  }, [editDistrict]);

  const currentUnions = useMemo(() => {
    const matched = INITIAL_LOCATIONS.find(
      (l) => l.district === editDistrict && l.upazila === editUpazila
    );
    return matched?.unions || [];
  }, [editDistrict, editUpazila]);

  // Change Password Form State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
          <UserIcon className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          প্রোফাইল দেখতে প্রথমে লগইন করুন
        </h2>
        <p className="text-xs text-slate-500">
          রক্তদাতা প্রোফাইল ব্যবস্থাপনা এবং স্বাস্থ্য তথ্য দেখতে লগইন আবশ্যক
        </p>
        <Link
          to="/login"
          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold inline-block border border-red-700/60 shadow-xs"
        >
          লগইন পাতায় যান
        </Link>
      </div>
    );
  }

  // Find linked donor record if any
  const myDonor = donors.find((d) => d.userId === currentUser.id || d.phone === currentUser.phone);
  // User's blood requests
  const myRequests = bloodRequests.filter((r) => r.userId === currentUser.id);
  // User's donations
  const myDonations = donations.filter(
    (d) => d.donorUserId === currentUser.id || (myDonor && d.donorId === myDonor.donorId)
  );

  // Donor Badge & Level Calculation
  const totalDonations = myDonor?.totalDonations || myDonations.length || 0;
  const donorTier = useMemo(() => {
    if (totalDonations >= 10) return { name: 'প্লাটিনাম লাইফ সেভার', color: 'bg-purple-100 text-purple-800 border-purple-300', icon: '🏆' };
    if (totalDonations >= 6) return { name: 'গোল্ড রক্তদাতা', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: '🥇' };
    if (totalDonations >= 3) return { name: 'সিলভার রক্তদাতা', color: 'bg-slate-200 text-slate-800 border-slate-300', icon: '🥈' };
    if (totalDonations >= 1) return { name: 'ব্রোঞ্জ রক্তদাতা', color: 'bg-amber-50 text-amber-900 border-amber-200', icon: '🥉' };
    return { name: 'নবীন রক্তদাতা', color: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: '🌱' };
  }, [totalDonations]);

  // Next Eligibility calculation (90 days interval)
  const eligibility = useMemo(() => {
    if (!myDonor?.lastDonationDate) {
      return { eligible: true, text: 'বর্তমানে রক্তদানে প্রস্তুত', daysLeft: 0, nextDate: 'যেকোনো সময়' };
    }
    const lastDate = new Date(myDonor.lastDonationDate);
    const nextDate = new Date(lastDate.getTime() + 90 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffTime = nextDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysLeft <= 0) {
      return { eligible: true, text: 'বর্তমানে রক্তদানে প্রস্তুত', daysLeft: 0, nextDate: nextDate.toISOString().split('T')[0] };
    }
    return {
      eligible: false,
      text: `${daysLeft} দিন পর পরবর্তী রক্তদান করতে পারবেন`,
      daysLeft,
      nextDate: nextDate.toISOString().split('T')[0],
    };
  }, [myDonor?.lastDonationDate]);

  const handleCopyDonorId = () => {
    if (myDonor?.donorId) {
      navigator.clipboard.writeText(myDonor.donorId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleOpenEditProfile = () => {
    setEditFullName(currentUser.fullName || '');
    setEditPhone(currentUser.phone || '');
    setEditEmail(currentUser.email || '');
    setEditPhotoUrl(currentUser.photoUrl || myDonor?.photoUrl || '');
    setEditBloodGroup(myDonor?.bloodGroup || 'A+');
    setEditGender(myDonor?.gender || 'male');
    setEditDateOfBirth(myDonor?.dateOfBirth || '');
    setEditWeight(myDonor?.weight || '');
    setEditDistrict(myDonor?.district || 'Dhaka');
    setEditUpazila(myDonor?.upazila || 'Dhamrai (ধামরাই)');
    setEditArea(myDonor?.area || '');
    setEditExactAddress(myDonor?.exactAddress || '');
    setEditEmergencyContact(myDonor?.emergencyContact || '');
    setEditLastDonationDate(myDonor?.lastDonationDate || '');
    setEditAvailability(myDonor?.availability ?? true);
    setEditShowPhone(myDonor?.privacy?.showPhone ?? true);
    setEditAllowDirectContact(myDonor?.privacy?.allowDirectContact ?? true);
    setShowEditProfileModal(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFullName.trim()) {
      setToastMessage({ type: 'error', text: 'অনুগ্রহ করে সম্পূর্ণ নাম লিখুন।' });
      return;
    }
    if (!editPhone.trim()) {
      setToastMessage({ type: 'error', text: 'অনুগ্রহ করে মোবাইল নম্বর লিখুন।' });
      return;
    }
    setIsSubmitting(true);
    try {
      // 1. Update Core User Profile
      await updateCurrentUser({
        fullName: editFullName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim() || undefined,
        photoUrl: editPhotoUrl.trim() || undefined,
      });

      // 2. If registered donor exists, update full donor profile
      if (myDonor) {
        await updateDonor(myDonor.id, {
          fullName: editFullName.trim(),
          phone: editPhone.trim(),
          email: editEmail.trim() || undefined,
          photoUrl: editPhotoUrl.trim() || undefined,
          gender: editGender,
          dateOfBirth: editDateOfBirth || undefined,
          weight: editWeight ? Number(editWeight) : undefined,
          bloodGroup: editBloodGroup,
          district: editDistrict,
          upazila: editUpazila,
          area: editArea.trim() || editUpazila,
          exactAddress: editExactAddress.trim() || undefined,
          emergencyContact: editEmergencyContact.trim() || undefined,
          lastDonationDate: editLastDonationDate || undefined,
          availability: editAvailability,
          privacy: {
            ...myDonor.privacy,
            showPhone: editShowPhone,
            allowDirectContact: editAllowDirectContact,
          },
        });
      } else {
        // 3. If no donor record yet, register user into donor directory
        await registerDonor({
          userId: currentUser.id,
          organizationId: currentUser.organizationId || 'org-roktobondon',
          branchId: currentUser.branchId || 'br-dhm',
          fullName: editFullName.trim(),
          phone: editPhone.trim(),
          email: editEmail.trim() || undefined,
          photoUrl: editPhotoUrl.trim() || undefined,
          bloodGroup: editBloodGroup,
          division: 'Dhaka',
          districtId: `dist-${editDistrict.toLowerCase()}`,
          district: editDistrict,
          upazilaId: `upa-${editUpazila.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          upazila: editUpazila,
          areaId: `area-${Date.now()}`,
          area: editArea.trim() || editUpazila,
          gender: editGender,
          dateOfBirth: editDateOfBirth || undefined,
          weight: editWeight ? Number(editWeight) : undefined,
          exactAddress: editExactAddress.trim() || undefined,
          emergencyContact: editEmergencyContact.trim() || undefined,
          lastDonationDate: editLastDonationDate || undefined,
          availability: editAvailability,
          emergencyAvailable: true,
          privacy: {
            showPhone: editShowPhone,
            showGender: true,
            showAge: true,
            allowDirectContact: editAllowDirectContact,
          },
        });
      }

      setShowEditProfileModal(false);
      setToastMessage({ type: 'success', text: 'প্রোফাইল তথ্য সফলভাবে সম্পূর্ণ আপডেট হয়েছে!' });
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err?.message || 'প্রোফাইল আপডেট করতে সমস্যা হয়েছে।' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setToastMessage({ type: 'error', text: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setToastMessage({ type: 'error', text: 'নতুন পাসওয়ার্ড ও কনফার্ম পাসওয়ার্ড মিলছে না।' });
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword(newPassword);
      setShowChangePasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
      setToastMessage({ type: 'success', text: 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!' });
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err?.message || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে।' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAvailability = async () => {
    if (!myDonor) return;
    await updateDonor(myDonor.id, { availability: !myDonor.availability });
  };

  const handleToggleEmergency = async () => {
    if (!myDonor) return;
    await updateDonor(myDonor.id, { emergencyAvailable: !myDonor.emergencyAvailable });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold transition-all shadow-sm ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PROFESSIONAL HERO IDENTITY CARD */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-red-600 via-rose-600 to-red-800 relative">
          <div className="absolute right-4 top-4 flex items-center gap-2">
            <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-[11px] font-bold rounded-full border border-white/30">
              {config.nameBn || config.name} মেম্বারশিপ
            </span>
          </div>
        </div>

        <div className="px-6 pb-6 pt-0 relative flex flex-col md:flex-row md:items-end justify-between gap-4 -mt-10">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-white p-1 shadow-md border border-slate-200">
                <div className="w-full h-full rounded-xl bg-gradient-to-br from-red-500 to-red-700 text-white font-black text-2xl flex items-center justify-center shadow-inner">
                  {myDonor?.bloodGroup ? (
                    <span className="font-mono text-xl">{myDonor.bloodGroup}</span>
                  ) : (
                    currentUser.fullName.slice(0, 1)
                  )}
                </div>
              </div>
              {myDonor && (
                <span className="absolute -bottom-1 -right-1 p-1 bg-emerald-600 text-white rounded-full border-2 border-white shadow-xs" title="ভেরিফাইড রক্তদাতা">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  {currentUser.fullName}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${donorTier.color}`}>
                  <span>{donorTier.icon}</span>
                  <span>{donorTier.name}</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                  {currentUser.role}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1 font-mono font-medium text-slate-700">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {currentUser.phone}
                </span>
                {currentUser.email && (
                  <span className="flex items-center gap-1 text-slate-600">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {currentUser.email}
                  </span>
                )}
                {myDonor && (
                  <button
                    type="button"
                    onClick={handleCopyDonorId}
                    className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-mono text-[11px] cursor-pointer"
                  >
                    <span>ID: {myDonor.donorId}</span>
                    {copiedId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
            <button
              type="button"
              onClick={handleOpenEditProfile}
              className="px-3.5 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl border border-red-700/80 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5" />
              প্রোফাইল এডিট
            </button>

            {myDonor && (
              <button
                type="button"
                onClick={() => setShowDonorCardModal(true)}
                className="px-3.5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <CreditCard className="w-3.5 h-3.5 text-red-600" />
                রক্তদাতা কার্ড
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setNewPassword('');
                setConfirmPassword('');
                setShowChangePasswordModal(true);
              }}
              className="px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-600" />
              পাসওয়ার্ড
            </button>

            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="p-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl border border-red-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="লগআউট"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VITAL STATS SUMMARY CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>মোট রক্তদান</span>
            <Droplets className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {totalDonations} <span className="text-xs font-bold text-slate-500 font-sans">বার</span>
          </p>
          <p className="text-[10px] text-emerald-600 font-medium">
            ≈ {totalDonations * 3} জনের জীবন বাঁচিয়েছেন
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>রক্তদানের প্রস্তুতি</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-sm font-bold text-slate-900">
            {eligibility.eligible ? (
              <span className="text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> প্রস্তুত
              </span>
            ) : (
              <span className="text-amber-700 font-mono text-xs">{eligibility.daysLeft} দিন বাকি</span>
            )}
          </p>
          <p className="text-[10px] text-slate-400">
            পরবর্তী তারিখ: {eligibility.nextDate}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>রক্তের আবেদন</span>
            <Heart className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {myRequests.length} <span className="text-xs font-bold text-slate-500 font-sans">টি</span>
          </p>
          <p className="text-[10px] text-slate-400">ব্যক্তিগত অনুরোধ</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>সম্মাননা ব্যাজ</span>
            <Award className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-sm font-black text-slate-900 truncate">
            {donorTier.name}
          </p>
          <p className="text-[10px] text-slate-400">ভেরিফায়েড সদস্য</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* NAVIGATION TABS */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 pb-1 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-red-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          ওভারভিউ ও নিয়ন্ত্রণ
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('health')}
          className={`px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'health'
              ? 'bg-red-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          ব্যক্তিগত ও স্বাস্থ্য তথ্য
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('donations')}
          className={`px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'donations'
              ? 'bg-red-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Droplets className="w-4 h-4" />
          রক্তদানের ইতিহাস ({myDonations.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'requests'
              ? 'bg-red-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Heart className="w-4 h-4" />
          রক্তের আবেদন ({myRequests.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'security'
              ? 'bg-red-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Lock className="w-4 h-4" />
          নিরাপত্তা ও সেটিংস
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & DONOR QUICK CONTROLS */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {myDonor ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                    <Droplets className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900 tracking-tight">
                      রক্তদানের লাইভ স্ট্যাটাস নিয়ন্ত্রণ
                    </h2>
                    <p className="text-xs text-slate-500">
                      রক্তদাতা তালিকায় আপনার বর্তমান প্রাপ্যতা পরিবর্তন করুন
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-red-700 bg-red-50 px-3 py-1 rounded-full border border-red-200">
                  রক্তের গ্রুপ: {myDonor.bloodGroup}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-800">স্বেচ্ছায় রক্তদানের প্রস্তুতি</p>
                    <p className="text-[11px] text-slate-500">
                      {myDonor.availability ? 'বর্তমানে রক্তদানে সম্পূর্ণ প্রস্তুত আছেন' : 'সাময়িকভাবে অনুপলব্ধ'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleAvailability}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      myDonor.availability
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                        : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                    }`}
                  >
                    {myDonor.availability ? 'সক্রিয় (ON)' : 'বন্ধ (OFF)'}
                  </button>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-800">জরুরি সেবা ও নাইট কল (২৪/৭)</p>
                    <p className="text-[11px] text-slate-500">জরুরি রাতেও প্রস্তুত আছেন</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleEmergency}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      myDonor.emergencyAvailable
                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-2xs'
                        : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                    }`}
                  >
                    {myDonor.emergencyAvailable ? 'সক্রিয় (ON)' : 'বন্ধ (OFF)'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-2xl p-6 text-center space-y-3 shadow-xs">
              <Droplets className="w-12 h-12 text-red-600 mx-auto" />
              <h2 className="text-lg font-black text-slate-900">
                আপনি এখনো রক্তদাতা হিসেবে নিবন্ধিত নন
              </h2>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                মাত্র ২ মিনিটে আপনার রক্তদাতা প্রোফাইল তৈরি করুন এবং ধামরাই, সাভার ও মানিকগঞ্জের জরুরি রোগীদের পাশে দাঁড়ান।
              </p>
              <Link
                to="/become-donor"
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold inline-block shadow-xs border border-red-700/60"
              >
                রক্তদাতা হিসেবে নিবন্ধন করুন
              </Link>
            </div>
          )}

          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-red-600" />
                  বর্তমান অবস্থান ও এলাকা
                </h3>
                <button
                  type="button"
                  onClick={handleOpenEditProfile}
                  className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                >
                  পরিবর্তন
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">জেলা:</span>
                  <span className="font-bold text-slate-800">{myDonor?.district || 'ঢাকা (Dhaka)'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">উপজেলা / থানা:</span>
                  <span className="font-bold text-slate-800">{myDonor?.upazila || 'ধামরাই (Dhamrai)'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">গ্রাম / এলাকা:</span>
                  <span className="font-bold text-slate-800">{myDonor?.area || 'ধামরাই সদর'}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  অ্যাকাউন্ট ভেরিফিকেশন ও নিরাপত্তা
                </h3>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  সক্রিয়
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">মোবাইল ভেরিফিকেশন:</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> সম্পন্ন
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">প্রাইভেসি মোড:</span>
                  <span className="font-bold text-slate-800">
                    {myDonor?.privacy?.showPhone ? 'মোবাইল নম্বর পাবলিক' : 'মোবাইল নম্বর গোপন'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">রোল / পদমর্যাদা:</span>
                  <span className="font-bold text-slate-800 uppercase font-mono">{currentUser.role}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: HEALTH & PERSONAL INFORMATION */}
      {/* ========================================================================= */}
      {activeTab === 'health' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-slate-900">ব্যক্তিগত ও স্বাস্থ্য সম্পর্কিত বিস্তারিত তথ্য</h2>
              <p className="text-xs text-slate-500">রক্তদানের যোগ্যতা ও মেডিকেল রেকর্ড নিশ্চিতকরণ</p>
            </div>
            <button
              type="button"
              onClick={handleOpenEditProfile}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              তথ্য সম্পাদনা
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-slate-400 font-medium block">রক্তের গ্রুপ (Blood Group)</span>
              <span className="text-base font-black text-red-700 font-mono">
                {myDonor?.bloodGroup || 'অনির্ধারিত'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-slate-400 font-medium block">লিঙ্গ (Gender)</span>
              <span className="font-bold text-slate-800">
                {myDonor?.gender === 'male' ? 'পুরুষ (Male)' : myDonor?.gender === 'female' ? 'মহিলা (Female)' : 'অন্যান্য'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-slate-400 font-medium block">জন্ম তারিখ (DOB)</span>
              <span className="font-bold text-slate-800">
                {myDonor?.dateOfBirth || 'উল্লেখ নেই'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-slate-400 font-medium block">ওজন (Weight)</span>
              <span className="font-bold text-slate-800">
                {myDonor?.weight ? `${myDonor.weight} কেজি` : 'উল্লেখ নেই'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-slate-400 font-medium block">শেষ রক্তদানের তারিখ</span>
              <span className="font-bold text-slate-800">
                {myDonor?.lastDonationDate || 'এখনো রক্তদান করেননি'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-slate-400 font-medium block">জরুরি যোগাযোগ নম্বর</span>
              <span className="font-bold text-slate-800 font-mono">
                {myDonor?.emergencyContact || 'প্রদান করা হয়নি'}
              </span>
            </div>
          </div>

          <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs space-y-1 text-emerald-900">
            <p className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              রক্তদানের সাধারণ নিয়ম ও যোগ্যতা
            </p>
            <p className="text-emerald-800 text-[11px] leading-relaxed">
              স্বাভাবিক অবস্থায় প্রতি ৩ মাস (৯০ দিন) পর পর একজন সুস্থ মানুষ রক্তদান করতে পারেন। রক্তদানের পূর্বে পর্যাপ্ত পানি পান করুন এবং পুষ্টিকর খাবার গ্রহণ করুন।
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DONATION LOGS & CERTIFICATES */}
      {/* ========================================================================= */}
      {activeTab === 'donations' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                রক্তদানের পূর্ণাঙ্গ ইতিহাস ও প্রশংসাপত্র
              </h2>
              <p className="text-xs text-slate-500">আপনার প্রতিটি রক্তদান একটি অমূল্য মানবসেবা</p>
            </div>
            <span className="text-xs font-black text-red-700 bg-red-50 px-3 py-1 rounded-full border border-red-200">
              মোট: {myDonations.length} বার
            </span>
          </div>

          {myDonations.length > 0 ? (
            <div className="space-y-3 pt-2">
              {myDonations.map((don, idx) => (
                <div
                  key={don.id || idx}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{don.hospital}</span>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        যাচাইকৃত
                      </span>
                    </div>
                    <p className="text-slate-500">
                      তারিখ: <span className="font-mono font-semibold text-slate-700">{don.donationDate}</span> • পরিমাণ: {don.units} ব্যাগ ({don.donationType})
                    </p>
                    {don.notes && <p className="text-slate-400 text-[11px]">মন্তব্য: {don.notes}</p>}
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <Link
                      to="/certificate"
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg font-bold flex items-center gap-1 transition-colors"
                    >
                      <Award className="w-3.5 h-3.5 text-amber-600" />
                      সনদপত্র দেখুন
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center space-y-2 text-slate-400">
              <Droplets className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-xs font-medium">এখনো কোনো রক্তদান সম্পন্ন হয়নি।</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: BLOOD REQUESTS */}
      {/* ========================================================================= */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                আমার রক্তের আবেদনসমূহ
              </h2>
              <p className="text-xs text-slate-500">আপনার তৈরি করা জরুরি রক্তের রিকোয়েস্ট ট্র্যাকিং</p>
            </div>
            <Link
              to="/request-blood"
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
            >
              <Heart className="w-3.5 h-3.5" />
              নতুন আবেদন করুন
            </Link>
          </div>

          {myRequests.length > 0 ? (
            <div className="space-y-3 pt-2">
              {myRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-red-700 text-sm bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        {req.bloodGroup}
                      </span>
                      <span className="font-bold text-slate-900 text-sm">{req.patientName}</span>
                      <span className="font-mono text-slate-400 text-[11px]">({req.requestId})</span>
                    </div>
                    <p className="text-slate-500">
                      হাসপাতাল: {req.hospital} • প্রয়োজনীয় তারিখ: {req.requiredDate} ({req.requiredUnits} ব্যাগ)
                    </p>
                  </div>

                  <Link
                    to={`/request/${req.id}`}
                    className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-red-700 border border-slate-300 rounded-lg font-bold flex items-center gap-1 transition-colors self-start sm:self-center"
                  >
                    <span>ম্যাচিং ডোনার দেখুন</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center space-y-2 text-slate-400">
              <Heart className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-xs font-medium">আপনার কোনো সক্রিয় রক্তের আবেদন নেই।</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SECURITY & PRIVACY SETTINGS */}
      {/* ========================================================================= */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6 animate-in fade-in duration-150">
          <div>
            <h2 className="text-base font-black text-slate-900">নিরাপত্তা ও প্রাইভেসি সেটিংস</h2>
            <p className="text-xs text-slate-500">আপনার ব্যক্তিগত পাসওয়ার্ড ও গোপনীয়তা নিয়ন্ত্রণ করুন</p>
          </div>

          <div className="p-4 border border-slate-200 rounded-xl flex items-center justify-between bg-slate-50/50">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-800">অ্যাকাউন্ট পাসওয়ার্ড</p>
              <p className="text-[11px] text-slate-500">নিয়মিত পাসওয়ার্ড পরিবর্তন করে অ্যাকাউন্ট সুরক্ষিত রাখুন</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setNewPassword('');
                setConfirmPassword('');
                setShowChangePasswordModal(true);
              }}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              পাসওয়ার্ড পরিবর্তন করুন
            </button>
          </div>

          {myDonor && (
            <div className="p-4 border border-slate-200 rounded-xl space-y-3 bg-slate-50/50">
              <p className="text-xs font-bold text-slate-800">পাবলিক ডিরেক্টরি প্রাইভেসি</p>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={myDonor.privacy?.showPhone ?? true}
                  onChange={async (e) => {
                    await updateDonor(myDonor.id, {
                      privacy: { ...myDonor.privacy, showPhone: e.target.checked },
                    });
                    setToastMessage({ type: 'success', text: 'প্রাইভেসি সেটিং আপডেট করা হয়েছে।' });
                    setTimeout(() => setToastMessage(null), 3000);
                  }}
                  className="w-4 h-4 text-red-600 rounded-sm border-slate-300 focus:ring-red-500"
                />
                <span>রক্তদাতা খোঁজার পাতায় সাধারণ মানুষের কাছে আপনার মোবাইল নম্বর প্রদর্শন করুন</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={myDonor.privacy?.allowDirectContact ?? true}
                  onChange={async (e) => {
                    await updateDonor(myDonor.id, {
                      privacy: { ...myDonor.privacy, allowDirectContact: e.target.checked },
                    });
                    setToastMessage({ type: 'success', text: 'প্রাইভেসি সেটিং আপডেট করা হয়েছে।' });
                    setTimeout(() => setToastMessage(null), 3000);
                  }}
                  className="w-4 h-4 text-red-600 rounded-sm border-slate-300 focus:ring-red-500"
                />
                <span>জরুরি প্রয়োজনে সরাসরি যোগাযোগের অনুমতি দিন</span>
              </label>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. COMPREHENSIVE EDIT PROFILE MODAL */}
      {/* ========================================================================= */}
      {showEditProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">প্রোফাইল তথ্য সম্পাদনা</h3>
                  <p className="text-[11px] text-slate-500">ব্যক্তিগত ও স্বাস্থ্য তথ্য হালনাগাদ করুন</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditProfileModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              {/* Section 1: Personal Information */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-200/80 pb-2">
                  <UserIcon className="w-4 h-4 text-red-600" />
                  <span>১. ব্যক্তিগত মৌলিক তথ্য</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    পুরো নাম <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    placeholder="আপনার পূর্ণ নাম লিখুন"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      মোবাইল নম্বর <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="017XXXXXXXX"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      ইমেইল ঠিকানা (ঐচ্ছিক)
                    </label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="example@mail.com"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      লিঙ্গ
                    </label>
                    <select
                      value={editGender}
                      onChange={(e) => setEditGender(e.target.value as Gender)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                    >
                      <option value="male">পুরুষ (Male)</option>
                      <option value="female">মহিলা (Female)</option>
                      <option value="other">অন্যান্য (Other)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      জন্ম তারিখ
                    </label>
                    <input
                      type="date"
                      value={editDateOfBirth}
                      onChange={(e) => setEditDateOfBirth(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    প্রোফাইল ছবি / অবতার লিংক (ঐচ্ছিক URL)
                  </label>
                  <input
                    type="url"
                    value={editPhotoUrl}
                    onChange={(e) => setEditPhotoUrl(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden text-xs"
                  />
                </div>
              </div>

              {/* Section 2: Blood & Health Details */}
              <div className="p-4 bg-rose-50/50 border border-rose-200/80 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-red-900 font-bold border-b border-rose-200/60 pb-2">
                  <Droplets className="w-4 h-4 text-red-600" />
                  <span>২. রক্তদান ও স্বাস্থ্য বিবরণ</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      রক্তের গ্রুপ <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editBloodGroup}
                      onChange={(e) => setEditBloodGroup(e.target.value as BloodGroup)}
                      className="w-full px-3 py-2 border border-red-300 rounded-lg bg-white font-mono font-black text-red-600 focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                    >
                      {BLOOD_GROUPS.map((bg) => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      ওজন (কেজি)
                    </label>
                    <input
                      type="number"
                      value={editWeight}
                      onChange={(e) => setEditWeight(e.target.value ? Number(e.target.value) : '')}
                      placeholder="যেমন: ৬০"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      সর্বশেষ রক্তদানের তারিখ
                    </label>
                    <input
                      type="date"
                      value={editLastDonationDate}
                      onChange={(e) => setEditLastDonationDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none bg-white p-2.5 rounded-lg border border-rose-200">
                    <input
                      type="checkbox"
                      checked={editAvailability}
                      onChange={(e) => setEditAvailability(e.target.checked)}
                      className="w-4 h-4 text-red-600 rounded-sm border-slate-300 focus:ring-red-500"
                    />
                    <span className="text-slate-800 font-bold">
                      আমি বর্তমানে জরুরি প্রয়োজনে রক্তদানে প্রস্তুত ও সক্রিয় আছি
                    </span>
                  </label>
                </div>
              </div>

              {/* Section 3: Location & Address */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-200/80 pb-2">
                  <MapPin className="w-4 h-4 text-red-600" />
                  <span>৩. ঠিকানা ও অবস্থান</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      জেলা
                    </label>
                    <select
                      value={editDistrict}
                      onChange={(e) => {
                        const dist = e.target.value;
                        setEditDistrict(dist);
                        if (dist === 'Dhaka') setEditUpazila('Dhamrai (ধামরাই)');
                        else if (dist === 'Manikganj') setEditUpazila('Manikganj Sadar (মানিকগঞ্জ সদর)');
                        else setEditUpazila('Gazipur Sadar (গাজীপুর সদর)');
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                    >
                      <option value="Dhaka">Dhaka (ঢাকা)</option>
                      <option value="Manikganj">Manikganj (মানিকগঞ্জ)</option>
                      <option value="Gazipur">Gazipur (গাজীপুর)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      উপজেলা / থানা
                    </label>
                    <select
                      value={editUpazila}
                      onChange={(e) => setEditUpazila(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                    >
                      {currentUpazilas.map((upa) => (
                        <option key={upa} value={upa}>{upa}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      ইউনিয়ন তালিকা
                    </label>
                    <select
                      value={currentUnions.includes(editArea) ? editArea : ''}
                      onChange={(e) => {
                        if (e.target.value) setEditArea(e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                    >
                      <option value="">-- ইউনিয়ন নির্বাচন করুন --</option>
                      {currentUnions.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      ইউনিয়ন / এলাকা / গ্রাম (কাস্টম)
                    </label>
                    <input
                      type="text"
                      value={editArea}
                      onChange={(e) => setEditArea(e.target.value)}
                      placeholder="যেমন: কালামপুর, কুশুরা, ধামরাই সদর"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    বিস্তারিত বাসা / হোল্ডিং / রোড ঠিকানা
                  </label>
                  <input
                    type="text"
                    value={editExactAddress}
                    onChange={(e) => setEditExactAddress(e.target.value)}
                    placeholder="যেমন: বাড়ি # ১২, রোড # ৪, কালামপুর বাজার"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Section 4: Emergency Contact & Privacy */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-200/80 pb-2">
                  <Phone className="w-4 h-4 text-red-600" />
                  <span>৪. জরুরি যোগাযোগ ও গোপনীয়তা</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    জরুরি বিকল্প নম্বর (আত্মীয় বা বন্ধুর ফোন)
                  </label>
                  <input
                    type="tel"
                    value={editEmergencyContact}
                    onChange={(e) => setEditEmergencyContact(e.target.value)}
                    placeholder="018XXXXXXXX"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                  />
                </div>

                <div className="pt-2 border-t border-slate-200/80 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editShowPhone}
                      onChange={(e) => setEditShowPhone(e.target.checked)}
                      className="w-4 h-4 text-red-600 rounded-sm border-slate-300 focus:ring-red-500"
                    />
                    <span className="text-slate-700 font-semibold">
                      রক্তদাতা তালিকায় সাধারণ মানুষদের জন্য মোবাইল নম্বর উন্মুক্ত রাখুন
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editAllowDirectContact}
                      onChange={(e) => setEditAllowDirectContact(e.target.checked)}
                      className="w-4 h-4 text-red-600 rounded-sm border-slate-300 focus:ring-red-500"
                    />
                    <span className="text-slate-700 font-semibold">
                      জরুরি প্রয়োজনে সরাসরি কল করার অনুমতি দিন
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-xs border border-red-700/60 transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'তথ্য সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CHANGE PASSWORD MODAL */}
      {/* ========================================================================= */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">পাসওয়ার্ড পরিবর্তন</h3>
                  <p className="text-[11px] text-slate-500">আপনার একাউন্টের নতুন পাসওয়ার্ড সেট করুন</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChangePasswordModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  নতুন পাসওয়ার্ড (কমপক্ষে ৬ ডিজিট) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 pr-9 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  নতুন পাসওয়ার্ড নিশ্চিতকরণ <span className="text-red-500">*</span>
                </label>
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-xs border border-red-700/60 transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'পরিবর্তন হচ্ছে...' : 'পাসওয়ার্ড আপডেট করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DIGITAL BLOOD DONOR ID CARD MODAL */}
      {/* ========================================================================= */}
      {showDonorCardModal && myDonor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-red-600" />
                <h3 className="text-base font-black text-slate-900">ডিজিটাল রক্তদাতা কার্ড</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDonorCardModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Donor Card Layout */}
            <div className="rounded-2xl bg-gradient-to-br from-red-600 via-rose-700 to-red-900 p-5 text-white shadow-xl space-y-4 relative overflow-hidden border border-red-500/40">
              <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-red-200">{config.name}</p>
                  <p className="text-sm font-black">{config.nameBn || config.name} রক্তদাতা কার্ড</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black font-mono text-xl border border-white/30">
                  {myDonor.bloodGroup}
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <p className="text-lg font-black tracking-tight">{currentUser.fullName}</p>
                <p className="text-xs text-red-100 font-mono">আইডি: {myDonor.donorId}</p>
              </div>

              <div className="pt-2 border-t border-white/20 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-red-200 block text-[10px]">এলাকা</span>
                  <span className="font-bold">{myDonor.area || myDonor.upazila}, {myDonor.district}</span>
                </div>
                <div className="text-right">
                  <span className="text-red-200 block text-[10px]">মোট রক্তদান</span>
                  <span className="font-bold font-mono">{totalDonations} বার</span>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-[10px] text-red-200">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-300" />
                  ভেরিফায়েড সদস্য
                </span>
                <span>রক্তবন্ধন নেটওয়ার্ক</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                প্রিন্ট / সেভ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
