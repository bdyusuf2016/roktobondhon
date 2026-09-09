import React, { useState } from 'react';
import {
  Plus,
  Search,
  Award,
  Droplets,
  Building2,
  Calendar,
  CheckCircle2,
  Users,
  ShieldCheck,
  Filter,
  FileText,
  Trash2,
} from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useDialog } from '../../../contexts/DialogContext';
import { BaseModal } from '../../modals/BaseModal';
import type { BloodGroup, DonationType, Donor } from '../../../types';

export const AdminDonationsTab: React.FC = () => {
  const { donations, donors, hospitals, recordDonation, deleteDonation, hasPermission } = useData();
  const { currentUser } = useAuth();
  const dialog = useDialog();

  const isSuperAdminOrAdmin =
    currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  const canRecordDonation = hasPermission(currentUser?.role || 'admin', 'record_donation');

  const [searchTerm, setSearchTerm] = useState('');
  const [bloodGroupFilter, setBloodGroupFilter] = useState<string>('all');
  const [hospitalFilter, setHospitalFilter] = useState<string>('all');

  // Add Donation Modal
  const [showAddDonationModal, setShowAddDonationModal] = useState(false);
  const [selectedDonorId, setSelectedDonorId] = useState('');
  const [donorSearchQuery, setDonorSearchQuery] = useState('');
  const [donationHospital, setDonationHospital] = useState('ধামরাই উপজেলা স্বাস্থ্য কমপ্লেক্স');
  const [donationDate, setDonationDate] = useState(new Date().toISOString().split('T')[0]);
  const [hasSpecificDate, setHasSpecificDate] = useState(true);
  const [donationUnits, setDonationUnits] = useState(1);
  const [donationType, setDonationType] = useState<DonationType>('Whole Blood');
  const [donationNotes, setDonationNotes] = useState('সরাসরি এডমিন প্যানেল থেকে সত্যায়িত রক্তদান রেকর্ড।');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Metrics
  const totalDonations = donations.length;
  const totalUnits = donations.reduce((sum, d) => sum + d.units, 0);
  const wholeBloodCount = donations.filter((d) => d.donationType === 'Whole Blood' || !d.donationType).length;
  const uniqueDonorsCount = new Set(donations.map((d) => d.donorId)).size;

  const handleCreateDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDonorId) {
      dialog.alert({
        title: 'রক্তদাতা নির্বাচন করুন',
        message: 'অনুগ্রহ করে তালিকা থেকে রক্তদাতা নির্বাচন করুন।',
        theme: 'warning',
      });
      return;
    }

    const donor = donors.find((d) => d.id === selectedDonorId || d.donorId === selectedDonorId);
    if (!donor) {
      dialog.alert({
        title: 'রক্তদাতা পাওয়া যায়নি',
        message: 'সঠিক ডোনার নির্বাচন করুন।',
        theme: 'danger',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await recordDonation({
        donorId: donor.donorId,
        donorUserId: donor.userId,
        donorName: donor.fullName,
        bloodGroup: donor.bloodGroup,
        donationDate: hasSpecificDate && donationDate ? donationDate : null,
        hospital: donationHospital,
        units: donationUnits,
        donationType,
        verifiedBy: currentUser?.fullName || 'এডমিন',
        verificationDate: new Date().toISOString().split('T')[0],
        notes: donationNotes.trim() || undefined,
      });

      setShowAddDonationModal(false);
      setSelectedDonorId('');
      setDonorSearchQuery('');
      setDonationUnits(1);

      dialog.alert({
        title: 'রক্তদান রেকর্ড সফল',
        message: `"${donor.fullName}" (${donor.bloodGroup}) এর সফল রক্তদান রেকর্ড সংরক্ষণ করা হয়েছে।`,
        theme: 'success',
      });
    } catch (err: any) {
      dialog.alert({
        title: 'ব্যর্থ হয়েছে',
        message: err.message || 'রক্তদান রেকর্ড সংরক্ষণ করা যায়নি।',
        theme: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDonation = async (donationId: string) => {
    const confirmed = await dialog.confirm({
      title: 'রক্তদান রেকর্ড মুছে ফেলবেন?',
      message: 'এই রক্তদান রেকর্ডটি স্থায়ীভাবে মুছে ফেলা হবে এবং ডোনারের মোট রক্তদান সংখ্যা স্বয়ংক্রিয়ভাবে আপডেট হবে।',
      theme: 'danger',
      confirmText: 'হ্যাঁ, মুছুন',
      cancelText: 'বাতিল',
    });

    if (!confirmed) return;

    try {
      await deleteDonation(donationId);
      dialog.alert({
        title: 'মুছে ফেলা হয়েছে',
        message: 'রক্তদান রেকর্ডটি সফলভাবে মুছে ফেলা হয়েছে।',
        theme: 'success',
      });
    } catch (err: any) {
      dialog.alert({
        title: 'ব্যর্থ হয়েছে',
        message: err.message || 'রক্তদান রেকর্ড মুছতে সমস্যা হয়েছে।',
        theme: 'danger',
      });
    }
  };

  const filteredDonations = donations.filter((d) => {
    if (bloodGroupFilter !== 'all' && d.bloodGroup !== bloodGroupFilter) return false;
    if (hospitalFilter !== 'all' && !d.hospital.includes(hospitalFilter)) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        d.donorName.toLowerCase().includes(q) ||
        d.donorId.toLowerCase().includes(q) ||
        d.hospital.toLowerCase().includes(q) ||
        d.verifiedBy.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const searchedDonors = donors
    .filter((d) => {
      if (!donorSearchQuery.trim()) return true;
      const q = donorSearchQuery.toLowerCase();
      return (
        d.fullName.toLowerCase().includes(q) ||
        d.donorId.toLowerCase().includes(q) ||
        d.phone.includes(q) ||
        d.bloodGroup.toLowerCase().includes(q)
      );
    })
    .slice(0, 10);

  const selectedDonorObj = donors.find((d) => d.id === selectedDonorId || d.donorId === selectedDonorId);

  return (
    <div className="space-y-6">
      {/* Metrics Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">মোট সফল রক্তদান</span>
          <span className="text-2xl font-black text-slate-900 block mt-1 tracking-tight font-mono">
            {totalDonations} টি
          </span>
          <span className="text-[10px] text-slate-500">সম্পন্ন রক্তদান ইভেন্ট</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">মোট সরবরাহকৃত রক্ত</span>
          <span className="text-2xl font-black text-red-600 block mt-1 tracking-tight font-mono">
            {totalUnits} ব্যাগ
          </span>
          <span className="text-[10px] text-slate-500">সংগৃহীত রক্তের ব্যাগ</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">অংশগ্রহণকারী রক্তদাতা</span>
          <span className="text-2xl font-black text-blue-600 block mt-1 tracking-tight font-mono">
            {uniqueDonorsCount} জন
          </span>
          <span className="text-[10px] text-slate-500">অনন্য স্বেচ্ছাসেবী ডোনার</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">হোল ব্লাড অনুদান</span>
          <span className="text-2xl font-black text-emerald-600 block mt-1 tracking-tight font-mono">
            {wholeBloodCount} টি
          </span>
          <span className="text-[10px] text-slate-500">সম্পূর্ণ রক্তপরিসঞ্চালন</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              সফল রক্তদানের রেজিস্টার ও রেকর্ডস
            </h2>
            <p className="text-xs text-slate-500">
              ধামরাই, সাভার ও মানিকগঞ্জের বিভিন্ন হাসপাতালে সম্পন্ন হওয়া যাচাইকৃত রক্তদানের হিসেব
            </p>
          </div>
          {canRecordDonation && (
            <button
              type="button"
              onClick={() => setShowAddDonationModal(true)}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs border border-red-700/60 transition-colors"
            >
              <Plus className="w-4 h-4" />
              নতুন রক্তদান রেকর্ড লিপিবদ্ধ করুন
            </button>
          )}
        </div>

        {/* Filter and Search */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ডোনারের নাম, আইডি, হাসপাতাল বা যাচাইকারী দিয়ে অনুসন্ধান..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <select
            value={bloodGroupFilter}
            onChange={(e) => setBloodGroupFilter(e.target.value)}
            className="w-full sm:w-36 px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 font-medium"
          >
            <option value="all">সকল রক্তের গ্রুপ</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>

          <select
            value={hospitalFilter}
            onChange={(e) => setHospitalFilter(e.target.value)}
            className="w-full sm:w-44 px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 font-medium"
          >
            <option value="all">সকল হাসপাতাল</option>
            <option value="ধামরাই">ধামরাই উপজেলা</option>
            <option value="এনাম">এনাম মেডিকেল (সাভার)</option>
            <option value="মানিকগঞ্জ">মানিকগঞ্জ সদর</option>
            <option value="কালামপুর">কালামপুর বাজার</option>
          </select>
        </div>

        {/* Donations Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-y border-slate-200 text-slate-600">
              <tr>
                <th className="py-2.5 px-3 font-semibold">তারিখ</th>
                <th className="py-2.5 px-3 font-semibold">ডোনার আইডি</th>
                <th className="py-2.5 px-3 font-semibold">ডোনারের নাম</th>
                <th className="py-2.5 px-3 font-semibold">গ্রুপ</th>
                <th className="py-2.5 px-3 font-semibold">হাসপাতাল</th>
                <th className="py-2.5 px-3 font-semibold">ধরন ও পরিমাণ</th>
                <th className="py-2.5 px-3 font-semibold">যাচাইকারী</th>
                <th className="py-2.5 px-3 font-semibold text-right">স্ট্যাটাস / অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDonations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    কোনো রক্তদান রেকর্ড পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                filteredDonations.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      {d.donationDate ? (
                        <span className="font-mono">{d.donationDate}</span>
                      ) : (
                        <span className="italic text-slate-400">তারিখ উল্লেখ নেই</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{d.donorId}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{d.donorName}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 font-mono">
                        {d.bloodGroup}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">{d.hospital}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-800">{d.units} ব্যাগ</span>
                      <span className="text-[10px] text-slate-400 block">{d.donationType || 'Whole Blood'}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">{d.verifiedBy}</td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap space-x-1.5">
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        সত্যায়িত
                      </span>
                      {isSuperAdminOrAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteDonation(d.id)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer inline-flex"
                          title="রেকর্ড মুছুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Blood Donation Modal */}
      <BaseModal
        isOpen={showAddDonationModal}
        onClose={() => setShowAddDonationModal(false)}
        theme="modern"
        size="lg"
        icon={<Award className="w-5 h-5 text-red-600" />}
        title="নতুন রক্তদান সম্পন্ন রেকর্ড যুক্ত করুন"
        subtitle="সফল রক্তদান লিপিবদ্ধ করলে রক্তদাতার প্রোফাইলে মোট রক্তদান সংখ্যা স্বয়ংক্রিয়ভাবে আপডেট হবে।"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setShowAddDonationModal(false)}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              বাতিল
            </button>
            <button
              type="button"
              onClick={handleCreateDonation}
              disabled={isSubmitting || !selectedDonorId}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors border border-red-700/60 flex items-center gap-1.5 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'রক্তদান রেকর্ড সংরক্ষণ করুন'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleCreateDonation} className="space-y-4 text-xs py-1">
          {/* Donor Search & Selector */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-800">
              রক্তদাতা নির্বাচন করুন (রক্তদাতার নাম, ফোন বা আইডি দিয়ে খুঁজুন) *
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={donorSearchQuery}
                onChange={(e) => setDonorSearchQuery(e.target.value)}
                placeholder="যেমন: আরিফ, 01712..., বা DNR-DHM-001001"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-red-500 bg-slate-50 focus:bg-white"
              />
            </div>

            {/* Donor Suggestions List */}
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
              {searchedDonors.map((donor) => {
                const isSelected = selectedDonorId === donor.id || selectedDonorId === donor.donorId;
                return (
                  <button
                    key={donor.id}
                    type="button"
                    onClick={() => {
                      setSelectedDonorId(donor.donorId || donor.id);
                      setDonorSearchQuery(donor.fullName);
                    }}
                    className={`w-full p-2 text-left flex items-center justify-between transition-colors ${
                      isSelected ? 'bg-red-50 text-red-900 font-bold' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="font-semibold text-slate-900">{donor.fullName}</span>
                      <span className="text-[10px] text-slate-500 font-mono ml-2">({donor.donorId})</span>
                      <span className="text-[10px] text-slate-400 block">{donor.phone} • {donor.upazila}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 font-mono">
                      {donor.bloodGroup}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedDonorObj && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 flex items-center justify-between">
                <div>
                  <span className="font-bold">নির্বাচিত: {selectedDonorObj.fullName}</span>
                  <span className="text-[10px] block text-emerald-700">রক্তের গ্রুপ: {selectedDonorObj.bloodGroup} | বর্তমান অনুদান সংখ্যা: {selectedDonorObj.totalDonations || 0} টি</span>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                হাসপাতাল / স্বাস্থ্যকেন্দ্র *
              </label>
              <input
                type="text"
                required
                value={donationHospital}
                onChange={(e) => setDonationHospital(e.target.value)}
                placeholder="যেমন: ধামরাই উপজেলা স্বাস্থ্য কমপ্লেক্স"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-red-500"
              />
            </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 text-xs">
                রক্তদানের তারিখ (ঐচ্ছিক)
              </label>
              <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!hasSpecificDate}
                  onChange={(e) => setHasSpecificDate(!e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500"
                />
                <span>তারিখ নির্দিষ্ট নয় / পরে জানানো হবে</span>
              </label>
            </div>

            {hasSpecificDate ? (
              <input
                type="date"
                value={donationDate}
                onChange={(e) => setDonationDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-red-500"
              />
            ) : (
              <div className="p-2 bg-slate-100 border border-dashed border-slate-300 rounded-lg text-[11px] text-slate-500 font-mono italic">
                তারিখ উল্লেখ নেই (সরাসরি ডোনারের মোট রক্তদান সংখ্যা ১ বৃদ্ধি পাবে)
              </div>
            )}
          </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                রক্তের পরিমাণ (ব্যাগ) *
              </label>
              <input
                type="number"
                min="1"
                max="4"
                value={donationUnits}
                onChange={(e) => setDonationUnits(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-hidden focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                রক্তদানের ধরণ *
              </label>
              <select
                value={donationType}
                onChange={(e) => setDonationType(e.target.value as DonationType)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-medium focus:outline-hidden focus:ring-1 focus:ring-red-500"
              >
                <option value="Whole Blood">হোল ব্লাড (Whole Blood)</option>
                <option value="Platelets">প্লাটিলেট (Platelets)</option>
                <option value="Plasma">প্লাজমা (Plasma)</option>
                <option value="RBC">লোহিত রক্তকণিকা (RBC)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              যাচাইকারী মন্তব্য বা রেফারেন্স (ঐচ্ছিক)
            </label>
            <input
              type="text"
              value={donationNotes}
              onChange={(e) => setDonationNotes(e.target.value)}
              placeholder="যেমন: রোগীর স্বজনের উপস্থিতিতে সম্পন্ন"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-red-500"
            />
          </div>
        </form>
      </BaseModal>
    </div>
  );
};
