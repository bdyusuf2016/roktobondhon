import React, { useState, useEffect } from 'react';
import {
  Heart,
  Calendar,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Search,
  FileText,
  UserCheck,
  Droplets,
  Layers,
  X,
  Clock,
} from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useDialog } from '../../../contexts/DialogContext';
import { BaseModal } from '../../modals/BaseModal';
import type { Donor, BloodGroup, DonationType } from '../../../types';

interface RecordDonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedDonorId?: string;
  onSuccess?: () => void;
}

export const RecordDonationModal: React.FC<RecordDonationModalProps> = ({
  isOpen,
  onClose,
  preSelectedDonorId,
  onSuccess,
}) => {
  const { donors, hospitals, bloodCamps, bloodRequests, recordDonation } = useData();
  const { currentUser } = useAuth();
  const dialog = useDialog();

  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedDonorId, setSelectedDonorId] = useState<string>('');
  const [donorSearchTerm, setDonorSearchTerm] = useState<string>('');
  const [donationDate, setDonationDate] = useState<string>(todayStr);
  const [hasSpecificDate, setHasSpecificDate] = useState<boolean>(true);
  const [hospital, setHospital] = useState<string>('ধামরাই উপজেলা স্বাস্থ্য কমপ্লেক্স');
  const [location, setLocation] = useState<string>('');
  const [units, setUnits] = useState<number>(1);
  const [donationType, setDonationType] = useState<DonationType>('Whole Blood');
  const [source, setSource] = useState<'manual' | 'camp' | 'request' | 'imported'>('manual');
  const [campId, setCampId] = useState<string>('');
  const [bloodRequestId, setBloodRequestId] = useState<string>('');
  const [notes, setNotes] = useState<string>('সরাসরি এডমিন প্যানেল থেকে সত্যায়িত রক্তদান রেকর্ড।');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [dateError, setDateError] = useState<string | null>(null);

  // Initialize selected donor if provided as prop
  useEffect(() => {
    if (isOpen) {
      if (preSelectedDonorId) {
        const found = donors.find((d) => d.id === preSelectedDonorId || d.donorId === preSelectedDonorId);
        if (found) {
          setSelectedDonorId(found.id);
          setDonorSearchTerm(found.fullName);
        }
      } else {
        setSelectedDonorId('');
        setDonorSearchTerm('');
      }
      setDonationDate(todayStr);
      setHasSpecificDate(true);
      setDateError(null);
    }
  }, [isOpen, preSelectedDonorId, donors]);

  if (!isOpen) return null;

  const selectedDonor = donors.find((d) => d.id === selectedDonorId || d.donorId === selectedDonorId);

  const matchingDonors = donors
    .filter((d) => {
      if (!donorSearchTerm.trim()) return true;
      const q = donorSearchTerm.toLowerCase();
      return (
        d.fullName.toLowerCase().includes(q) ||
        d.donorId.toLowerCase().includes(q) ||
        d.phone.includes(q) ||
        d.bloodGroup.toLowerCase().includes(q)
      );
    })
    .slice(0, 8);

  const handleDateChange = (val: string) => {
    setDonationDate(val);
    if (val && val > todayStr) {
      setDateError('ভবিষ্যতের তারিখ নির্বাচন করা যাবে না। অনুগ্রহ করে আজকের বা অতীতের তারিখ দিন।');
    } else {
      setDateError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDonor) {
      dialog.alert({
        title: 'রক্তদাতা নির্বাচন করুন',
        message: 'অনুগ্রহ করে সার্চ বা তালিকা থেকে একজন রক্তদাতা নির্বাচন করুন।',
        theme: 'warning',
      });
      return;
    }

    if (hasSpecificDate) {
      if (!donationDate) {
        setDateError('রক্তদানের তারিখ প্রদান করুন।');
        return;
      }
      if (donationDate > todayStr) {
        setDateError('ভবিষ্যতের তারিখ গ্রহণযোগ্য নয়।');
        return;
      }
    }

    // Unverified / Suspended Donor check warning
    if (selectedDonor.verificationStatus !== 'verified') {
      const confirmOverride = await dialog.confirm({
        title: 'অযাচাইকৃত রক্তদাতা সতর্কতা',
        message: `রক্তদাতা "${selectedDonor.fullName}" বর্তমানে "${selectedDonor.verificationStatus === 'pending' ? 'যাচাই বাকি (Pending)' : selectedDonor.verificationStatus}" অবস্থায় আছেন। আপনি কি এই রক্তদান রেকর্ডটি সংরক্ষণ করতে চান?`,
        confirmText: 'হ্যাঁ, রেকর্ড সংরক্ষণ করুন',
        confirmTheme: 'warning',
      });
      if (!confirmOverride) return;
    }

    setIsSubmitting(true);
    try {
      await recordDonation({
        donorId: selectedDonor.donorId,
        donorUserId: selectedDonor.userId || undefined,
        donorName: selectedDonor.fullName,
        bloodGroup: selectedDonor.bloodGroup,
        donationDate: hasSpecificDate && donationDate ? donationDate : null,
        hospital: hospital.trim() || 'ধামরাই রক্তদান কেন্দ্র',
        location: location.trim() || hospital.trim(),
        units: Number(units) || 1,
        donationType,
        source,
        campId: campId || undefined,
        bloodRequestId: bloodRequestId || undefined,
        requestId: bloodRequestId || undefined,
        verifiedBy: currentUser?.fullName || 'এডমিন',
        verificationDate: todayStr,
        notes: notes.trim() || undefined,
      });

      dialog.alert({
        title: 'রক্তদান রেকর্ড সম্পন্ন',
        message: `"${selectedDonor.fullName}" (${selectedDonor.bloodGroup})-এর রক্তদানের ডিজিটাল রেকর্ড সফলভাবে সংরক্ষণ করা হয়েছে।`,
        theme: 'success',
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      dialog.alert({
        title: 'রেকর্ড সংরক্ষণ ব্যর্থ',
        message: err.message || 'রক্তদান রেকর্ড সংরক্ষণ করতে সমস্যা হয়েছে।',
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
      title="রক্তদান রেকর্ড লিপিবদ্ধকরণ (Record Blood Donation)"
      subtitle="হাসপাতাল, ক্যাম্প বা জরুরি অনুরোধে সম্পন্ন হওয়া রক্তদানের অফিশিয়াল রেকর্ড তৈরি করুন"
      icon={<Heart className="w-5 h-5 text-red-600" />}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: Donor Search & Selection */}
        <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
            <span>রক্তদাতা নির্বাচন (Donor) *</span>
            {selectedDonor && (
              <span className="text-[11px] font-mono text-red-600 font-bold">
                ID: {selectedDonor.donorId}
              </span>
            )}
          </label>

          {selectedDonor ? (
            <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-red-200 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-black text-sm">
                  {selectedDonor.bloodGroup}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{selectedDonor.fullName}</h4>
                  <p className="text-[11px] text-slate-500">
                    {selectedDonor.phone} • {selectedDonor.upazila}, {selectedDonor.district}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    selectedDonor.verificationStatus === 'verified'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {selectedDonor.verificationStatus === 'verified' ? 'যাচাইকৃত' : 'যাচাই বাকি'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDonorId('');
                    setDonorSearchTerm('');
                  }}
                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                  title="রক্তদাতা পরিবর্তন করুন"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={donorSearchTerm}
                  onChange={(e) => setDonorSearchTerm(e.target.value)}
                  placeholder="নাম, মোবাইল নম্বর, আইডি বা রক্তের গ্রুপ দিয়ে খুঁজুন..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
                  autoFocus
                />
              </div>

              {matchingDonors.length > 0 && (
                <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 bg-white rounded-lg border border-slate-200">
                  {matchingDonors.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        setSelectedDonorId(d.id);
                        setDonorSearchTerm(d.fullName);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-black text-red-600 w-8">{d.bloodGroup}</span>
                        <span className="font-semibold text-slate-800">{d.fullName}</span>
                        <span className="text-[11px] text-slate-400 font-mono">({d.donorId})</span>
                      </div>
                      <span className="text-[11px] text-slate-500">{d.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Unverified status warning */}
          {selectedDonor && selectedDonor.verificationStatus !== 'verified' && (
            <div className="mt-2 p-2.5 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-2 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                এই রক্তদাতা বর্তমানে <strong>Verified নন</strong> (স্ট্যাটাস: {selectedDonor.verificationStatus})। রক্তদান রেকর্ড করলে সিস্টেমে এই তথ্য সংরক্ষিত হবে।
              </span>
            </div>
          )}
        </div>

        {/* Step 2: Date & Blood Group */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              রক্তদানের তারিখ (Donation Date) *
            </label>
            <div className="space-y-1.5">
              <input
                type="date"
                disabled={!hasSpecificDate}
                max={todayStr}
                value={donationDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-xs ${
                  dateError ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-white'
                }`}
              />
              <label className="flex items-center gap-2 text-[11px] text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!hasSpecificDate}
                  onChange={(e) => setHasSpecificDate(!e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500"
                />
                <span>নির্দিষ্ট তারিখ জানা নেই (কাগজের পূর্ববর্তী রেকর্ড)</span>
              </label>
              {dateError && <p className="text-[11px] text-red-600 font-medium">{dateError}</p>}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              রক্তের গ্রুপ (Blood Group)
            </label>
            <input
              type="text"
              readOnly
              value={selectedDonor?.bloodGroup || 'ডোনার সিলেক্ট করুন'}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-100 font-black text-red-600"
            />
          </div>
        </div>

        {/* Step 3: Location / Hospital & Source */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              হাসপাতাল / স্থান (Hospital / Facility)
            </label>
            <select
              value={hospital}
              onChange={(e) => setHospital(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
            >
              <option value="ধামরাই উপজেলা স্বাস্থ্য কমপ্লেক্স">ধামরাই উপজেলা স্বাস্থ্য কমপ্লেক্স</option>
              <option value="এনাম মেডিকেল কলেজ হাসপাতাল, সাভার">এনাম মেডিকেল কলেজ হাসপাতাল, সাভার</option>
              <option value="মানিকগঞ্জ ২৫০ শয্যা বিশিষ্ট জেলা হাসপাতাল">মানিকগঞ্জ জেলা হাসপাতাল</option>
              <option value="কালামপুর গণস্বাস্থ্য কেন্দ্র">কালামপুর গণস্বাস্থ্য কেন্দ্র</option>
              <option value="সাভার সুপার স্পেশালাইজড হাসপাতাল">সাভার সুপার স্পেশালাইজড হাসপাতাল</option>
              <option value="ঢাকা মেডিকেল কলেজ হাসপাতাল">ঢাকা মেডিকেল কলেজ হাসপাতাল</option>
              <option value="অন্যান্য কেন্দ্র">অন্যান্য স্থান/হাসপাতাল</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              রক্তদানের উৎস / খাত (Source)
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
            >
              <option value="manual">সরাসরি / ম্যানুয়াল এন্ট্রি (Direct)</option>
              <option value="camp">রক্তদান ক্যাম্পেইন (Blood Camp)</option>
              <option value="request">জরুরি রক্তের আবেদন (Blood Request)</option>
              <option value="imported">কাগজভিত্তিক তালিকা (Historical/Paper)</option>
            </select>
          </div>
        </div>

        {/* Conditional Camp Selection */}
        {source === 'camp' && (
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              রক্তদান ক্যাম্প নির্বাচন (Select Camp)
            </label>
            <select
              value={campId}
              onChange={(e) => setCampId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
            >
              <option value="">-- ক্যাম্প নির্বাচন করুন (ঐচ্ছিক) --</option>
              {bloodCamps.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.titleBn || c.titleEn} ({c.startDate} - {c.venueAddress || c.upazila})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Conditional Blood Request Selection */}
        {source === 'request' && (
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              রক্তের আবেদন লিংক (Link Blood Request)
            </label>
            <select
              value={bloodRequestId}
              onChange={(e) => setBloodRequestId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
            >
              <option value="">-- রক্তের আবেদন নির্বাচন করুন (ঐচ্ছিক) --</option>
              {bloodRequests.slice(0, 15).map((r) => (
                <option key={r.id} value={r.requestId || r.id}>
                  {r.requestId}: {r.patientName} ({r.bloodGroup}, {r.hospital})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Step 4: Units & Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              পরিমাণ (Units / Bags)
            </label>
            <input
              type="number"
              min={1}
              max={4}
              value={units}
              onChange={(e) => setUnits(parseInt(e.target.value, 10) || 1)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              রক্তদানের ধরন (Donation Type)
            </label>
            <select
              value={donationType}
              onChange={(e) => setDonationType(e.target.value as DonationType)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
            >
              <option value="Whole Blood">হোল ব্লাড (Whole Blood)</option>
              <option value="Platelets">প্লাটিলেট (Platelets)</option>
              <option value="Plasma">প্লাজমা (Plasma)</option>
              <option value="Double Red Cells">ডাবল রেড সেলস</option>
            </select>
          </div>
        </div>

        {/* Step 5: Notes */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            মন্তব্য / সত্যায়ন নোট (Notes / Remarks)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="রক্তদান সংক্রান্ত অতিরিক্ত তথ্য বা রেফারেন্স..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-600 transition-colors"
          >
            বাতিল
          </button>
          <button
            type="submit"
            disabled={isSubmitting || Boolean(dateError) || !selectedDonor}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <span>সংরক্ষণ হচ্ছে...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>রক্তদান রেকর্ড সংরক্ষণ করুন</span>
              </>
            )}
          </button>
        </div>
      </form>
    </BaseModal>
  );
};
