import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  Droplets,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import type { BloodGroup, Gender } from '../types';

const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const BecomeDonorPage: React.FC = () => {
  const navigate = useNavigate();
  const { registerDonor } = useData();
  const { currentUser, updateCurrentUser } = useAuth();

  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O+');
  const [gender, setGender] = useState<Gender>('male');
  const [dateOfBirth, setDateOfBirth] = useState('2000-01-01');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [district, setDistrict] = useState('Dhaka');
  const [upazila, setUpazila] = useState('Dhamrai');
  const [area, setArea] = useState('');
  const [hasDonatedBefore, setHasDonatedBefore] = useState(false);
  const [lastDonationDate, setLastDonationDate] = useState('');
  const [availability, setAvailability] = useState(true);
  const [emergencyAvailable, setEmergencyAvailable] = useState(true);
  const [showPhone, setShowPhone] = useState(false);
  const [allowDirectContact, setAllowDirectContact] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successDonor, setSuccessDonor] = useState<{ id: string; donorId: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim()) {
      setErrorMessage('অনুগ্রহ করে পূর্ণ নাম প্রদান করুন।');
      return;
    }

    if (!phone.trim() || phone.length < 11) {
      setErrorMessage('অনুগ্রহ করে সঠিক মোবাইল নম্বর প্রদান করুন (১১ ডিজিট)।');
      return;
    }

    // Age validation (18 - 60 years)
    const birthYear = new Date(dateOfBirth).getFullYear();
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    if (age < 18 || age > 65) {
      setErrorMessage('রক্তদাতার বয়স ১৮ থেকে ৬৫ বছরের মধ্যে হতে হবে।');
      return;
    }

    if (!termsAccepted) {
      setErrorMessage('রক্তদানের শর্তাবলী ও নিরাপত্তা অঙ্গীকার সম্মতি প্রয়োজন।');
      return;
    }

    setIsSubmitting(true);
    try {
      const branchId = district === 'Manikganj' ? 'br-mnk' : (upazila === 'Dhamrai' ? 'br-dhm' : 'br-svr');

      const donor = await registerDonor({
        userId: currentUser?.id || `user-${Date.now()}`,
        fullName: fullName.trim(),
        bloodGroup,
        gender,
        dateOfBirth,
        phone: phone.trim(),
        email: email.trim() || undefined,
        division: 'Dhaka',
        district,
        upazila,
        area: area.trim() || upazila,
        availability,
        emergencyAvailable,
        lastDonationDate: hasDonatedBefore && lastDonationDate ? lastDonationDate : undefined,
        organizationId: 'org-roktobondon',
        branchId,
        privacy: {
          showPhone,
          showGender: true,
          showAge: false,
          allowDirectContact,
        },
      });

      if (currentUser) {
        updateCurrentUser({ role: 'donor' });
      }

      setSuccessDonor({ id: donor.id, donorId: donor.donorId });
    } catch (err: any) {
      setErrorMessage(err.message || 'নিবন্ধনে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successDonor) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            অভিনন্দন! নিবন্ধন সম্পন্ন হয়েছে
          </h1>
          <p className="text-sm text-slate-600">
            ধামরাই, সাভার ও মানিকগঞ্জ স্বেচ্ছাসেবী রক্তদান পরিবারে আপনাকে স্বাগতম।
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-xs space-y-3 text-left">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs text-slate-500 font-medium">রক্তদাতা আইডি (Donor ID)</span>
            <span className="text-base font-black text-red-700 font-mono">
              {successDonor.donorId}
            </span>
          </div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs text-slate-500 font-medium">ভেরিফিকেশন স্ট্যাটাস</span>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              যাচাইকরণ প্রক্রিয়া চলমান (Pending)
            </span>
          </div>
          <div className="text-xs text-slate-500">
            সংগঠনের স্বেচ্ছাসেবক টিম শীঘ্রই আপনার সাথে যোগাযোগ করে পরিচয় নিশ্চিত করবে।
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/donor/${successDonor.id}`)}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs border border-red-700/60 transition-colors"
          >
            প্রোফাইল দেখুন
          </button>
          <button
            type="button"
            onClick={() => navigate('/find-blood')}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
          >
            হোমপেজে যান
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
          <Heart className="w-3.5 h-3.5 fill-red-600" />
          স্বেচ্ছাসেবী রক্তদাতা নিবন্ধন
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          রক্তদাতা হিসেবে যুক্ত হোন
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          আপনার ১ ব্যাগ রক্ত বাঁচাতে পারে একটি মুমূর্ষু প্রাণ। আপনার তথ্য সুরক্ষিত থাকবে।
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6"
      >
        {/* Section 1: Basic details */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            ১. প্রাথমিক তথ্য
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                পূর্ণ নাম (জাতীয় পরিচয়পত্র অনুযায়ী) *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="যেমন: তানভীর আহমেদ"
                className="w-full px-3 py-2 rounded-lg text-xs border border-slate-300 focus:bg-white focus:ring-2 focus:ring-red-600 focus:border-red-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                রক্তের গ্রুপ *
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
                className="w-full px-3 py-2 rounded-lg text-xs font-bold font-mono text-red-700 border border-slate-300 focus:bg-white focus:ring-2 focus:ring-red-600 focus:border-red-600 focus:outline-hidden bg-slate-50"
              >
                {BLOOD_GROUPS.map((g) => (
                  <option key={g} value={g}>{g} গ্রুপ</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                লিঙ্গ *
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full px-3 py-2 rounded-lg text-xs border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden font-medium"
              >
                <option value="male">পুরুষ</option>
                <option value="female">নারী</option>
                <option value="other">অন্যান্য</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                জন্ম তারিখ (বয়স ১৮-৬৫ বছর হতে হবে) *
              </label>
              <input
                type="date"
                required
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs border border-slate-300 focus:bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Contact & Location */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            ২. যোগাযোগ ও অবস্থান
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                মোবাইল নম্বর *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="017XXXXXXXX"
                className="w-full px-3 py-2 rounded-lg text-xs border border-slate-300 focus:bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ইমেইল (ঐচ্ছিক)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-3 py-2 rounded-lg text-xs border border-slate-300 focus:bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                জেলা *
              </label>
              <select
                value={district}
                onChange={(e) => {
                  setDistrict(e.target.value);
                  setUpazila(e.target.value === 'Dhaka' ? 'Dhamrai' : 'Manikganj Sadar');
                }}
                className="w-full px-3 py-2 rounded-lg text-xs border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden font-medium"
              >
                <option value="Dhaka">ঢাকা (ধামরাই ও সাভার)</option>
                <option value="Manikganj">মানিকগঞ্জ</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                উপজেলা *
              </label>
              <select
                value={upazila}
                onChange={(e) => setUpazila(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden font-medium"
              >
                {district === 'Dhaka' ? (
                  <>
                    <option value="Dhamrai">ধামরাই</option>
                    <option value="Savar">সাভার</option>
                  </>
                ) : (
                  <>
                    <option value="Manikganj Sadar">মানিকগঞ্জ সদর</option>
                    <option value="Singair">সিংগাইর</option>
                    <option value="Saturia">সাটুরিয়া</option>
                    <option value="Shivalaya">শিবালয়</option>
                    <option value="Harirampur">হরিরামপুর</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                গ্রাম / মহল্লা / এলাকা
              </label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="যেমন: কুশুরা, আশুলিয়া"
                className="w-full px-3 py-2 rounded-lg text-xs border border-slate-300 focus:bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Availability & History */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            ৩. রক্তদানের প্রস্তুতি ও ইতিহাস
          </h2>

          <div className="space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={availability}
                onChange={(e) => setAvailability(e.target.checked)}
                className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-4 h-4"
              />
              <span className="text-xs font-semibold text-slate-800">
                আমি বর্তমানে সম্পূর্ণ সুস্থ এবং রক্তদানে প্রস্তুত (Available)
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={emergencyAvailable}
                onChange={(e) => setEmergencyAvailable(e.target.checked)}
                className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-4 h-4"
              />
              <span className="text-xs font-semibold text-red-700">
                যেকোনো সময় (রাত/জরুরি মুহূর্তে) রক্তের প্রয়োজনে কল পেতে প্রস্তুত
              </span>
            </label>

            <div className="pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasDonatedBefore}
                  onChange={(e) => setHasDonatedBefore(e.target.checked)}
                  className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-4 h-4"
                />
                <span className="text-xs font-medium text-slate-700">
                  পূর্বে কখনো রক্তদান করেছেন কি?
                </span>
              </label>

              {hasDonatedBefore && (
                <div className="mt-2.5 pl-6">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    সর্বশেষ রক্তদানের তারিখ:
                  </label>
                  <input
                    type="date"
                    value={lastDonationDate}
                    onChange={(e) => setLastDonationDate(e.target.value)}
                    className="px-3 py-1.5 rounded-lg text-xs border border-slate-300 focus:bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden font-mono"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 4: Privacy Settings */}
        <div className="space-y-3 pt-2 border-t border-slate-100 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-red-600" />
            <h2 className="text-xs font-bold text-slate-800">
              ব্যক্তিগত গোপনীয়তা সেটিংস (Privacy Guard)
            </h2>
          </div>

          <div className="space-y-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showPhone}
                onChange={(e) => setShowPhone(e.target.checked)}
                className="rounded border-slate-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-slate-700">
                লগইন করা সাধারণ ব্যবহারকারীদের সরাসরি ফোন নম্বর দেখতে অনুমতি দিন (ডিফল্ট: গোপন)
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowDirectContact}
                onChange={(e) => setAllowDirectContact(e.target.checked)}
                className="rounded border-slate-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-slate-700">
                অ্যাপের মাধ্যমে রক্তের জরুরি অনুরোধ (Notification) পাওয়ার অনুমতি দিন
              </span>
            </label>
          </div>
        </div>

        {/* Terms */}
        <div className="space-y-2 pt-2">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-red-600 focus:ring-red-500 w-4 h-4"
            />
            <span className="text-xs text-slate-600 leading-relaxed">
              আমি অঙ্গীকার করছি যে, রক্তদান সম্পূর্ণ বিনামূল্যে ও স্বেচ্ছাসেবী হবে এবং প্রদত্ত তথ্যাদি সম্পূর্ণ সঠিক।
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-xs border border-red-700/60 flex items-center justify-center gap-2 transition-transform active:scale-98 disabled:opacity-50"
        >
          <Droplets className="w-4 h-4 fill-white" />
          {isSubmitting ? 'নিবন্ধন সম্পন্ন হচ্ছে...' : 'রক্তদাতা হিসেবে নিবন্ধন সম্পন্ন করুন'}
        </button>
      </form>
    </div>
  );
};
