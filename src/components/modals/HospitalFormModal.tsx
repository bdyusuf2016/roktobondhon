import React, { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { Building2, Phone, MapPin, Ambulance, Activity, ShieldCheck, HeartPulse } from 'lucide-react';
import type { Hospital, HospitalCategory } from '../../types';

interface HospitalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospitalToEdit?: Hospital | null;
  onSave: (data: Omit<Hospital, 'id'>) => Promise<void>;
}

export const HospitalFormModal: React.FC<HospitalFormModalProps> = ({
  isOpen,
  onClose,
  hospitalToEdit,
  onSave,
}) => {
  const isEditing = Boolean(hospitalToEdit);

  const [nameBn, setNameBn] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [category, setCategory] = useState<HospitalCategory>('private');
  const [district, setDistrict] = useState('Dhaka');
  const [upazila, setUpazila] = useState('Dhamrai');
  const [address, setAddress] = useState('');
  const [hotline, setHotline] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [ambulancePhone, setAmbulancePhone] = useState('');
  const [hasBloodBank, setHasBloodBank] = useState(false);
  const [hasICU, setHasICU] = useState(false);
  const [isOpen24Hours, setIsOpen24Hours] = useState(true);
  const [mapUrl, setMapUrl] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (hospitalToEdit) {
      setNameBn(hospitalToEdit.nameBn || '');
      setNameEn(hospitalToEdit.nameEn || '');
      setCategory(hospitalToEdit.category || 'private');
      setDistrict(hospitalToEdit.district || 'Dhaka');
      setUpazila(hospitalToEdit.upazila || 'Dhamrai');
      setAddress(hospitalToEdit.address || '');
      setHotline(hospitalToEdit.hotline || '');
      setEmergencyPhone(hospitalToEdit.emergencyPhone || '');
      setAmbulancePhone(hospitalToEdit.ambulancePhone || '');
      setHasBloodBank(Boolean(hospitalToEdit.hasBloodBank));
      setHasICU(Boolean(hospitalToEdit.hasICU));
      setIsOpen24Hours(hospitalToEdit.isOpen24Hours ?? true);
      setMapUrl(hospitalToEdit.mapUrl || '');
      setNotes(hospitalToEdit.notes || '');
    } else {
      setNameBn('');
      setNameEn('');
      setCategory('private');
      setDistrict('Dhaka');
      setUpazila('Dhamrai');
      setAddress('');
      setHotline('');
      setEmergencyPhone('');
      setAmbulancePhone('');
      setHasBloodBank(false);
      setHasICU(false);
      setIsOpen24Hours(true);
      setMapUrl('');
      setNotes('');
    }
    setErrorMessage('');
  }, [hospitalToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!nameBn.trim()) {
      setErrorMessage('অনুগ্রহ করে হাসপাতালের নাম (বাংলা) প্রদান করুন।');
      return;
    }
    if (!address.trim()) {
      setErrorMessage('অনুগ্রহ করে বিস্তারিত ঠিকানা প্রদান করুন।');
      return;
    }
    if (!hotline.trim()) {
      setErrorMessage('অনুগ্রহ করে জরুরি যোগাযোগ বা হটলাইন নম্বর প্রদান করুন।');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        nameBn: nameBn.trim(),
        nameEn: nameEn.trim() || nameBn.trim(),
        category,
        district,
        upazila,
        address: address.trim(),
        hotline: hotline.trim(),
        emergencyPhone: emergencyPhone.trim() || undefined,
        ambulancePhone: ambulancePhone.trim() || undefined,
        hasBloodBank,
        hasICU,
        isOpen24Hours,
        mapUrl: mapUrl.trim() || undefined,
        notes: notes.trim() || undefined,
        verificationStatus: 'verified',
        isCommunityAdded: hospitalToEdit ? hospitalToEdit.isCommunityAdded : false,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'হাসপাতালের তথ্য সংরক্ষণ করতে ব্যর্থ হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      theme="modern"
      size="xl"
      icon={<Building2 className="w-5 h-5 text-red-600" />}
      title={isEditing ? 'হাসপাতালের তথ্য এডিট করুন' : 'নতুন হাসপাতাল বা ব্লাড ব্যাংক যুক্ত করুন'}
      subtitle="হাসপাতালের সঠিক নাম, যোগাযোগের হটলাইন ও চিকিৎসা সুবিধাসমূহ হালনাগাদ করুন।"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          >
            বাতিল
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : isEditing ? 'তথ্য আপডেট করুন' : 'হাসপাতাল সংরক্ষণ করুন'}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
            {errorMessage}
          </div>
        )}

        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              হাসপাতালের নাম (বাংলা) *
            </label>
            <input
              type="text"
              required
              value={nameBn}
              onChange={(e) => setNameBn(e.target.value)}
              placeholder="যেমন: কালামপুর জেনারেল হাসপাতাল"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              হাসপাতালের নাম (English)
            </label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g. Kalampur General Hospital"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Category & District/Upazila */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ক্যাটাগরি *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as HospitalCategory)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-hidden font-medium"
            >
              <option value="private">বেসরকারি হাসপাতাল / ক্লিনিক</option>
              <option value="government">সরকারি স্বাস্থ্য কেন্দ্র / হাসপাতাল</option>
              <option value="medical_college">মেডিকেল কলেজ ও হাসপাতাল</option>
              <option value="blood_bank">ব্লাড ব্যাংক ও ট্রান্সফিউশন সেন্টার</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              জেলা *
            </label>
            <select
              value={district}
              onChange={(e) => {
                setDistrict(e.target.value);
                if (e.target.value === 'Dhaka') setUpazila('Dhamrai');
                else if (e.target.value === 'Manikganj') setUpazila('Manikganj Sadar');
              }}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-hidden font-medium"
            >
              <option value="Dhaka">ঢাকা জেলা</option>
              <option value="Manikganj">মানিকগঞ্জ জেলা</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              উপজেলা / জোন *
            </label>
            <select
              value={upazila}
              onChange={(e) => setUpazila(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-hidden font-medium"
            >
              {district === 'Dhaka' ? (
                <>
                  <option value="Dhamrai">ধামরাই</option>
                  <option value="Savar">সাভার</option>
                  <option value="Dhaka City">ঢাকা সিটি</option>
                </>
              ) : (
                <>
                  <option value="Manikganj Sadar">মানিকগঞ্জ সদর</option>
                  <option value="Singair">সিংগাইর</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            বিস্তারিত ঠিকানা ও ল্যান্ডমার্ক *
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="যেমন: কালামপুর বাসস্ট্যান্ড মোড়, কালামপুর বাজার, ধামরাই, ঢাকা"
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Phones */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              হটলাইন নম্বর *
            </label>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="tel"
                required
                value={hotline}
                onChange={(e) => setHotline(e.target.value)}
                placeholder="01712xxxxxx"
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              জরুরি বিভাগ নম্বর (ঐচ্ছিক)
            </label>
            <div className="relative">
              <Activity className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="tel"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                placeholder="01925xxxxxx"
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              অ্যাম্বুলেন্স নম্বর (ঐচ্ছিক)
            </label>
            <div className="relative">
              <Ambulance className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="tel"
                value={ambulancePhone}
                onChange={(e) => setAmbulancePhone(e.target.value)}
                placeholder="01819xxxxxx"
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Feature Checkboxes */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <label className="block text-xs font-bold text-slate-700 mb-1">
            চিকিৎসা সুবিধা ও পরিসেবা
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <label className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-red-50 hover:border-red-200 transition-colors">
              <input
                type="checkbox"
                checked={hasBloodBank}
                onChange={(e) => setHasBloodBank(e.target.checked)}
                className="rounded-sm text-red-600 focus:ring-red-500 w-4 h-4"
              />
              <span className="font-semibold text-slate-800">ব্লাড ব্যাংক সুবিধা</span>
            </label>

            <label className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-red-50 hover:border-red-200 transition-colors">
              <input
                type="checkbox"
                checked={hasICU}
                onChange={(e) => setHasICU(e.target.checked)}
                className="rounded-sm text-red-600 focus:ring-red-500 w-4 h-4"
              />
              <span className="font-semibold text-slate-800">আইসিইউ (ICU) সুবিধা</span>
            </label>

            <label className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-red-50 hover:border-red-200 transition-colors">
              <input
                type="checkbox"
                checked={isOpen24Hours}
                onChange={(e) => setIsOpen24Hours(e.target.checked)}
                className="rounded-sm text-red-600 focus:ring-red-500 w-4 h-4"
              />
              <span className="font-semibold text-slate-800">২৪ ঘণ্টা জরুরি খোলা</span>
            </label>
          </div>
        </div>

        {/* Map URL & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              গুগল ম্যাপস লিংক (ঐচ্ছিক)
            </label>
            <input
              type="url"
              value={mapUrl}
              onChange={(e) => setMapUrl(e.target.value)}
              placeholder="https://maps.google.com/?q=..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              বিশেষ তথ্য বা সেবা নোট (ঐচ্ছিক)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="যেমন: নরমাল ডেলিভারি, জরুরি ব্লাড ট্রান্সফিউশন"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-hidden"
            />
          </div>
        </div>
      </form>
    </BaseModal>
  );
};
