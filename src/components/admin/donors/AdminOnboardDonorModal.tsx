import React, { useState } from 'react';
import {
  UserPlus,
  Droplets,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ShieldCheck,
  KeyRound,
  AlertCircle,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { BaseModal } from '../../modals/BaseModal';
import { useAuth } from '../../../contexts/AuthContext';
import { useData } from '../../../contexts/DataContext';
import { useDialog } from '../../../contexts/DialogContext';
import type { BloodGroup, Gender } from '../../../types';
import { BANGLADESH_DISTRICTS, getUpazilasForDistrict } from '../../../data/bangladeshGeoData';

interface AdminOnboardDonorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (donorName: string, donorId: string, phone: string) => void;
}

export const AdminOnboardDonorModal: React.FC<AdminOnboardDonorModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentUser } = useAuth();
  const { onboardDonor } = useData();
  const dialog = useDialog();

  const [fullName, setFullName] = useState('');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('A+');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [weight, setWeight] = useState<number | ''>('');

  const [district, setDistrict] = useState('ঢাকা');
  const [upazila, setUpazila] = useState('ধামরাই');
  const [area, setArea] = useState('');
  const [exactAddress, setExactAddress] = useState('');

  const [lastDonationDate, setLastDonationDate] = useState('');
  const [totalDonations, setTotalDonations] = useState<number | ''>('');
  const [availability, setAvailability] = useState(true);
  const [emergencyAvailable, setEmergencyAvailable] = useState(true);
  const [adminNotes, setAdminNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleDistrictChange = (dist: string) => {
    setDistrict(dist);
    const upazilas = getUpazilasForDistrict(dist);
    setUpazila(upazilas[0] || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage('');

    const cleanName = fullName.trim();
    const cleanPhone = phone.trim().replace(/[^0-9]/g, '');

    if (!cleanName) {
      setErrorMessage('রক্তদাতার পূর্ণ নাম প্রদান করুন।');
      return;
    }

    if (!cleanPhone || cleanPhone.length < 11) {
      setErrorMessage('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)।');
      return;
    }

    const finalArea = area.trim() || upazila;

    const cleanDist = district.toLowerCase();
    const branchId =
      cleanDist.includes('মানিকগঞ্জ') || cleanDist.includes('manikganj')
        ? 'br-mnk'
        : upazila.includes('ধামরাই') || upazila.toLowerCase().includes('dhamrai')
        ? 'br-dhm'
        : 'br-svr';

    setIsSubmitting(true);
    try {
      const result = await onboardDonor(
        {
          fullName: cleanName,
          bloodGroup,
          phone: cleanPhone,
          email: email.trim() || undefined,
          gender,
          dateOfBirth: dateOfBirth || undefined,
          weight: typeof weight === 'number' ? weight : undefined,
          district,
          upazila,
          area: finalArea,
          exactAddress: exactAddress.trim() || undefined,
          lastDonationDate: lastDonationDate || undefined,
          totalDonations: typeof totalDonations === 'number' ? totalDonations : undefined,
          availability,
          emergencyAvailable,
          adminNotes: adminNotes.trim() || undefined,
          branchId,
        },
        currentUser ? { id: currentUser.id, fullName: currentUser.fullName } : undefined
      );

      onClose();

      if (onSuccess) {
        onSuccess(result.donor.fullName, result.donor.donorId, cleanPhone);
      } else {
        dialog.alert({
          title: 'রক্তদাতা অনবোর্ড সম্পন্ন!',
          message: `রক্তদাতা "${result.donor.fullName}" (আইডি: ${result.donor.donorId}) সফলভাবে সিস্টেমে যুক্ত ও ভেরিফাই করা হয়েছে। রক্তদাতার প্রাথমিক লগইন পাসওয়ার্ড: ${cleanPhone}।`,
          theme: 'success',
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'রক্তদাতা অনবোর্ড করতে সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      theme="modern"
      size="lg"
      icon={
        <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center">
          <UserPlus className="w-5 h-5 text-red-600" />
        </div>
      }
      title="নতুন রক্তদাতা অনবোর্ড করুন (Admin Onboarding)"
      subtitle="ক্যাম্প, ফিল্ড বা ফোনের মাধ্যমে সংগৃহীত রক্তদাতার তথ্য সরাসরি ভেরিফায়েড হিসেবে যুক্ত করুন।"
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
            className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'রক্তদাতা অনবোর্ড সম্পন্ন করুন'}
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

        {/* Security & Password Notice */}
        <div className="p-3 bg-emerald-50/90 border border-emerald-200/90 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5">
          <KeyRound className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-emerald-900">
              ডিফল্ট পাসওয়ার্ড: রক্তদাতার মোবাইল নম্বর ({phone || '01XXXXXXXXX'})
            </p>
            <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
              সিস্টেম স্বয়ংক্রিয়ভাবে রক্তদাতার মোবাইল নম্বরটিকে তার একাউন্টের প্রাথমিক পাসওয়ার্ড নির্ধারণ করবে। 
              তিনি সরাসরি এই মোবাইল নম্বর ও পাসওয়ার্ড দিয়ে ওয়েবসাইটে লগইন করতে পারবেন এবং পরবর্তীতে প্রোফাইল থেকে তা পরিবর্তন করে নিতে পারবেন।
            </p>
          </div>
        </div>

        {/* SECTION 1: Personal Information */}
        <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
          <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
            <Droplets className="w-3.5 h-3.5 text-red-600" />
            ব্যক্তিগত ও মেডিকেল তথ্য
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Full Name */}
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                রক্তদাতার পূর্ণ নাম <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="যেমন: মোঃ রাশেদুল ইসলাম"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
              />
            </div>

            {/* Blood Group */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                রক্তের গ্রুপ <span className="text-red-500">*</span>
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono font-bold text-red-700 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              >
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Mobile Number */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                মোবাইল নম্বর <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-white font-mono text-slate-800 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>
            </div>

            {/* Alternate Phone */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">বিকল্প মোবাইল নম্বর</label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="tel"
                  value={alternatePhone}
                  onChange={(e) => setAlternatePhone(e.target.value)}
                  placeholder="ঐচ্ছিক"
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-white font-mono text-slate-800"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ইমেইল ঠিকানা</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="donor@gmail.com (ঐচ্ছিক)"
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-white font-mono text-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Gender */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">লিঙ্গ</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800"
              >
                <option value="male">পুরুষ (Male)</option>
                <option value="female">মহিলা (Female)</option>
                <option value="other">অন্যান্য (Other)</option>
              </select>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">জন্মতারিখ (বয়স ১৮-৬৫)</label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-white font-mono text-slate-800"
                />
              </div>
            </div>

            {/* Weight */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ওজন (কেজি)</label>
              <input
                type="number"
                min="45"
                max="150"
                value={weight}
                onChange={(e) => setWeight(e.target.value ? Number(e.target.value) : '')}
                placeholder="যেমন: ৫০"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Location Information */}
        <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
          <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            ঠিকানা ও ভৌগোলিক অবস্থান (৬৪ জেলা ও সকল উপজেলা)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* District */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                জেলা <span className="text-red-500">*</span>
              </label>
              <select
                value={district}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold text-slate-800"
              >
                {BANGLADESH_DISTRICTS.map((d) => (
                  <option key={d.id} value={d.nameBn}>
                    {d.nameBn} ({d.nameEn})
                  </option>
                ))}
              </select>
            </div>

            {/* Upazila */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                উপজেলা / থানা <span className="text-red-500">*</span>
              </label>
              <select
                value={upazila}
                onChange={(e) => setUpazila(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold text-slate-800"
              >
                {getUpazilasForDistrict(district).map((upa) => (
                  <option key={upa} value={upa}>
                    {upa}
                  </option>
                ))}
              </select>
            </div>

            {/* Area / Village */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                গ্রাম / মহল্লা / এলাকা (ঐচ্ছিক)
              </label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="যেমন: কুশুরা, কালামপুর বাজার"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">বিস্তারিত ঠিকানা / গ্রাম / ল্যান্ডমার্ক</label>
            <input
              type="text"
              value={exactAddress}
              onChange={(e) => setExactAddress(e.target.value)}
              placeholder="যেমন: কুশুরা বাজার মোড়, পোস্ট অফিস সংলগ্ন"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800"
            />
          </div>
        </div>

        {/* SECTION 3: Donation History & Availability */}
        <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
          <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            রক্তদানের ইতিহাস ও প্রাপ্যতা
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">শেষ রক্তদানের তারিখ</label>
              <input
                type="date"
                value={lastDonationDate}
                onChange={(e) => setLastDonationDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono text-slate-800"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">নতুন রক্তদাতা হলে খালি রাখুন।</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">পূর্বে মোট রক্তদানের সংখ্যা</label>
              <input
                type="number"
                min="0"
                value={totalDonations}
                onChange={(e) => setTotalDonations(e.target.value ? Number(e.target.value) : '')}
                placeholder="যেমন: ৩"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono text-slate-800"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={availability}
                onChange={(e) => setAvailability(e.target.checked)}
                className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
              />
              <span className="font-medium text-slate-800">বর্তমানে রক্তদানের জন্য প্রস্তুত</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={emergencyAvailable}
                onChange={(e) => setEmergencyAvailable(e.target.checked)}
                className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
              />
              <span className="font-medium text-red-700">🚨 জরুরি প্রয়োজনে সর্বদা প্রস্তুত</span>
            </label>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">অ্যাডমিন নোট / রেফারেন্স</label>
            <input
              type="text"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="যেমন: কালামপুর ক্যাম্প ২০২৬ থেকে সংগৃহীত"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800"
            />
          </div>
        </div>
      </form>
    </BaseModal>
  );
};
