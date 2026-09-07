import React, { useState } from 'react';
import { Plus, Search, Sparkles, CheckCircle2, Edit2, Trash2, Building2, Phone, MapPin, Activity } from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useDialog } from '../../../contexts/DialogContext';
import { HospitalFormModal } from '../../modals';
import type { Hospital, HospitalCategory } from '../../../types';

export const AdminHospitalsTab: React.FC = () => {
  const { hospitals, addHospital, updateHospital, deleteHospital, verifyHospital, hasPermission } = useData();
  const { currentUser } = useAuth();
  const dialog = useDialog();

  const canManageHospitals = hasPermission(currentUser?.role || 'admin', 'manage_hospitals');

  const [hospitalSearch, setHospitalSearch] = useState('');
  const [hospitalAreaFilter, setHospitalAreaFilter] = useState('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [showHospitalModal, setShowHospitalModal] = useState(false);
  const [selectedHospitalForEdit, setSelectedHospitalForEdit] = useState<Hospital | null>(null);

  const categories: { key: string; label: string }[] = [
    { key: 'all', label: 'সকল ক্যাটাগরি' },
    { key: 'government', label: 'সরকারি' },
    { key: 'medical_college', label: 'মেডিকেল কলেজ' },
    { key: 'private', label: 'বেসরকারি' },
    { key: 'blood_bank', label: 'ব্লাড ব্যাংক' },
  ];

  const filteredHospitals = hospitals.filter((h) => {
    if (selectedCategoryFilter !== 'all' && h.category !== selectedCategoryFilter) {
      return false;
    }
    if (hospitalAreaFilter === 'unverified') {
      if (!h.isCommunityAdded && h.verificationStatus !== 'unverified') return false;
    } else if (hospitalAreaFilter === 'Kalampur') {
      if (!h.address.includes('কালামপুর') && !h.nameBn.includes('কালামপুর') && !h.id.includes('klm')) return false;
    } else if (hospitalAreaFilter !== 'all') {
      if (h.upazila !== hospitalAreaFilter && h.district !== hospitalAreaFilter) return false;
    }
    if (hospitalSearch.trim()) {
      const q = hospitalSearch.toLowerCase();
      return (
        h.nameBn.toLowerCase().includes(q) ||
        h.nameEn.toLowerCase().includes(q) ||
        h.address.toLowerCase().includes(q) ||
        h.upazila.toLowerCase().includes(q) ||
        h.hotline.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Metrics summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">মোট স্বাস্থ্যকেন্দ্র</span>
          <span className="text-2xl font-black text-slate-900 block mt-1 tracking-tight">{hospitals.length}</span>
          <span className="text-[10px] text-slate-500">সরকারি ও বেসরকারি ডিরেক্টরি</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">ব্লাড ব্যাংক ও ল্যাব</span>
          <span className="text-2xl font-black text-red-600 block mt-1 tracking-tight">{hospitals.filter((h) => h.hasBloodBank).length}</span>
          <span className="text-[10px] text-slate-500">রক্ত পরিসঞ্চালন সুবিধা</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">আইসিইউ (ICU)</span>
          <span className="text-2xl font-black text-blue-600 block mt-1 tracking-tight">{hospitals.filter((h) => h.hasICU).length}</span>
          <span className="text-[10px] text-slate-500">ইনটেনসিভ কেয়ার ইউনিট</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">অনিবন্ধিত / পেন্ডিং</span>
          <span className="text-2xl font-black text-amber-600 block mt-1 tracking-tight">
            {hospitals.filter((h) => h.isCommunityAdded || h.verificationStatus === 'unverified').length}
          </span>
          <span className="text-[10px] text-slate-500">কমিউনিটি কর্তৃক যুক্ত</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              হাসপাতাল ও ব্লাড ব্যাংক ব্যবস্থাপনা ডিরেক্টরি
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ধামরাই, কালামপুর, সাভার ও মানিকগঞ্জের স্বাস্থ্যসেবা কেন্দ্রসমূহের তালিকা ও তথ্য নিয়ন্ত্রণ
            </p>
          </div>
          {canManageHospitals && (
            <button
              type="button"
              onClick={() => {
                setSelectedHospitalForEdit(null);
                setShowHospitalModal(true);
              }}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs border border-red-700/60 transition-colors"
            >
              <Plus className="w-4 h-4" />
              নতুন হাসপাতাল যোগ করুন
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          {categories.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedCategoryFilter(cat.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedCategoryFilter === cat.key
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Filter and Search */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={hospitalSearch}
              onChange={(e) => setHospitalSearch(e.target.value)}
              placeholder="হাসপাতালের নাম, উপজেলা, ফোন বা ঠিকানা দিয়ে অনুসন্ধান..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs"
            />
          </div>
          <select
            value={hospitalAreaFilter}
            onChange={(e) => setHospitalAreaFilter(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 font-medium"
          >
            <option value="all">সকল এলাকা ({hospitals.length})</option>
            <option value="Kalampur">কালামপুর বাজার</option>
            <option value="Dhamrai">ধামরাই উপজেলা</option>
            <option value="Savar">সাভার উপজেলা</option>
            <option value="Manikganj">মানিকগঞ্জ জেলা</option>
            <option value="unverified">শুধুমাত্র অনিবন্ধিত/পেন্ডিং</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-y border-slate-200 text-slate-600">
              <tr>
                <th className="py-2.5 px-3 font-semibold">হাসপাতালের নাম</th>
                <th className="py-2.5 px-3 font-semibold">ক্যাটাগরি</th>
                <th className="py-2.5 px-3 font-semibold">এলাকা / উপজেলা</th>
                <th className="py-2.5 px-3 font-semibold">যোগাযোগ</th>
                <th className="py-2.5 px-3 font-semibold">সুবিধাসমূহ</th>
                {canManageHospitals && <th className="py-2.5 px-3 font-semibold text-right">অ্যাকশন</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHospitals.map((h) => {
                const isUnverified = h.isCommunityAdded || h.verificationStatus === 'unverified';
                return (
                  <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{h.nameBn}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{h.nameEn}</div>
                      {isUnverified && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-900 font-bold border border-amber-300">
                          <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                          অনিবন্ধিত এন্ট্রি
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-slate-50 text-slate-700 border-slate-200">
                        {h.category === 'government'
                          ? 'সরকারি'
                          : h.category === 'medical_college'
                          ? 'মেডিকেল কলেজ'
                          : h.category === 'blood_bank'
                          ? 'ব্লাড ব্যাংক'
                          : 'বেসরকারি'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      <div>{h.upazila}, {h.district}</div>
                      <div className="text-[10px] text-slate-400 max-w-xs truncate">{h.address}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700">
                      <a href={`tel:${h.hotline}`} className="hover:text-red-700 hover:underline">
                        📞 {h.hotline}
                      </a>
                      {h.ambulancePhone && (
                        <div className="text-red-600 text-[10px]">
                          <a href={`tel:${h.ambulancePhone}`} className="hover:underline">
                            🚑 {h.ambulancePhone}
                          </a>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        {h.hasBloodBank && (
                          <span className="px-1.5 py-0.5 rounded-sm bg-red-50 text-red-700 text-[10px] font-bold border border-red-200">
                            ব্লাড ব্যাংক
                          </span>
                        )}
                        {h.hasICU && (
                          <span className="px-1.5 py-0.5 rounded-sm bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                            ICU
                          </span>
                        )}
                        {h.isOpen24Hours && (
                          <span className="px-1.5 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
                            ২৪/৭
                          </span>
                        )}
                      </div>
                    </td>
                    {canManageHospitals && (
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isUnverified && (
                            <button
                              type="button"
                              onClick={async () => {
                                await verifyHospital(h.id);
                                dialog.alert({
                                  title: 'যাচাইকৃত হয়েছে',
                                  message: `"${h.nameBn}" স্থায়ীভাবে অনুমোদন করা হয়েছে।`,
                                  theme: 'success',
                                });
                              }}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg border border-emerald-200 flex items-center gap-1"
                              title="অনুমোদন করুন"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              ভেরিফাই
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedHospitalForEdit(h);
                              setShowHospitalModal(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-slate-200"
                            title="তথ্য এডিট করুন"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const ok = await dialog.confirm({
                                title: 'হাসপাতাল মুছে ফেলবেন?',
                                message: `"${h.nameBn}" ডিরেক্টরি থেকে মুছে ফেলতে চান?`,
                                confirmText: 'হ্যাঁ, মুছুন',
                                confirmTheme: 'danger',
                              });
                              if (ok) {
                                await deleteHospital(h.id);
                                dialog.alert({
                                  title: 'মুছে ফেলা হয়েছে',
                                  message: 'হাসপাতালটি সফলভাবে অপসারণ করা হয়েছে।',
                                  theme: 'success',
                                });
                              }
                            }}
                            className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg border border-slate-200"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hospital Form Modal */}
      <HospitalFormModal
        isOpen={showHospitalModal}
        onClose={() => {
          setShowHospitalModal(false);
          setSelectedHospitalForEdit(null);
        }}
        hospitalToEdit={selectedHospitalForEdit}
        onSave={async (data) => {
          if (selectedHospitalForEdit) {
            await updateHospital(selectedHospitalForEdit.id, data);
            dialog.alert({
              title: 'তথ্য আপডেট সফল',
              message: `"${data.nameBn}" তথ্য সফলভাবে হালনাগাদ করা হয়েছে।`,
              theme: 'success',
            });
          } else {
            await addHospital(data);
            dialog.alert({
              title: 'হাসপাতাল যোগ হয়েছে',
              message: `"${data.nameBn}" সফলভাবে হাসপাতাল ডিরেক্টরিতে যুক্ত করা হয়েছে।`,
              theme: 'success',
            });
          }
        }}
      />
    </div>
  );
};
