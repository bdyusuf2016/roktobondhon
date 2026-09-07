import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
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
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { INITIAL_LOCATIONS } from '../services/locationService';
import type { BloodGroup } from '../types';

const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, logout, updateCurrentUser, changePassword } = useAuth();
  const { donors, bloodRequests, donations, updateDonor } = useData();

  // Modals state
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  // Edit Profile Form State
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editBloodGroup, setEditBloodGroup] = useState<BloodGroup>('A+');
  const [editDistrict, setEditDistrict] = useState('Dhaka');
  const [editUpazila, setEditUpazila] = useState('Dhamrai');
  const [editArea, setEditArea] = useState('');
  const [editLastDonationDate, setEditLastDonationDate] = useState('');
  const [editShowPhone, setEditShowPhone] = useState(true);

  // Change Password Form State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">
          প্রোফাইল দেখতে প্রথমে লগইন করুন
        </h2>
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

  const handleOpenEditProfile = () => {
    setEditFullName(currentUser.fullName || '');
    setEditPhone(currentUser.phone || '');
    setEditEmail(currentUser.email || '');
    if (myDonor) {
      setEditBloodGroup(myDonor.bloodGroup || 'A+');
      setEditDistrict(myDonor.district || 'Dhaka');
      setEditUpazila(myDonor.upazila || 'Dhamrai');
      setEditArea(myDonor.area || '');
      setEditLastDonationDate(myDonor.lastDonationDate || '');
      setEditShowPhone(myDonor.privacy?.showPhone ?? true);
    }
    setShowEditProfileModal(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFullName.trim()) {
      setToastMessage({ type: 'error', text: 'অনুগ্রহ করে সম্পূর্ণ নাম লিখুন।' });
      return;
    }
    setIsSubmitting(true);
    try {
      // 1. Update User Record
      await updateCurrentUser({
        fullName: editFullName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim() || undefined,
      });

      // 2. If Donor, update Donor record
      if (myDonor) {
        await updateDonor(myDonor.id, {
          fullName: editFullName.trim(),
          phone: editPhone.trim(),
          email: editEmail.trim() || undefined,
          bloodGroup: editBloodGroup,
          district: editDistrict,
          upazila: editUpazila,
          area: editArea.trim() || editUpazila,
          lastDonationDate: editLastDonationDate || undefined,
          privacy: {
            ...myDonor.privacy,
            showPhone: editShowPhone,
          },
        });
      }

      setShowEditProfileModal(false);
      setToastMessage({ type: 'success', text: 'প্রোফাইল সফলভাবে আপডেট করা হয়েছে!' });
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

  // Upazila list based on selected district in edit modal
  const currentUpazilas = Array.from(
    new Set(
      INITIAL_LOCATIONS.filter((l) => l.district.toLowerCase() === editDistrict.toLowerCase()).map(
        (l) => l.upazila.split(' ')[0]
      )
    )
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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

      {/* Profile Header */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-red-50 text-red-700 font-black text-2xl flex items-center justify-center border border-red-200 shadow-2xs">
            {currentUser.fullName.slice(0, 1)}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                {currentUser.fullName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                {currentUser.role}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" />
                {currentUser.phone}
              </span>
              {currentUser.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {currentUser.email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={handleOpenEditProfile}
            className="px-3.5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg border border-slate-300/80 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-600" />
            প্রোফাইল এডিট
          </button>

          <button
            type="button"
            onClick={() => {
              setNewPassword('');
              setConfirmPassword('');
              setShowChangePasswordModal(true);
            }}
            className="px-3.5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg border border-slate-300/80 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <KeyRound className="w-3.5 h-3.5 text-slate-600" />
            পাসওয়ার্ড পরিবর্তন
          </button>

          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg border border-red-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            লগআউট
          </button>
        </div>
      </div>

      {/* Donor Controls if registered as donor */}
      {myDonor ? (
        <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-600" />
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                রক্তদাতা প্রোফাইল তথ্য ({myDonor.bloodGroup} গ্রুপ)
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                {myDonor.donorId}
              </span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                ভেরিফায়েড
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <span className="text-slate-400 font-medium block">ঠিকানা / এলাকা</span>
              <span className="font-bold text-slate-800 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                {myDonor.area || myDonor.upazila}, {myDonor.district}
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <span className="text-slate-400 font-medium block">মোট রক্তদান</span>
              <span className="font-bold text-slate-800 flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-red-500" />
                {myDonor.totalDonations || 0} বার
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <span className="text-slate-400 font-medium block">শেষ রক্তদানের তারিখ</span>
              <span className="font-bold text-slate-800 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-red-500" />
                {myDonor.lastDonationDate || 'এখনো রক্তদান করেননি'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">রক্তদানের প্রস্তুতি</p>
                <p className="text-[11px] text-slate-500">
                  {myDonor.availability ? 'বর্তমানে রক্তদানে প্রস্তুত' : 'অনুপলব্ধ হিসেবে চিহ্নিত'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleAvailability}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  myDonor.availability
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {myDonor.availability ? 'প্রস্তুত (ON)' : 'বন্ধ (OFF)'}
              </button>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">জরুরি সেবা (২৪/৭)</p>
                <p className="text-[11px] text-slate-500">জরুরি রাতেও প্রস্তুত</p>
              </div>
              <button
                type="button"
                onClick={handleToggleEmergency}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  myDonor.emergencyAvailable
                    ? 'bg-red-600 text-white shadow-2xs'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {myDonor.emergencyAvailable ? 'সক্রিয় (ON)' : 'বন্ধ (OFF)'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-red-50/40 border border-red-200 rounded-xl p-6 text-center space-y-3">
          <Droplets className="w-10 h-10 text-red-600 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">
            আপনি এখনো রক্তদাতা হিসেবে নিবন্ধিত নন
          </h2>
          <p className="text-xs text-slate-600 max-w-sm mx-auto">
            মাত্র ২ মিনিটে আপনার রক্তদাতা প্রোফাইল তৈরি করুন এবং জীবন বাঁচাতে এগিয়ে আসুন।
          </p>
          <Link
            to="/become-donor"
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold inline-block shadow-xs border border-red-700/60"
          >
            রক্তদাতা হিসেবে নিবন্ধন করুন
          </Link>
        </div>
      )}

      {/* My Blood Requests */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          আমার রক্তের আবেদনসমূহ ({myRequests.length})
        </h2>

        {myRequests.length > 0 ? (
          <div className="space-y-2">
            {myRequests.map((req) => (
              <div
                key={req.id}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-red-700">{req.bloodGroup}</span>
                    <span className="font-semibold text-slate-800">{req.patientName}</span>
                    <span className="font-mono text-slate-400">({req.requestId})</span>
                  </div>
                  <p className="text-slate-500 mt-0.5">{req.hospital} • {req.requiredDate}</p>
                </div>
                <Link
                  to={`/request/${req.id}`}
                  className="px-3 py-1 bg-white hover:bg-slate-100 text-red-700 border border-slate-200 rounded-lg font-bold transition-colors"
                >
                  ম্যাচিং দেখুন
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-3 text-center">
            আপনার কোনো সক্রিয় রক্তের আবেদন নেই।
          </p>
        )}
      </div>

      {/* My Donation Logs */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          আমার রক্তদানের হিস্ট্রি ({myDonations.length})
        </h2>

        {myDonations.length > 0 ? (
          <div className="space-y-2">
            {myDonations.map((don) => (
              <div
                key={don.id}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-slate-800">{don.hospital}</p>
                  <p className="text-slate-500 mt-0.5">
                    তারিখ: {don.donationDate} • {don.units} ব্যাগ ({don.donationType})
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  যাচাইকৃত
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-3 text-center">
            এখনো কোনো রক্তদান লিপিবদ্ধ করা হয়নি।
          </p>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. EDIT PROFILE MODAL */}
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
                  <h3 className="text-base font-black text-slate-900">প্রোফাইল সম্পাদনা</h3>
                  <p className="text-[11px] text-slate-500">আপনার ব্যক্তিগত ও রক্তদাতা তথ্য পরিবর্তন করুন</p>
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
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  পুরো নাম <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="আপনার নাম লিখুন"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Donor Specific Edit Fields if user is a registered donor */}
              {myDonor && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider block">
                    রক্তদাতা সম্পর্কিত তথ্য
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        রক্তের গ্রুপ
                      </label>
                      <select
                        value={editBloodGroup}
                        onChange={(e) => setEditBloodGroup(e.target.value as BloodGroup)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono font-bold text-red-700 focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                      >
                        {BLOOD_GROUPS.map((bg) => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        শেষ রক্তদানের তারিখ
                      </label>
                      <input
                        type="date"
                        value={editLastDonationDate}
                        onChange={(e) => setEditLastDonationDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        জেলা
                      </label>
                      <select
                        value={editDistrict}
                        onChange={(e) => {
                          setEditDistrict(e.target.value);
                          if (e.target.value === 'Dhaka') setEditUpazila('Dhamrai');
                          else if (e.target.value === 'Manikganj') setEditUpazila('Manikganj Sadar');
                          else setEditUpazila('Gazipur Sadar');
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

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      ইউনিয়ন / এলাকা / গ্রাম
                    </label>
                    <input
                      type="text"
                      value={editArea}
                      onChange={(e) => setEditArea(e.target.value)}
                      placeholder="যেমন: কালামপুর, কুশুরা, ধামরাই সদর"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                    />
                  </div>

                  <div className="pt-1">
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
                  </div>
                </div>
              )}

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
    </div>
  );
};
