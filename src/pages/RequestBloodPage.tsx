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
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useSystemConfig } from '../contexts/SystemConfigContext';
import type { BloodGroup, EmergencyLevel } from '../types';
import { BANGLADESH_DISTRICTS, getUpazilasForDistrict } from '../data/bangladeshGeoData';

const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const RequestBloodPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { createBloodRequest, hospitals, addHospital } = useData();
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
            hotline: contactNumber.trim(),
            emergencyPhone: contactNumber.trim(),
            hasBloodBank: false,
            hasICU: false,
            isOpen24Hours: true,
            isCommunityAdded: true,
            verificationStatus: 'unverified',
            addedBy: currentUser?.fullName || contactPerson || patientName,
            notes: `স্বয়ংক্রিয়ভাবে রক্তের জরুরি আবেদনকারী (${contactPerson || patientName}) কর্তৃক অন্তর্ভুক্ত হয়েছে।`,
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                জেলা *
              </label>
              <select
                value={district}
                onChange={(e) => {
                  const newDist = e.target.value;
                  setDistrict(newDist);
                  const upas = getUpazilasForDistrict(newDist);
                  setUpazila(upas.length > 0 ? upas[0] : '');
                }}
                className="w-full px-3 py-2 rounded-lg text-xs border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-600 focus:border-red-600 focus:outline-hidden font-medium"
              >
                {BANGLADESH_DISTRICTS.map((d) => (
                  <option key={d.id} value={d.nameBn}>
                    {d.nameBn} ({d.nameEn})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                উপজেলা / থানা *
              </label>
              <select
                value={upazila}
                onChange={(e) => setUpazila(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-600 focus:border-red-600 focus:outline-hidden font-medium"
              >
                {availableUpazilas.map((upa) => (
                  <option key={upa} value={upa}>
                    {upa}
                  </option>
                ))}
              </select>
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
    </div>
  );
};
