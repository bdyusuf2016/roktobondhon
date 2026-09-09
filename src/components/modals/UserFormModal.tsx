import React, { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { UserPlus, ShieldCheck, Lock, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { canManageRole, ROLE_LABELS } from '../../services/permissionService';
import type { User, UserRole } from '../../types';

export interface UserFormData extends Omit<User, 'id' | 'createdAt' | 'updatedAt'> {
  password?: string;
}

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit?: User | null;
  onSave: (data: UserFormData, password?: string) => Promise<void>;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  userToEdit,
  onSave,
}) => {
  const { currentUser } = useAuth();
  const isEditing = Boolean(userToEdit);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('volunteer');
  const [branchId, setBranchId] = useState('br-dhm');

  // Password fields for new user creation
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin';

  // Calculate assignable roles based on actor privileges (Portal Staff roles)
  const getAssignableRoles = (): UserRole[] => {
    if (isSuperAdmin) {
      return ['super_admin', 'admin', 'moderator', 'volunteer'];
    }
    if (isAdmin) {
      return ['moderator', 'volunteer'];
    }
    return ['volunteer'];
  };

  const assignableRoles = getAssignableRoles();

  useEffect(() => {
    if (userToEdit) {
      setFullName(userToEdit.fullName);
      setEmail(userToEdit.email || '');
      setPhone(userToEdit.phone);
      setRole(userToEdit.role);
      setBranchId(userToEdit.branchId || 'br-dhm');
      setPassword('');
      setConfirmPassword('');
    } else {
      setFullName('');
      setEmail('');
      setPhone('');
      setRole('volunteer');
      setBranchId('br-dhm');
      setPassword('');
      setConfirmPassword('');
    }
    setErrorMessage('');
    setShowPassword(false);
  }, [userToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage('');

    if (!fullName.trim() || !phone.trim()) {
      setErrorMessage('অনুগ্রহ করে নাম এবং মোবাইল নম্বর প্রদান করুন।');
      return;
    }

    if (!isEditing) {
      if (!email.trim() || !email.includes('@')) {
        setErrorMessage('লগইন ও অথেন্টিকেশনের জন্য সঠিক ইমেইল প্রদান করুন।');
        return;
      }
      if (!password || password.length < 6) {
        setErrorMessage('পাসওয়ার্ডটি যথেষ্ট শক্তিশালী নয় (কমপক্ষে ৬ অক্ষর প্রয়োজন)।');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('পাসওয়ার্ড ও কনফার্ম পাসওয়ার্ড মিলছে না।');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSave(
        {
          fullName: fullName.trim(),
          email: email.trim().toLowerCase() || undefined,
          phone: phone.trim(),
          role,
          organizationId: 'org-roktobondon',
          branchId,
          password: !isEditing ? password : undefined,
        },
        !isEditing ? password : undefined
      );
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'ব্যবহারকারীর তথ্য সংরক্ষণ করতে ব্যর্থ হয়েছে।');
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
      icon={<UserPlus className="w-5 h-5 text-red-600" />}
      title={isEditing ? 'ব্যবহারকারীর তথ্য ও রোল এডিট' : 'নতুন টিম মেম্বার / ইউজার যুক্ত করুন'}
      subtitle="প্ল্যাটফর্ম পরিচালনার জন্য ভলান্টিয়ার, মডারেটর বা এডমিন রোল নির্ধারণ করুন।"
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
            className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : isEditing ? 'রোল আপডেট করুন' : 'ইউজার তৈরি করুন'}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1 text-xs">
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium">
            {errorMessage}
          </div>
        )}

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            পূর্ণ নাম *
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="যেমন: মোঃ রাশেদুল ইসলাম"
            className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-hidden"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              মোবাইল নম্বর *
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="017xxxxxxxx"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-red-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {isEditing ? 'ইমেইল (ঐচ্ছিক)' : 'লগইন ইমেইল *'}
            </label>
            <input
              type="email"
              required={!isEditing}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Password inputs for new user account */}
        {!isEditing && (
          <div className="p-3 bg-red-50/50 rounded-xl border border-red-100 space-y-3">
            <div className="flex items-center gap-1.5 text-slate-800 font-bold">
              <KeyRound className="w-3.5 h-3.5 text-red-600" />
              <span>লগইন একাউন্ট ও পাসওয়ার্ড নির্ধারণ</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  পাসওয়ার্ড * (কমপক্ষে ৬ অক্ষর)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 pr-9 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  কনফার্ম পাসওয়ার্ড *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 pr-9 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-500">
              * নতুন ইউজার এই ইমেইল ও পাসওয়ার্ড দিয়ে সরাসরি সিস্টেমে লগইন করতে পারবেন।
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              ইউজার রোল ও পারমিশন *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold bg-slate-50 focus:bg-white text-red-700"
            >
              {assignableRoles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]?.bn || r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              শাখা / জোন *
            </label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium bg-slate-50 focus:bg-white"
            >
              <option value="br-dhm">ধামরাই সেন্ট্রাল শাখা</option>
              <option value="br-svr">সাভার এরিয়া শাখা</option>
              <option value="br-mnk">মানিকগঞ্জ জেলা শাখা</option>
            </select>
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
          <p className="font-bold text-slate-800 mb-1">রোল ও পারমিশন বিবরণ:</p>
          <ul className="list-disc list-inside space-y-0.5 text-[10px]">
            <li><strong>সুপার এডমিন:</strong> ডাটাবেজ ব্যাকআপ, ইউজার রোল বদল ও সেটিংসের পূর্ণ নিয়ন্ত্রণ।</li>
            <li><strong>মডারেটর:</strong> রক্তদাতা ও রক্তের আবেদন ভেরিফিকেশন এবং হাসপাতাল ব্যবস্থাপনা।</li>
            <li><strong>স্বেচ্ছাসেবক:</strong> জরুরি রক্তদান সমন্বয় ও ফিল্ড সাপোর্ট।</li>
          </ul>
        </div>
      </form>
    </BaseModal>
  );
};
