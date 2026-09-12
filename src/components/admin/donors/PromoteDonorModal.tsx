import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  Phone,
  Building2,
  Droplets,
  Eye,
  EyeOff,
  UserCheck,
  AlertCircle,
  Crown,
} from 'lucide-react';
import { BaseModal } from '../../modals/BaseModal';
import { useAuth } from '../../../contexts/AuthContext';
import { ROLE_LABELS } from '../../../services/permissionService';
import type { Donor, UserRole } from '../../../types';

interface PromoteDonorModalProps {
  isOpen: boolean;
  onClose: () => void;
  donor: Donor | null;
  onPromote: (
    donor: Donor,
    role: UserRole,
    email: string,
    password: string,
    branchId: string
  ) => Promise<void>;
}

export const PromoteDonorModal: React.FC<PromoteDonorModalProps> = ({
  isOpen,
  onClose,
  donor,
  onPromote,
}) => {
  const { currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('moderator');
  const [branchId, setBranchId] = useState('br-dhm');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (donor) {
      setEmail(donor.email || '');
      setRole('moderator');
      setBranchId(donor.branchId || 'br-dhm');
      setPassword('');
      setConfirmPassword('');
      setErrorMessage('');
      setShowPassword(false);
    }
  }, [donor, isOpen]);

  if (!isOpen || !donor) return null;

  // STRICT ACCESS CONTROL: Only Super Admin can promote a donor to staff/admin
  if (!isSuperAdmin) {
    return (
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        theme="modern"
        size="md"
        title="অননুমোদিত অ্যাকশন"
        icon={<AlertCircle className="w-5 h-5 text-rose-600" />}
      >
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-2">
          <p className="font-bold">শুধুমাত্র সুপার এডমিন (Super Admin) এই পরিবর্তন করতে পারেন।</p>
          <p>সাধারণ এডমিন বা মডারেটরদের রক্তদাতাকে স্টাফ পদে উন্নীত করার প্রশাসনিক অনুমতি নেই।</p>
        </div>
      </BaseModal>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('লগইন ও অথেন্টিকেশনের জন্য সঠিক ইমেইল প্রদান করুন।');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('অ্যাডমিন প্যানেলে লগইনের জন্য কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন।');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মিলছে না।');
      return;
    }

    setIsSubmitting(true);
    try {
      await onPromote(donor, role, cleanEmail, password, branchId);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'স্টাফ হিসেবে পদোন্নতি সম্পন্ন করা যায়নি।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      theme="modern"
      size="md"
      icon={
        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
        </div>
      }
      title={
        <div className="flex items-center gap-2">
          <span>রক্তদাতাকে স্টাফ/এডমিন পদে অনুমোদন</span>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
            <Crown className="w-3 h-3" /> সুপার এডমিন অনলি
          </span>
        </div>
      }
      subtitle="বিদ্যমান রক্তদাতাকে এডমিন প্যানেলের প্রশাসনিক অ্যাক্সেস ও দায়িত্ব প্রদান করুন।"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl cursor-pointer"
          >
            বাতিল
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            {isSubmitting ? 'প্রসেস হচ্ছে...' : 'স্টাফ হিসেবে অনুমোদন দিন'}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1 text-xs">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Selected Donor Preview Card */}
        <div className="p-3.5 bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-indigo-100 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">{donor.fullName}</span>
              <span className="font-mono text-[11px] font-bold text-red-700 bg-red-100/80 px-2 py-0.5 rounded border border-red-200">
                {donor.bloodGroup}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
              {donor.donorId}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-indigo-100/60">
            <div className="flex items-center gap-1.5 font-mono">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{donor.phone}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-red-500" />
              <span>মোট রক্তদান: {donor.totalDonations || 0} বার</span>
            </div>
          </div>
        </div>

        {/* Form Inputs */}
        <div className="space-y-3">
          {/* Email for login */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              লগইন ইমেইল ঠিকানা <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="donor@gmail.com"
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">এডমিন প্যানেলে লগইন করার সময় এই ইমেইলটি ব্যবহার করতে হবে।</p>
          </div>

          {/* Role Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                নির্ধারিত পদবি (Role) <span className="text-red-500">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="moderator">মডারেটর (Moderator) - রিকোয়েস্ট ভেরিফিকেশন</option>
                <option value="admin">এডমিন (Admin) - পূর্ণ পরিচালনা ক্ষমতা</option>
                <option value="volunteer">স্বেচ্ছাসেবক (Volunteer) - ফিল্ড সাপোর্ট</option>
                <option value="super_admin">সুপার এডমিন (Super Admin) - সর্বোচ্চ ক্ষমতা</option>
              </select>
            </div>

            {/* Branch Selection */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">নির্ধারিত শাখা (Branch)</label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-800"
                >
                  <option value="br-dhm">ধামরাই শাখা</option>
                  <option value="br-svr">সাভার শাখা</option>
                  <option value="br-mnk">মানিকগঞ্জ শাখা</option>
                </select>
              </div>
            </div>
          </div>

          {/* Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                লগইন পাসওয়ার্ড <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="কমপক্ষে ৬ অক্ষর"
                  className="w-full pl-9 pr-9 py-2 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                পাসওয়ার্ড নিশ্চিতকরণ <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="পাসওয়ার্ড পুনরায় লিখুন"
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-xl text-[11px] text-indigo-900 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
            স্বয়ংক্রিয় ডোনার-স্টাফ সিঙ্ক:
          </p>
          <p className="text-indigo-800">
            এই ফর্মটি সাবমিট করার পর রক্তদাতার আইডি ({donor.donorId}) এবং তার লগইন একাউন্ট স্বয়ংক্রিয়ভাবে সংযুক্ত হবে।
            তিনি সরাসরি এই ইমেইল ও পাসওয়ার্ড দিয়ে এডমিন প্যানেলে লগইন করতে পারবেন।
          </p>
        </div>
      </form>
    </BaseModal>
  );
};
