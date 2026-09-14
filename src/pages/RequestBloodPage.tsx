import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  Calendar,
  Clock,
  Droplets,
  Heart,
  MapPin,
  Phone,
  User,
  ShieldAlert,
  Sparkles,
  BellRing,
  ExternalLink,
  X,
  Info,
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useSystemConfig } from '../contexts/SystemConfigContext';
import type { BloodGroup, EmergencyLevel } from '../types';
import { BANGLADESH_DISTRICTS, getUpazilasForDistrict, isDistrictMatch, isUpazilaMatch } from '../data/bangladeshGeoData';
import { isBloodCompatible } from '../services/matchingService';
import { SearchableSelect } from '../components/common/SearchableSelect';
import { DonorCard } from '../components/DonorCard';

const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const RequestBloodPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { createBloodRequest, hospitals, addHospital, donors } = useData();
  const { currentUser } = useAuth();
  const { config } = useSystemConfig();

  const reqConfig = config.bloodRequests;

  const [patientName, setPatientName] = useState('');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O+');
  const [requiredUnits, setRequiredUnits] = useState(reqConfig?.minimumUnits || 1);
  const [requiredDate, setRequiredDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [requiredTime, setRequiredTime] = useState('10:00 AM');
  const [hospital, setHospital] = useState(searchParams.get('hospital') || '');
  const [district, setDistrict] = useState('ঢাকা');
  const [upazila, setUpazila] = useState('ধামরাই');
  const [area, setArea] = useState('');

  const availableUpazilas = useMemo(() => {
    return getUpazilasForDistrict(district);
  }, [district]);
  const [contactPerson, setContactPerson] = useState(currentUser?.fullName || '');
  const [contactNumber, setContactNumber] = useState(currentUser?.phone || '');
  const [relationship, setRelationship] = useState('রোগী নিজেই');
  const [emergencyLevel, setEmergencyLevel] = useState<EmergencyLevel>('URGENT');
  const [notes, setNotes] = useState('');
  const [notifyUpazilaDonors, setNotifyUpazilaDonors] = useState(true);
  const [notifyDistrictDonors, setNotifyDistrictDonors] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Modal state for viewing matched donors directly on page
  const [isDonorsModalOpen, setIsDonorsModalOpen] = useState(false);
  const [modalViewType, setModalViewType] = useState<'exact' | 'compatible'>('exact');

  // 1. Array of ready nearby donors of the EXACT requested blood group
  const exactNearbyDonors = useMemo(() => {
    return donors.filter((d) => {
      if (!d.availability) return false;
      if (d.bloodGroup.trim().toUpperCase() !== bloodGroup.trim().toUpperCase()) return false;

      const sameDist = isDistrictMatch(d.district, district);
      const sameUpa = isUpazilaMatch(d.upazila, upazila);

      if (notifyDistrictDonors) {
        return sameDist;
      }

      if (notifyUpazilaDonors) {
        return sameDist && (sameUpa || !upazila);
      }

      return false;
    });
  }, [donors, bloodGroup, district, upazila, notifyDistrictDonors, notifyUpazilaDonors]);

  // 2. Array of ready nearby alternative compatible donors (strictly EXCLUDING exact requested group)
  const alternativeNearbyDonors = useMemo(() => {
    return donors.filter((d) => {
      if (!d.availability) return false;
      // Strictly alternative groups only, never mix with exact group
      if (d.bloodGroup.trim().toUpperCase() === bloodGroup.trim().toUpperCase()) return false;
      if (!isBloodCompatible(bloodGroup, d.bloodGroup)) return false;

      const sameDist = isDistrictMatch(d.district, district);
      const sameUpa = isUpazilaMatch(d.upazila, upazila);

      if (notifyDistrictDonors) {
        return sameDist;
      }

      if (notifyUpazilaDonors) {
        return sameDist && (sameUpa || !upazila);
      }

      return false;
    });
  }, [donors, bloodGroup, district, upazila, notifyDistrictDonors, notifyUpazilaDonors]);

  const exactNearbyDonorsCount = exactNearbyDonors.length;
  const alternativeNearbyDonorsCount = alternativeNearbyDonors.length;
  const displayedModalDonors = modalViewType === 'exact' ? exactNearbyDonors : alternativeNearbyDonors;

  // Generate direct search URLs for FindBloodPage
  const exactDonorsListUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (bloodGroup) params.set('group', bloodGroup);
    if (district) params.set('district', district);
    if (!notifyDistrictDonors && upazila) {
      params.set('upazila', upazila);
    }
    return `/find-blood?${params.toString()}`;
  }, [bloodGroup, district, upazila, notifyDistrictDonors]);

  const compatibleDonorsListUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (district) params.set('district', district);
    if (!notifyDistrictDonors && upazila) {
      params.set('upazila', upazila);
    }
    return `/find-blood?${params.toString()}`;
  }, [district, upazila, notifyDistrictDonors]);

  // Check if request system is disabled by admin
  const isRequestDisabled = reqConfig?.requestEnabled === false;

  // Check if current hospital input matches any registered hospital
  const trimmedHospital = hospital.trim().toLowerCase();
  const isKnownHospital = useMemo(() => {
    if (!trimmedHospital) return true;
    return hospitals.some(
      (h) =>
        h.nameBn.toLowerCase() === trimmedHospital ||
        h.nameBn.toLowerCase().includes(trimmedHospital) ||
        trimmedHospital.includes(h.nameBn.toLowerCase()) ||
        (h.nameEn && h.nameEn.toLowerCase().includes(trimmedHospital))
    );
  }, [trimmedHospital, hospitals]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (isRequestDisabled && currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin') {
      setErrorMessage('রক্তের নতুন আবেদন গ্রহণ সাময়িকভাবে স্থগিত রাখা হয়েছে। জরুরি সহায়তার জন্য হটলাইনে কল করুন।');
      return;
    }

    if (!patientName.trim()) {
      setErrorMessage('অনুগ্রহ করে রোগীর নাম প্রদান করুন।');
      return;
    }
    if ((reqConfig?.requireHospital ?? true) && !hospital.trim()) {
      setErrorMessage('অনুগ্রহ করে হাসপাতালের নাম প্রদান করুন।');
      return;
    }
    if (!contactNumber.trim() || contactNumber.length < 11) {
      setErrorMessage('অনুগ্রহ করে সঠিক মোবাইল নম্বর প্রদান করুন।');
      return;
    }

    const minUnits = reqConfig?.minimumUnits ?? 1;
    const maxUnits = reqConfig?.maximumUnits ?? 10;
    if (requiredUnits < minUnits || requiredUnits > maxUnits) {
      setErrorMessage(`রক্তের ব্যাগের পরিমাণ ${minUnits} থেকে ${maxUnits} ব্যাগের মধ্যে হতে হবে।`);
      return;
    }

    setIsSubmitting(true);
    try {
      // Auto-register hospital if not existing in directory
      const existingHosp = hospitals.find(
        (h) =>
          h.nameBn.toLowerCase().trim() === hospital.toLowerCase().trim() ||
          h.nameEn?.toLowerCase().trim() === hospital.toLowerCase().trim()
      );

      if (!existingHosp && hospital.trim().length >= 3) {
        try {
          await addHospital({
            nameBn: hospital.trim(),
            nameEn: hospital.trim(),
            category: 'private',
            district,
            upazila,
            address: `${area.trim() ? area.trim() + ', ' : ''}${upazila}, ${district}`,
            hotline: '',
            emergencyPhone: '',
            hasBloodBank: false,
            hasICU: false,
            isOpen24Hours: true,
            isCommunityAdded: true,
            verificationStatus: 'unverified',
            addedBy: currentUser?.fullName || 'কমিউনিটি আবেদন',
            notes: 'রক্তের জরুরি আবেদনকালে স্বয়ংক্রিয়ভাবে খসড়া হিসেবে অন্তর্ভুক্ত হয়েছে। যাচাইকরণ প্রয়োজন।',
          });
        } catch (err) {
          console.warn('Auto hospital addition non-fatal error:', err);
        }
      }

      const expiryHours = reqConfig?.requestExpiryHours || 48;
      const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();

      const created = await createBloodRequest({
        userId: currentUser?.id || 'guest-recipient',
        patientName: patientName.trim(),
        bloodGroup,
        requiredUnits: Number(requiredUnits),
        requiredDate,
        requiredTime,
        hospital: hospital.trim(),
        division: 'Dhaka',
        district,
        upazila,
        area: area.trim() || upazila,
        contactPerson: contactPerson.trim(),
        contactNumber: contactNumber.trim(),
        relationship,
        emergencyLevel,
        notes: notes.trim(),
        organizationId: 'org-roktobondon',
        expiresAt,
        notifyUpazilaDonors,
        notifyDistrictDonors,
      });

      // Redirect immediately to matching engine for this request
      navigate(`/blood-requests/${created.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'রক্তের আবেদন তৈরি করতে সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
          <Droplets className="w-3.5 h-3.5 fill-red-600" />
          জরুরি রক্তের রিকুইজিশন
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          রক্তের জরুরি আবেদন ফর্ম
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          তথ্য জমা দিলে সিস্টেম তাৎক্ষণিকভাবে ধামরাই, সাভার ও মানিকগঞ্জের উপযুক্ত রক্তদাতাদের স্কোরিং করে ম্যাচ করাবে।
        </p>
      </div>

      {isRequestDisabled && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-sm block">অনলাইন আবেদন গ্রহণ সাময়িকভাবে স্থগিত</span>
            <p className="text-amber-800">
              প্ল্যাটফর্ম রক্ষণাবেক্ষণ বা বিশেষ কারণে বর্তমানে অনলাইন ফর্মের মাধ্যমে নতুন আবেদন গ্রহণ বন্ধ রয়েছে। জরুরি রক্তের সহায়তার জন্য আমাদের কেন্দ্রীয় হটলাইনে কল করুন।
            </p>
          </div>
        </div>
      )}

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
        {/* Urgency Level Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
            জরুরি মাত্রা (Emergency Level)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { level: 'CRITICAL' as EmergencyLevel, label: 'ক্রাইসিস / অতি জরুরি', desc: 'আইসিইউ / অপারেশন', bg: 'peer-checked:bg-red-600 peer-checked:text-white peer-checked:border-red-700' },
              { level: 'URGENT' as EmergencyLevel, label: 'খুব জরুরি', desc: 'আজকের মধ্যেই প্রয়োজন', bg: 'peer-checked:bg-amber-600 peer-checked:text-white peer-checked:border-amber-700' },
              { level: 'NORMAL' as EmergencyLevel, label: 'স্বাভাবিক', desc: 'আগামী ১-২ দিন', bg: 'peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-700' },
              { level: 'LOW' as EmergencyLevel, label: 'পরিকল্পিত', desc: 'নিয়মিত থ্যালাসেমিয়া', bg: 'peer-checked:bg-slate-800 peer-checked:text-white peer-checked:border-slate-900' },
            ].map((item) => (
              <label key={item.level} className="relative cursor-pointer">
                <input
                  type="radio"
                  name="emergencyLevel"
                  value={item.level}
                  checked={emergencyLevel === item.level}
                  onChange={() => setEmergencyLevel(item.level)}
                  className="sr-only peer"
                />
                <div
                  className={`p-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-center transition-all ${item.bg}`}
                >
                  <span className="font-bold text-xs block leading-tight">{item.label}</span>
                  <span className="text-[10px] opacity-80 block mt-0.5">{item.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Section 1: Patient & Blood Group */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            ১. রোগী ও রক্তের বিবরণ
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                রোগীর পূর্ণ নাম *
              </label>
              <input
                type="text"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="যেমন: আব্দুর রহিম"
                className="w-full px-3 py-2 rounded-lg text-xs border border-slate-300 focus:bg-white focus:ring-2 focus:ring-red-600 focus:border-red-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                প্রয়োজনীয় রক্তের গ্রুপ *
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                প্রয়োজনীয় পরিমাণ (ব্যাগ/ইউনিট) *
              </label>
              <input
                type="number"
                min="1"
                max="10"
                required
                value={requiredUnits}
                onChange={(e) => setRequiredUnits(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 rounded-lg text-xs border border-slate-300 focus:bg-white focus:ring-2 focus:ring-red-600 focus:border-red-600 focus:outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                রক্তদানের তারিখ *
              </label>
              <input
                type="date"
                required
                value={requiredDate}
                onChange={(e) => setRequiredDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs border border-slate-300 focus:bg-white focus:ring-2 focus:ring-red-600 focus:border-red-600 focus:outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                প্রয়োজনের সম্ভাব্য সময় *
              </label>
              <input
                type="text"
                required
                value={requiredTime}
                onChange={(e) => setRequiredTime(e.target.value)}
                placeholder="যেমন: সকাল ১০:০০ টা"
                className="w-full px-3 py-2 rounded-lg text-xs border border-slate-300 focus:bg-white focus:ring-2 focus:ring-red-600 focus:border-red-600 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Hospital & Location */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            ২. হাসপাতাল ও অবস্থান
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              হাসপাতালের নাম ও ঠিকানা *
            </label>
            <input
              type="text"
              required
              value={hospital}
              onChange={(e) => setHospital(e.target.value)}
              placeholder="হাসপাতালের নাম লিখুন বা তালিকা থেকে নির্বাচন করুন"
              list="hospitals-list"
              className="w-full px-3 py-2 rounded-lg text-xs border border-slate-300 focus:bg-white focus:ring-2 focus:ring-red-600 focus:border-red-600 focus:outline-hidden"
            />
            <datalist id="hospitals-list">
              {hospitals.map((h) => (
                <option key={h.id} value={h.nameBn} />
              ))}
            </datalist>

            {!isKnownHospital && hospital.trim().length >= 3 && (
              <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl flex items-start gap-2 text-xs text-amber-900 animate-in fade-in duration-200">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-950">✨ অনিবন্ধিত হাসপাতাল সনাক্ত হয়েছে:</span>{' '}
                  <span className="text-amber-800">
                    &ldquo;{hospital}&rdquo; বর্তমানে ডিরেক্টরিতে নেই। আবেদনটি সাবমিট করলে এটি <strong>স্বয়ংক্রিয়ভাবে রক্ত দান পরিবার কালামপুরের হাসপাতাল তালিকায়</strong> যুক্ত হয়ে যাবে!
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <SearchableSelect
                label="জেলা *"
                placeholder="জেলা নির্বাচন করুন"
                searchPlaceholder="জেলা সার্চ করুন..."
                value={district}
                onChange={(val) => {
                  setDistrict(val);
                  const upas = getUpazilasForDistrict(val);
                  setUpazila(upas.length > 0 ? upas[0] : '');
                }}
                options={BANGLADESH_DISTRICTS.map((d) => ({
                  value: d.nameBn,
                  label: `${d.nameBn} (${d.nameEn})`,
                  subLabel: d.nameEn,
                }))}
              />
            </div>

            <div>
              <SearchableSelect
                label="উপজেলা / থানা *"
                placeholder={district ? 'উপজেলা নির্বাচন করুন' : 'প্রথমে জেলা নির্বাচন করুন'}
                searchPlaceholder="উপজেলা সার্চ করুন..."
                disabled={!district}
                value={upazila}
                onChange={(val) => setUpazila(val)}
                options={availableUpazilas.map((upa) => ({
                  value: upa,
                  label: upa,
                }))}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                নির্দিষ্ট এলাকা / গ্রাম (ঐচ্ছিক)
              </label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="যেমন: হাসপাতাল রোড, কলেজ মোড়"
                className="w-full px-3 py-2 rounded-lg text-xs border border-slate-300 focus:bg-white focus:ring-2 focus:ring-red-600 focus:border-red-600 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Contact Details */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            ৩. যোগাযোগের বিবরণ
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                যোগাযোগকারীর নাম *
              </label>
              <input
                type="text"
                required
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="যেমন: তানভীর আহমেদ"
                className="w-full px-3 py-2 rounded-lg text-xs border border-slate-300 focus:bg-white focus:ring-2 focus:ring-red-600 focus:border-red-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                যোগাযোগের মোবাইল নম্বর *
              </label>
              <input
                type="tel"
                required
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="017XXXXXXXX"
                className="w-full px-3 py-2 rounded-lg text-xs border border-slate-300 focus:bg-white focus:ring-2 focus:ring-red-600 focus:border-red-600 focus:outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                রোগীর সাথে সম্পর্ক
              </label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-600 focus:border-red-600 focus:outline-hidden font-medium"
              >
                <option value="রোগী নিজেই">রোগী নিজেই</option>
                <option value="বাবা">বাবা</option>
                <option value="মা">মা</option>
                <option value="স্বামী/স্ত্রী">স্বামী/স্ত্রী</option>
                <option value="সন্তান">সন্তান</option>
                <option value="ভাই/বোন">ভাই/বোন</option>
                <option value="আত্মীয়">আত্মীয়</option>
                <option value="বন্ধু">বন্ধু</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              রোগীর সমস্যা / অতিরিক্ত নোট (ঐচ্ছিক)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="অপারেশন বা রোগের বিস্তারিত, কেবিন/ওয়ার্ড নম্বর ইত্যাদি..."
              className="w-full px-3 py-2 rounded-lg text-xs border border-slate-300 focus:bg-white focus:ring-2 focus:ring-red-600 focus:border-red-600 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Section 4: Donor Alert & Notification Preferences */}
        <div className="space-y-3 pt-4 border-t border-slate-100 bg-gradient-to-br from-slate-50 to-red-50/20 p-4 rounded-xl border border-slate-200/90">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-red-100 text-red-600 flex items-center justify-center">
                <BellRing className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                ৪. রক্তদাতা নোটিফিকেশন অ্যালার্ট অপশন
              </h2>
            </div>
            <span className="text-[10px] font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
              তাৎক্ষণিক অ্যালার্ট
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            {/* Option 1: Upazila Targeted Alerts */}
            <label className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200/90 hover:border-red-400 transition-all cursor-pointer shadow-xs">
              <input
                type="checkbox"
                checked={notifyUpazilaDonors}
                onChange={(e) => setNotifyUpazilaDonors(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500 cursor-pointer"
              />
              <div className="text-xs space-y-0.5 select-none">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  📍 নিজ উপজেলা ({upazila || 'নির্বাচিত উপজেলা'})-এর প্রস্তুত রক্তদাতাদের তাৎক্ষণিক অ্যালার্ট পাঠান
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.2 rounded">
                    প্রস্তাবিত
                  </span>
                </span>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  আবেদন সাবমিট হওয়া মাত্রই {upazila || 'উপজেলা'}-এর নিবন্ধিত ও রক্তদানে প্রস্তুত {bloodGroup} গ্রুপের রক্তদাতাদের প্রোফাইলে সরাসরি জরুরি নোটিফিকেশন পৌঁছে যাবে।
                </p>
              </div>
            </label>

            {/* Option 2: Full District Alerts */}
            <label className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200/90 hover:border-red-400 transition-all cursor-pointer shadow-xs">
              <input
                type="checkbox"
                checked={notifyDistrictDonors}
                onChange={(e) => setNotifyDistrictDonors(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500 cursor-pointer"
              />
              <div className="text-xs space-y-0.5 select-none">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  🚨 অতি জরুরি প্রয়োজনে পুরো জেলা ({district || 'নির্বাচিত জেলা'})-এর সকল রক্তদাতাদেরও অ্যালার্ট পাঠান
                </span>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  রোগীর অবস্থা ক্রিটিক্যাল হলে এবং নিজ উপজেলার বাইরেও বিস্তৃত এলাকায় দ্রুত রক্তদাতার সন্ধানের প্রয়োজন হলে এটি সক্রিয় করুন।
                </p>
              </div>
            </label>

            {/* Live Count Indicator */}
            {(notifyUpazilaDonors || notifyDistrictDonors) && (
              <div className="flex items-start sm:items-center justify-between gap-3 px-3.5 py-2.5 bg-red-50 border border-red-200/80 rounded-lg text-xs text-red-900 animate-in fade-in duration-200">
                <div className="flex items-start sm:items-center gap-2.5">
                  <span className="relative flex h-2 w-2 shrink-0 mt-1 sm:mt-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                  </span>
                  <div className="text-[11px] leading-relaxed">
                    {exactNearbyDonorsCount > 0 ? (
                      <>
                        নির্বাচিত এলাকায় আপনার প্রয়োজনীয় <strong>{bloodGroup}</strong> গ্রুপের প্রায়{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setModalViewType('exact');
                            setIsDonorsModalOpen(true);
                          }}
                          title="এই রক্তদাতাদের তালিকা দেখতে ক্লিক করুন"
                          className="inline-flex items-center gap-1 text-red-700 hover:text-red-950 font-mono text-xs font-bold underline decoration-red-400 decoration-2 underline-offset-3 hover:bg-red-100/90 px-1.5 py-0.5 rounded transition-all cursor-pointer group shadow-2xs border border-red-200/70"
                        >
                          <span>{exactNearbyDonorsCount} জন</span>
                          <ExternalLink className="w-3 h-3 text-red-600 group-hover:scale-110 transition-transform" />
                        </button>{' '}
                        প্রস্তুত রক্তদাতা সক্রিয় রয়েছেন
                        {alternativeNearbyDonorsCount > 0 && (
                          <span className="text-slate-600 font-normal">
                            {' '}(এবং জরুরি প্রয়োজনে বিকল্প সামঞ্জস্যপূর্ণ গ্রুপের আরও{' '}
                            <button
                              type="button"
                              onClick={() => {
                                setModalViewType('compatible');
                                setIsDonorsModalOpen(true);
                              }}
                              title="এলাকার বিকল্প সামঞ্জস্যপূর্ণ রক্তদাতাদের তালিকা দেখুন"
                              className="inline-flex items-center gap-0.5 text-slate-800 hover:text-red-700 font-mono text-xs font-semibold underline decoration-slate-400 underline-offset-2 hover:bg-red-100/60 px-1 py-0.2 rounded transition-all cursor-pointer"
                            >
                              <span>{alternativeNearbyDonorsCount} জন</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            </button>{' '}
                            সক্রিয়)
                          </span>
                        )}
                        ।
                      </>
                    ) : alternativeNearbyDonorsCount > 0 ? (
                      <>
                        নির্বাচিত এলাকায় সরাসরি <strong>{bloodGroup}</strong> গ্রুপের কোনো রক্তদাতা এই মুহূর্তে না থাকলেও জরুরি প্রয়োজনে বিকল্প সামঞ্জস্যপূর্ণ গ্রুপের প্রায়{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setModalViewType('compatible');
                            setIsDonorsModalOpen(true);
                          }}
                          title="এলাকার প্রস্তুত রক্তদাতাদের তালিকা দেখুন"
                          className="inline-flex items-center gap-1 text-red-700 hover:text-red-900 font-mono text-xs font-bold underline decoration-red-400 decoration-2 underline-offset-3 hover:bg-red-100/90 px-1.5 py-0.5 rounded transition-all cursor-pointer group shadow-2xs border border-red-200/70"
                        >
                          <span>{alternativeNearbyDonorsCount} জন</span>
                          <ExternalLink className="w-3 h-3 text-red-600 group-hover:scale-110 transition-transform" />
                        </button>{' '}
                        প্রস্তুত রক্তদাতা সক্রিয় রয়েছেন।
                      </>
                    ) : (
                      <>
                        নির্বাচিত এলাকায় এই মুহূর্তে <strong>{bloodGroup}</strong> গ্রুপের কোনো প্রস্তুত রক্তদাতা পাওয়া যায়নি। জরুরি প্রয়োজনে <strong>পুরো জেলা অ্যালার্ট</strong> সক্রিয় করার পরামর্শ দেওয়া হচ্ছে।
                      </>
                    )}
                  </div>
                </div>

                {(exactNearbyDonorsCount > 0 || alternativeNearbyDonorsCount > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setModalViewType(exactNearbyDonorsCount > 0 ? 'exact' : 'compatible');
                      setIsDonorsModalOpen(true);
                    }}
                    className="shrink-0 hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-700 bg-white hover:bg-red-50 border border-red-300 rounded-lg shadow-xs transition-all hover:border-red-400 hover:shadow-sm cursor-pointer"
                  >
                    <span>তালিকা দেখুন</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Verification & Terms */}
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            স্বেচ্ছাসেবী নীতি ও সতর্কবার্তা:
          </p>
          <p>• রক্তদান সম্পূর্ণ মানবিক ও নিঃস্বার্থ; রক্তদানের জন্য কোনো অর্থ লেনদেন করা নিষিদ্ধ।</p>
          <p>• আবেদন যাচাইকরণের পর সংগঠনের ভলান্টিয়ার টিম থেকেও আপনার সাথে যোগাযোগ করা হতে পারে।</p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-xs border border-red-700/60 flex items-center justify-center gap-2 transition-transform active:scale-98 disabled:opacity-50"
        >
          <Droplets className="w-4 h-4 fill-white" />
          {isSubmitting ? 'প্রসেসিং হচ্ছে...' : 'রক্তের আবেদন সাবমিট করুন ও ডোনার খুঁজুন'}
        </button>
      </form>

      {/* Matched Donors Modal */}
      {isDonorsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-red-50/80 via-slate-50 to-white flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-red-600 text-white font-black flex items-center justify-center text-base font-mono shadow-xs">
                    {bloodGroup}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                      <span>প্রস্তুত রক্তদাতা তালিকা</span>
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-mono">
                        {displayedModalDonors.length} জন
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-red-500" />
                      <span>{notifyDistrictDonors ? `পুরো জেলা (${district})` : `${upazila || 'উপজেলা'}, ${district}`}</span>
                    </p>
                  </div>
                </div>

                {/* Tabs inside modal */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setModalViewType('exact')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      modalViewType === 'exact'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    কাঙ্ক্ষিত {bloodGroup} ডোনার ({exactNearbyDonorsCount} জন)
                  </button>
                  {alternativeNearbyDonorsCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setModalViewType('compatible')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        modalViewType === 'compatible'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      বিকল্প সামঞ্জস্যপূর্ণ ডোনার ({alternativeNearbyDonorsCount} জন)
                    </button>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDonorsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Donors Grid */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 bg-slate-50/50">
              {/* Medical Compatibility Clarification Banner */}
              {modalViewType === 'compatible' && (
                <div className="p-3 bg-blue-50/90 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold block text-blue-900">
                      {bloodGroup === 'AB+'
                        ? 'চিকিৎসাগত সামঞ্জস্যতা তথ্য: AB+ রোগী হলো সার্বজনীন গ্রহীতা (Universal Recipient)'
                        : `চিকিৎসাগত সামঞ্জস্যতা তথ্য: ${bloodGroup} রোগীর বিকল্প গ্রুপের ডোনার`}
                    </span>
                    <p className="text-[11px] text-blue-800 leading-relaxed">
                      {bloodGroup === 'AB+'
                        ? 'রক্তবিজ্ঞানের নিয়ম অনুযায়ী AB+ রোগী জরুরি প্রয়োজনে A+, B+, O+, AB+ যেকোনো গ্রুপের রক্ত নিরাপদে গ্রহণ করতে পারেন। কাঙ্ক্ষিত AB+ রক্তের ঘাটতি থাকলে নিচে তালিকাভুক্ত সামঞ্জস্যপূর্ণ রক্তদাতাদের সাথে যোগাযোগ করা যেতে পারে।'
                        : `কাঙ্ক্ষিত ${bloodGroup} রক্ত সময়মতো না পাওয়া গেলে চিকিৎসকের পরামর্শ ও ক্রস-ম্যাচিং সাপেক্ষে সামঞ্জস্যপূর্ণ বিকল্প গ্রুপের রক্ত গ্রহণ করা যায়।`}
                    </p>
                  </div>
                </div>
              )}


              {displayedModalDonors.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {displayedModalDonors.map((donor) => (
                    <DonorCard key={donor.id} donor={donor} />
                  ))}
                </div>
              ) : (
                <div className="p-10 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                  <Droplets className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">
                    এই মুহূর্তে নির্বাচিত এলাকায় কোনো রক্তদাতা সক্রিয় নেই
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    জরুরি প্রয়োজনে পুরো জেলা অ্যালার্ট সক্রিয় করে দেখতে পারেন।
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
              <a
                href={modalViewType === 'exact' ? exactDonorsListUrl : compatibleDonorsListUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 hover:underline"
              >
                <span>রক্তদাতা অনুসন্ধান পেজে বিস্তারিত দেখুন</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={() => setIsDonorsModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
