import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Phone,
  PhoneCall,
  MapPin,
  Search,
  CheckCircle2,
  PlusCircle,
  Clock,
  Droplet,
  Activity,
  Copy,
  Check,
  ExternalLink,
  Shield,
  Ambulance,
  Filter,
  Edit2,
  Trash2,
  Plus,
  Sparkles,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import type { Hospital, HospitalCategory } from '../types';
import { useDialog } from '../contexts/DialogContext';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { HospitalFormModal } from '../components/modals';

export const HospitalDirectoryPage: React.FC = () => {
  const navigate = useNavigate();
  const dialog = useDialog();
  const { hospitals, addHospital, updateHospital, deleteHospital, verifyHospital } = useData();
  const { currentUser } = useAuth();

  const canManage =
    currentUser?.role === 'super_admin' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'moderator';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [bloodBankOnly, setBloodBankOnly] = useState(false);
  const [icuOnly, setIcuOnly] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [hospitalToEdit, setHospitalToEdit] = useState<Hospital | null>(null);

  // Quick unregistered add state
  const [quickName, setQuickName] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickUpazila, setQuickUpazila] = useState('Dhamrai');
  const [isQuickAdding, setIsQuickAdding] = useState(false);

  // Filtered hospitals
  const filteredHospitals = useMemo(() => {
    return hospitals.filter((h) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName =
          h.nameBn.toLowerCase().includes(q) || (h.nameEn && h.nameEn.toLowerCase().includes(q));
        const matchAddress = h.address.toLowerCase().includes(q);
        const matchUpazila = h.upazila.toLowerCase().includes(q);
        if (!matchName && !matchAddress && !matchUpazila) return false;
      }

      // Area filter
      if (selectedArea === 'Kalampur') {
        const isKlm =
          h.address.toLowerCase().includes('কালামপুর') ||
          h.nameBn.toLowerCase().includes('কালামপুর') ||
          h.id.includes('klm');
        if (!isKlm) return false;
      } else if (selectedArea === 'Dhamrai') {
        if (h.upazila !== 'Dhamrai') return false;
      } else if (selectedArea === 'Savar') {
        if (h.upazila !== 'Savar') return false;
      } else if (selectedArea === 'Manikganj') {
        if (h.district !== 'Manikganj') return false;
      } else if (selectedArea === 'Dhaka City') {
        if (h.upazila !== 'Dhaka City') return false;
      }

      // Category
      if (selectedCategory !== 'all' && h.category !== selectedCategory) {
        return false;
      }

      // Features
      if (bloodBankOnly && !h.hasBloodBank) return false;
      if (icuOnly && !h.hasICU) return false;

      return true;
    });
  }, [hospitals, searchQuery, selectedArea, selectedCategory, bloodBankOnly, icuOnly]);

  const handleCopyNumber = (id: string, num: string) => {
    navigator.clipboard?.writeText(num);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
    dialog.alert({
      title: 'হটলাইন নম্বর কপি হয়েছে',
      message: `${num} নম্বরটি আপনার ক্লিপবোর্ডে কপি করা হয়েছে।`,
      theme: 'success',
    });
  };

  const handleSaveHospital = async (data: Omit<Hospital, 'id'>) => {
    if (hospitalToEdit) {
      await updateHospital(hospitalToEdit.id, data);
      dialog.alert({
        title: 'তথ্য আপডেট সফল হয়েছে',
        message: `"${data.nameBn}" হাসপাতালের তথ্য সফলভাবে সংরক্ষণ করা হয়েছে।`,
        theme: 'success',
      });
    } else {
      await addHospital(data);
      dialog.alert({
        title: 'নতুন হাসপাতাল তালিকাভুক্ত হয়েছে',
        message: `"${data.nameBn}" সফলভাবে হাসপাতাল ডিরেক্টরিতে যুক্ত করা হয়েছে।`,
        theme: 'success',
      });
    }
  };

  const handleDeleteHospital = async (h: Hospital) => {
    if (!canManage) return;
    const confirmed = await dialog.confirm({
      title: 'হাসপাতাল মুছে ফেলতে চান?',
      message: `"${h.nameBn}" তালিকা থেকে মুছে ফেলতে চান? এই অ্যাকশনটি অডিট লগে সংরক্ষণ করা হবে।`,
      confirmText: 'হ্যাঁ, মুছে ফেলুন',
      cancelText: 'বাতিল',
      confirmTheme: 'danger',
    });

    if (confirmed) {
      await deleteHospital(h.id);
      dialog.alert({
        title: 'মুছে ফেলা হয়েছে',
        message: `"${h.nameBn}" হাসপাতাল ডিরেক্টরি থেকে সফলভাবে অপসারণ করা হয়েছে।`,
        theme: 'success',
      });
    }
  };

  const handleVerifyHospital = async (h: Hospital) => {
    if (!canManage) return;
    await verifyHospital(h.id);
    dialog.alert({
      title: 'হাসপাতাল যাচাইকৃত হয়েছে',
      message: `"${h.nameBn}" তথ্য পর্যালোচনা করে স্থায়ীভাবে অনুমোদিত হিসেবে চিহ্নিত করা হয়েছে।`,
      theme: 'success',
    });
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim() || !quickPhone.trim()) {
      dialog.alert({
        title: 'তথ্য অসম্পূর্ণ',
        message: 'অনুগ্রহ করে হাসপাতালের নাম ও যোগাযোগ নম্বর প্রদান করুন।',
        theme: 'warning',
      });
      return;
    }

    setIsQuickAdding(true);
    try {
      await addHospital({
        nameBn: quickName.trim(),
        nameEn: quickName.trim(),
        category: 'private',
        district: 'Dhaka',
        upazila: quickUpazila,
        address: `${quickUpazila}, ঢাকা`,
        hotline: quickPhone.trim(),
        hasBloodBank: false,
        hasICU: false,
        isOpen24Hours: true,
        isCommunityAdded: true,
        verificationStatus: 'unverified',
        addedBy: currentUser?.fullName || 'সাধারণ সদস্য',
        notes: 'ব্যবহারকারী কর্তৃক অনিবন্ধিত তালিকা থেকে স্বয়ংক্রিয়ভাবে সংগৃহীত।',
      });

      setQuickName('');
      setQuickPhone('');
      dialog.alert({
        title: 'হাসপাতাল যুক্ত হয়েছে',
        message: `ধন্যবাদ! "${quickName}" সফলভাবে ডিরেক্টরিতে তালিকাভুক্ত হয়েছে। এডমিন প্যানেল থেকে তথ্যটি চূড়ান্ত যাচাই করা হবে।`,
        theme: 'success',
      });
    } catch (err: any) {
      dialog.alert({
        title: 'ত্রুটি হয়েছে',
        message: err.message || 'হাসপাতাল যুক্ত করতে সমস্যা হয়েছে।',
        theme: 'danger',
      });
    } finally {
      setIsQuickAdding(false);
    }
  };

  const getCategoryBadge = (cat: HospitalCategory) => {
    switch (cat) {
      case 'government':
        return {
          label: 'সরকারি হাসপাতাল',
          className: 'bg-blue-50 text-blue-700 border-blue-200',
        };
      case 'medical_college':
        return {
          label: 'মেডিকেল কলেজ হাসপাতাল',
          className: 'bg-purple-50 text-purple-700 border-purple-200',
        };
      case 'blood_bank':
        return {
          label: 'ব্লাড ব্যাংক ও ল্যাব',
          className: 'bg-red-50 text-red-700 border-red-200 font-bold',
        };
      case 'private':
        return {
          label: 'বেসরকারি ক্লিনিক / হাসপাতাল',
          className: 'bg-amber-50 text-amber-800 border-amber-200',
        };
      default:
        return {
          label: 'হাসপাতাল',
          className: 'bg-slate-50 text-slate-700 border-slate-200',
        };
    }
  };

  const communityCount = hospitals.filter((h) => h.isCommunityAdded || h.verificationStatus === 'unverified').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-850 to-red-950 text-white p-6 sm:p-10 shadow-xl border border-slate-800">
        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/30 border border-red-500/40 text-red-200 text-xs font-bold">
              <Building2 className="w-3.5 h-3.5 text-red-400" />
              <span>জরুরি স্বাস্থ্যসেবা নেটওয়ার্ক</span>
            </div>

            {/* Role-based Admin Controls */}
            {canManage ? (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>এডমিন কন্ট্রোল সক্রিয় ({currentUser?.role})</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setHospitalToEdit(null);
                    setIsFormModalOpen(true);
                  }}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>নতুন হাসপাতাল যুক্ত করুন</span>
                </button>
              </div>
            ) : (
              <div className="text-xs text-slate-400">
                ব্যবহারকারী রোল: <span className="font-semibold text-slate-200">{currentUser?.role || 'অতিথি'}</span>
              </div>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            হাসপাতাল ও ব্লাড ব্যাংক ডিরেক্টরি
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
            ধামরাই, সাভার, কালামপুর বাজার, মানিকগঞ্জ ও ঢাকার সরকারি স্বাস্থ্য কমপ্লেক্স, প্রাইভেট হাসপাতাল ও রক্ত পরিসঞ্চালন কেন্দ্রের সার্বক্ষণিক নাম, ঠিকানা, জরুরি হটলাইন ও অ্যাম্বুলেন্স তালিকা।
          </p>

          {/* Quick Metrics */}
          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-semibold">
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-xs">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>মোট {hospitals.length}টি প্রতিষ্ঠান</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-xs">
              <Droplet className="w-4 h-4 text-red-400" />
              <span>{hospitals.filter((h) => h.hasBloodBank).length}টি ব্লাড ব্যাংক</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-xs">
              <Activity className="w-4 h-4 text-blue-400" />
              <span>{hospitals.filter((h) => h.hasICU).length}টি আইসিইউ</span>
            </div>
            {communityCount > 0 && (
              <div className="flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 px-3 py-1.5 rounded-lg backdrop-blur-xs">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>{communityCount}টি স্বয়ংক্রিয়/কমিউনিটি এন্ট্রি</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Container (Mobile friendly: NO horizontal scroll!) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="হাসপাতাল, ব্লাড ব্যাংকের নাম অথবা এলাকা দিয়ে অনুসন্ধান করুন..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-red-600 focus:border-red-600 focus:outline-hidden font-medium"
          />
        </div>

        {/* Region & Location Filter Buttons (Grid on Mobile - NO horizontal scroll) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            এলাকা নির্বাচন করুন:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {[
              { id: 'all', label: 'সকল এলাকা' },
              { id: 'Kalampur', label: 'কালামপুর বাজার' },
              { id: 'Dhamrai', label: 'ধামরাই উপজেলা' },
              { id: 'Savar', label: 'সাভার উপজেলা' },
              { id: 'Manikganj', label: 'মানিকগঞ্জ জেলা' },
              { id: 'Dhaka City', label: 'ঢাকা সেন্ট্রাল' },
            ].map((area) => {
              const isSelected = selectedArea === area.id;

              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => setSelectedArea(area.id)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold text-center transition-all border ${
                    isSelected
                      ? 'bg-red-600 text-white border-red-700 shadow-xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  {area.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Filter Buttons (Grid on Mobile - NO horizontal scroll) */}
        <div className="pt-2 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-700 mb-2">
            প্রতিষ্ঠানের ধরণ:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: 'all', label: 'সকল প্রতিষ্ঠান' },
              { id: 'government', label: 'সরকারি হাসপাতাল' },
              { id: 'medical_college', label: 'মেডিকেল কলেজ' },
              { id: 'blood_bank', label: 'ব্লাড ব্যাংক ও ল্যাব' },
              { id: 'private', label: 'প্রাইভেট ক্লিনিক' },
            ].map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold text-center transition-all border ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-950 shadow-xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Checkbox Feature Filters */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-4 flex-wrap text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={bloodBankOnly}
              onChange={(e) => setBloodBankOnly(e.target.checked)}
              className="rounded-sm text-red-600 focus:ring-red-500 w-4 h-4"
            />
            <span className="font-semibold text-slate-700">শুধুমাত্র ব্লাড ব্যাংক ও ল্যাব</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={icuOnly}
              onChange={(e) => setIcuOnly(e.target.checked)}
              className="rounded-sm text-red-600 focus:ring-red-500 w-4 h-4"
            />
            <span className="font-semibold text-slate-700">শুধুমাত্র আইসিইউ (ICU) সুবিধা</span>
          </label>

          {(selectedArea !== 'all' ||
            selectedCategory !== 'all' ||
            bloodBankOnly ||
            icuOnly ||
            searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedArea('all');
                setSelectedCategory('all');
                setBloodBankOnly(false);
                setIcuOnly(false);
              }}
              className="text-xs text-red-600 font-bold hover:underline ml-auto"
            >
              সব ফিল্টার রিসেট
            </button>
          )}
        </div>
      </div>

      {/* Hospital Cards Grid */}
      {filteredHospitals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredHospitals.map((hospital) => {
            const catBadge = getCategoryBadge(hospital.category);
            const isUnverified =
              hospital.isCommunityAdded || hospital.verificationStatus === 'unverified';

            return (
              <div
                key={hospital.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  {/* Top Badges & Admin Actions */}
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[11px] px-2.5 py-0.5 rounded-full border font-semibold ${catBadge.className}`}
                      >
                        {catBadge.label}
                      </span>

                      {isUnverified && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-300 font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          অনিবন্ধিত থেকে যুক্ত
                        </span>
                      )}

                      {hospital.isOpen24Hours && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-600" />
                          ২৪/৭ জরুরি
                        </span>
                      )}
                      {hospital.hasBloodBank && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200 font-bold flex items-center gap-1">
                          <Droplet className="w-3 h-3 text-red-600" />
                          ব্লাড ব্যাংক
                        </span>
                      )}
                      {hospital.hasICU && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-semibold flex items-center gap-1">
                          <Activity className="w-3 h-3 text-blue-600" />
                          ICU
                        </span>
                      )}
                    </div>

                    {/* Role-based Edit & Delete Buttons */}
                    {canManage && (
                      <div className="flex items-center gap-1">
                        {isUnverified && (
                          <button
                            type="button"
                            onClick={() => handleVerifyHospital(hospital)}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-lg border border-emerald-200 transition-colors flex items-center gap-1"
                            title="যাচাই ও অনুমোদন করুন"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>ভেরিফাই</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setHospitalToEdit(hospital);
                            setIsFormModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-slate-200 hover:border-blue-200 transition-colors"
                          title="হাসপাতালের তথ্য এডিট করুন"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteHospital(hospital)}
                          className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg border border-slate-200 hover:border-red-200 transition-colors"
                          title="হাসপাতাল মুছে ফেলুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Hospital Name & Address */}
                  <div>
                    <h3 className="font-bold text-slate-900 text-base sm:text-lg leading-snug group-hover:text-red-700 transition-colors">
                      {hospital.nameBn}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {hospital.nameEn}
                    </p>
                  </div>

                  <div className="flex items-start gap-2 text-xs text-slate-600">
                    <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{hospital.address}</span>
                  </div>

                  {hospital.notes && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 text-[11px] text-slate-600 leading-relaxed">
                      {hospital.notes}
                    </div>
                  )}
                </div>

                {/* Contact Actions Footer */}
                <div className="pt-4 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${hospital.hotline}`}
                        className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>কল: {hospital.hotline}</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopyNumber(hospital.id, hospital.hotline)}
                        className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                        title="নম্বর কপি করুন"
                      >
                        {copiedId === hospital.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {hospital.ambulancePhone && (
                        <a
                          href={`tel:${hospital.ambulancePhone}`}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors border border-slate-200"
                          title="অ্যাম্বুলেন্স কল করুন"
                        >
                          <Ambulance className="w-3.5 h-3.5 text-red-600" />
                          <span className="hidden sm:inline">অ্যাম্বুলেন্স</span>
                        </a>
                      )}

                      {hospital.mapUrl && (
                        <a
                          href={hospital.mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors border border-slate-200"
                          title="গুগল ম্যাপসে দেখুন"
                        >
                          <MapPin className="w-3.5 h-3.5 text-blue-600" />
                          <span className="hidden sm:inline">ম্যাপস</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Request Blood for this Hospital */}
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/request-blood?hospital=${encodeURIComponent(hospital.nameBn)}`
                      )
                    }
                    className="w-full py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 border border-red-200 transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>এই হাসপাতালে রক্তের আবেদন করুন</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-4">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-base">কোনো হাসপাতাল পাওয়া যায়নি</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              আপনার অনুসন্ধানের শব্দ বা ফিল্টার পরিবর্তন করে পুনরায় চেষ্টা করুন অথবা নিচে আপনার কাঙ্ক্ষিত হাসপাতালটি যুক্ত করুন।
            </p>
          </div>

          {/* Quick Add Missing Hospital Form */}
          <div className="max-w-md mx-auto p-4 bg-red-50/60 border border-red-200/80 rounded-2xl text-left space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-red-800">
              <Sparkles className="w-4 h-4 text-red-600" />
              <span>তালিকায় নেই? এখানে লিখে সরাসরি যুক্ত করুন:</span>
            </div>
            <form onSubmit={handleQuickAdd} className="space-y-2.5">
              <input
                type="text"
                required
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                placeholder="হাসপাতাল বা ডায়াগনস্টিক সেন্টারের নাম লিখুন"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={quickUpazila}
                  onChange={(e) => setQuickUpazila(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                >
                  <option value="Dhamrai">ধামরাই (কালামপুরসহ)</option>
                  <option value="Savar">সাভার</option>
                  <option value="Manikganj Sadar">মানিকগঞ্জ</option>
                  <option value="Dhaka City">ঢাকা সেন্ট্রাল</option>
                </select>
                <input
                  type="tel"
                  required
                  value={quickPhone}
                  onChange={(e) => setQuickPhone(e.target.value)}
                  placeholder="হটলাইন / মোবাইল নম্বর"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                />
              </div>
              <button
                type="submit"
                disabled={isQuickAdding}
                className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isQuickAdding ? 'যুক্ত হচ্ছে...' : 'তালিকায় যুক্ত করুন'}</span>
              </button>
            </form>
          </div>

          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedArea('all');
              setSelectedCategory('all');
              setBloodBankOnly(false);
              setIcuOnly(false);
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
          >
            সব ফিল্টার রিসেট করুন
          </button>
        </div>
      )}

      {/* Hospital Form Modal (For Adding / Editing) */}
      <HospitalFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setHospitalToEdit(null);
        }}
        hospitalToEdit={hospitalToEdit}
        onSave={handleSaveHospital}
      />
    </div>
  );
};
