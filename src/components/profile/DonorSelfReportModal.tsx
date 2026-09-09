import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  Calendar,
  Building2,
  AlertTriangle,
  CheckCircle2,
  FileText,
  MapPin,
  Layers,
  X,
  Loader2,
  Sparkles,
  Info,
  UserCheck,
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useDialog } from '../../contexts/DialogContext';
import { BaseModal } from '../modals/BaseModal';
import type { Donor, DonationSubmission, BloodGroup, DonationType } from '../../types';
import { checkDuplicateDonation } from '../../services/donationSubmissionService';

interface DonorSelfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  donor?: Donor | null;
  editingSubmission?: DonationSubmission | null;
  initialSubmission?: DonationSubmission | null;
  onSuccess?: () => void;
}

export const DonorSelfReportModal: React.FC<DonorSelfReportModalProps> = ({
  isOpen,
  onClose,
  donor,
  editingSubmission,
  initialSubmission,
  onSuccess,
}) => {
  const {
    donors,
    bloodCamps,
    bloodRequests,
    donations,
    donationSubmissions,
    submitDonationReport,
    updateDonationSubmission,
  } = useData();
  const { currentUser } = useAuth();
  const dialog = useDialog();

  const effectiveSubmission = editingSubmission || initialSubmission || null;

  // Resolve donor safely from props or contexts
  const effectiveDonor =
    donor ||
    donors.find(
      (d) =>
        (currentUser?.id && d.userId === currentUser.id) ||
        (currentUser?.email && d.email && d.email.toLowerCase() === currentUser.email.toLowerCase()) ||
        (currentUser?.phone && d.phone === currentUser.phone)
    ) ||
    null;

  const todayStr = new Date().toISOString().split('T')[0];

  const [donationDate, setDonationDate] = useState<string>(todayStr);
  const [hospital, setHospital] = useState<string>('ধামরাই উপজেলা স্বাস্থ্য কমপ্লেক্স');
  const [location, setLocation] = useState<string>('ধামরাই, ঢাকা');
  const [campId, setCampId] = useState<string>('');
  const [bloodRequestId, setBloodRequestId] = useState<string>('');
  const [units, setUnits] = useState<number>(1);
  const [donationType, setDonationType] = useState<DonationType>('Whole Blood');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [dateError, setDateError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (effectiveSubmission) {
        setDonationDate(effectiveSubmission.donationDate || todayStr);
        setHospital(effectiveSubmission.hospital || 'ধামরাই উপজেলা স্বাস্থ্য কমপ্লেক্স');
        setLocation(effectiveSubmission.location || 'ধামরাই, ঢাকা');
        setCampId(effectiveSubmission.campId || '');
        setBloodRequestId(effectiveSubmission.bloodRequestId || '');
        setUnits(effectiveSubmission.units || 1);
        setDonationType(effectiveSubmission.donationType || 'Whole Blood');
        setNotes(effectiveSubmission.notes || '');
      } else {
        setDonationDate(todayStr);
        setHospital('ধামরাই উপজেলা স্বাস্থ্য কমপ্লেক্স');
        setLocation('ধামরাই, ঢাকা');
        setCampId('');
        setBloodRequestId('');
        setUnits(1);
        setDonationType('Whole Blood');
        setNotes('');
      }
      setDateError(null);
    }
  }, [isOpen, effectiveSubmission, todayStr]);

  if (!isOpen) return null;

  // Safe fallback if user has no donor profile yet
  if (!effectiveDonor) {
    return (
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title="রক্তদানের তথ্য অবহিতকরণ"
        icon={<Heart className="w-5 h-5 text-red-600" />}
        size="md"
      >
        <div className="p-6 text-center space-y-4">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200 shadow-xs">
            <UserCheck className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">রক্তদাতা প্রোফাইল আবশ্যক</h3>
          <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
            রক্তদানের তথ্য জমা দিতে অনুগ্রহ করে প্রথমে রক্তদাতা হিসেবে আপনার প্রোফাইল নিবন্ধন বা সম্পূর্ণ করুন।
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
            >
              বন্ধ করুন
            </button>
            <Link
              to="/become-donor"
              onClick={onClose}
              className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 shadow-xs border border-red-700/60 inline-flex items-center gap-1.5"
            >
              রক্তদাতা হিসেবে নিবন্ধন করুন
            </Link>
          </div>
        </div>
      </BaseModal>
    );
  }

  const handleDateChange = (val: string) => {
    setDonationDate(val);
    if (!val) {
      setDateError('রক্তদানের তারিখ প্রদান করা আবশ্যক।');
    } else if (val > todayStr) {
      setDateError('ভবিষ্যতের তারিখ নির্বাচন করা যাবে না। অনুগ্রহ করে আজকের বা অতীতের তারিখ দিন।');
    } else {
      setDateError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!donationDate) {
      setDateError('রক্তদানের তারিখ নির্বাচন করুন।');
      return;
    }

    if (donationDate > todayStr) {
      setDateError('ভবিষ্যতের তারিখ গ্রহণযোগ্য নয়।');
      return;
    }

    // Client duplicate check
    const dup = checkDuplicateDonation(
      effectiveDonor.donorId,
      effectiveDonor.userId,
      donationDate,
      donations,
      donationSubmissions,
      effectiveSubmission?.id
    );

    if (dup.isDuplicate) {
      dialog.alert({
        title: 'ডুপ্লিকেট রক্তদান এন্ট্রি',
        message: dup.reason || 'এই তারিখের জন্য আপনার একটি রক্তদান রেকর্ড বা রিপোর্ট ইতোমধ্যে বিদ্যমান।',
        theme: 'warning',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (effectiveSubmission) {
        await updateDonationSubmission(effectiveSubmission.id, {
          donationDate,
          hospital: hospital.trim() || undefined,
          location: location.trim() || undefined,
          campId: campId || undefined,
          bloodRequestId: bloodRequestId || undefined,
          units,
          donationType,
          notes: notes.trim() || undefined,
        });

        dialog.alert({
          title: 'রিপোর্ট হালনাগাদ সফল',
          message: 'আপনার রক্তদানের তথ্য সফলভাবে হালনাগাদ করা হয়েছে। এডমিন প্যানেল এটি পুনরায় পর্যালোচনা করবে।',
          theme: 'success',
        });
      } else {
        await submitDonationReport({
          donorId: effectiveDonor.donorId,
          donorUserId: effectiveDonor.userId || effectiveDonor.id,
          donorName: effectiveDonor.fullName,
          bloodGroup: effectiveDonor.bloodGroup,
          donationDate,
          hospital: hospital.trim() || undefined,
          location: location.trim() || undefined,
          campId: campId || undefined,
          bloodRequestId: bloodRequestId || undefined,
          units,
          donationType,
          notes: notes.trim() || undefined,
        });

        dialog.alert({
          title: 'রক্তদানের তথ্য জমা হয়েছে',
          message: 'আপনার রক্তদানের তথ্যটি এডমিন/মডারেটরের যাচাইয়ের জন্য প্রেরণ করা হয়েছে। অনুমোদিত হলে এটি স্বয়ংক্রিয়ভাবে আপনার প্রোফাইলে যুক্ত হবে।',
          theme: 'success',
        });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      dialog.alert({
        title: 'জমা দেওয়া ব্যর্থ হয়েছে',
        message: err.message || 'রক্তদানের তথ্য সংরক্ষণ করতে সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।',
        theme: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={effectiveSubmission ? 'রক্তদানের তথ্য হালনাগাদ করুন' : 'আমার রক্তদানের তথ্য জানাই'}
      icon={<Heart className="w-5 h-5 text-red-600" />}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
        {/* Info Banner */}
        <div className="p-3 bg-red-50/70 border border-red-200/80 rounded-xl flex items-start gap-2 text-[11px] text-red-900">
          <Info className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">স্বেচ্ছায় রক্তদানের তথ্য অবহিতকরণ</p>
            <p className="text-red-700 leading-relaxed">
              আপনি সম্প্রতি রক্তদান করে থাকলে তারিখ ও স্থানের তথ্য দিন। এডমিন বা মডারেটর যাচাইয়ের পর আপনার প্রোফাইলের মোট রক্তদান সংখ্যা ও সনদপত্র স্বয়ংক্রিয়ভাবে আপডেট হবে।
            </p>
          </div>
        </div>

        {/* Donor Summary (Read-only) */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
              রক্তদাতা প্রোফাইল
            </span>
            <span className="font-bold text-slate-900 text-xs">{effectiveDonor.fullName}</span>
            <span className="text-[11px] text-slate-500 block font-mono">আইডি: {effectiveDonor.donorId}</span>
          </div>
          <div className="text-right">
            <span className="text-xs font-black text-red-700 bg-red-100 border border-red-200 px-2.5 py-1 rounded-lg">
              {effectiveDonor.bloodGroup}
            </span>
          </div>
        </div>

        {/* 1. Donation Date (Required) */}
        <div className="space-y-1">
          <label className="font-bold text-slate-800 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-red-600" />
            <span>রক্তদানের তারিখ *</span>
          </label>
          <input
            type="date"
            max={todayStr}
            value={donationDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className={`w-full px-3 py-2 border rounded-xl text-xs bg-white focus:outline-hidden focus:ring-2 ${
              dateError
                ? 'border-red-500 focus:ring-red-400'
                : 'border-slate-300 focus:ring-red-500'
            }`}
            required
          />
          {dateError && <p className="text-[11px] font-semibold text-red-600">{dateError}</p>}
        </div>

        {/* 2. Hospital / Medical Facility */}
        <div className="space-y-1">
          <label className="font-bold text-slate-800 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span>হাসপাতাল বা প্রতিষ্ঠানের নাম</span>
          </label>
          <input
            type="text"
            value={hospital}
            onChange={(e) => setHospital(e.target.value)}
            placeholder="যেমন: ধামরাই উপজেলা স্বাস্থ্য কমপ্লেক্স / সাভার এনাম মেডিকেল"
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* 3. Location / Address */}
        <div className="space-y-1">
          <label className="font-bold text-slate-800 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-slate-500" />
            <span>স্থান / এলাকা</span>
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="যেমন: কালামপুর, ধামরাই, ঢাকা"
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* 4. Organized Blood Camp (Optional) */}
        {bloodCamps.length > 0 && (
          <div className="space-y-1">
            <label className="font-bold text-slate-800 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>রক্তদান ক্যাম্পের অধীনে দিয়ে থাকলে নির্বাচন করুন (ঐচ্ছিক)</span>
            </label>
            <select
              value={campId}
              onChange={(e) => setCampId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500 cursor-pointer"
            >
              <option value="">-- কোনো নির্দিষ্ট ক্যাম্প নয় (স্বতন্ত্র রক্তদান) --</option>
              {bloodCamps.map((camp) => (
                <option key={camp.id} value={camp.id}>
                  {camp.titleBn || camp.titleEn} ({camp.startDate} - {camp.venueAddress || camp.upazila})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 5. Blood Request Linkage (Optional) */}
        {bloodRequests.length > 0 && (
          <div className="space-y-1">
            <label className="font-bold text-slate-800 flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 text-slate-500" />
              <span>কোনো নির্দিষ্ট রোগীর অনুরোধের প্রেক্ষিতে রক্তদান? (ঐচ্ছিক)</span>
            </label>
            <select
              value={bloodRequestId}
              onChange={(e) => setBloodRequestId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500 cursor-pointer"
            >
              <option value="">-- কোনো নির্দিষ্ট রক্তের আবেদন নয় --</option>
              {bloodRequests.map((req) => (
                <option key={req.id} value={req.id}>
                  [{req.bloodGroup}] {req.patientName || 'রোগী'} - {req.hospital} ({req.requiredDate})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 6. Units & Donation Type */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="font-bold text-slate-800 block">পরিমাণ (ব্যাগ)</label>
            <input
              type="number"
              min={1}
              max={4}
              value={units}
              onChange={(e) => setUnits(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-800 block">রক্তদানের ধরন</label>
            <select
              value={donationType}
              onChange={(e) => setDonationType(e.target.value as DonationType)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500 cursor-pointer"
            >
              <option value="Whole Blood">হোল ব্লাড (Whole Blood)</option>
              <option value="Platelets">প্লাটিলেট (Platelets)</option>
              <option value="Plasma">প্লাজমা (Plasma)</option>
              <option value="RBC">লোহিত রক্তকণিকা (RBC)</option>
            </select>
          </div>
        </div>

        {/* 7. Notes / Remarks */}
        <div className="space-y-1">
          <label className="font-bold text-slate-800 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>অতিরিক্ত মন্তব্য বা তথ্য (ঐচ্ছিক)</span>
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="রক্তদান সংক্রান্ত কোনো বিশেষ তথ্য থাকলে লিখুন..."
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            বাতিল
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-xs border border-red-700/60 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>সংরক্ষণ হচ্ছে...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{effectiveSubmission ? 'হালনাগাদ সম্পন্ন করুন' : 'রিপোর্ট জমা দিন'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </BaseModal>
  );
};
