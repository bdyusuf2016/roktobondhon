import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import type { BloodCamp, BloodGroup } from '../types';
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Target,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Phone,
  Building2,
  Sparkles,
  ChevronRight,
  Heart,
} from 'lucide-react';

const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const BloodCampsPage: React.FC = () => {
  const { bloodCamps, registerForCamp, addBloodCamp, hasPermission } = useData();
  const { currentUser } = useAuth();

  const [filterDistrict, setFilterDistrict] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Registration Modal State
  const [selectedCamp, setSelectedCamp] = useState<BloodCamp | null>(null);
  const [regName, setRegName] = useState(currentUser?.fullName || '');
  const [regPhone, setRegPhone] = useState(currentUser?.phone || '');
  const [regBloodGroup, setRegBloodGroup] = useState<BloodGroup>('A+');
  const [regTime, setRegTime] = useState('সকাল ১০:০০ - ১২:০০');
  const [regSuccess, setRegSuccess] = useState(false);

  // New Camp Modal State (for Volunteers / Admins)
  const [showAddCampModal, setShowAddCampModal] = useState(false);
  const [newCamp, setNewCamp] = useState({
    titleBn: '',
    titleEn: '',
    organizerName: 'রক্ত দান পরিবার কালামপুর স্বেচ্ছাসেবী দল',
    partnerHospital: 'ধামরাই উপজেলা স্বাস্থ্য কমপ্লেক্স',
    division: 'Dhaka',
    district: 'Dhaka',
    upazila: 'Dhamrai',
    venueAddress: '',
    startDate: '',
    endDate: '',
    startTime: '০৯:০০ AM',
    endTime: '০৫:০০ PM',
    targetUnits: 100,
    contactPerson: '',
    contactPhone: '',
    descriptionBn: '',
    status: 'upcoming' as const,
  });

  const canCreateCamp =
    currentUser &&
    (currentUser.role === 'super_admin' ||
      currentUser.role === 'admin' ||
      currentUser.role === 'volunteer' ||
      currentUser.role === 'moderator');

  const filteredCamps = bloodCamps.filter((camp) => {
    if (filterDistrict !== 'all' && camp.district !== filterDistrict) return false;
    if (filterStatus !== 'all' && camp.status !== filterStatus) return false;
    return true;
  });

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCamp) return;

    await registerForCamp({
      campId: selectedCamp.id,
      campTitle: selectedCamp.titleBn,
      donorName: regName,
      phone: regPhone,
      bloodGroup: regBloodGroup,
      preferredTime: regTime,
      userId: currentUser?.id,
    });

    setRegSuccess(true);
    setTimeout(() => {
      setRegSuccess(false);
      setSelectedCamp(null);
    }, 2000);
  };

  const handleCreateCampSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addBloodCamp({
      ...newCamp,
      endDate: newCamp.endDate || newCamp.startDate,
    });
    setShowAddCampModal(false);
    alert('নতুন রক্তদান ক্যাম্প সফলভাবে যুক্ত হয়েছে!');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Header */}
      <div className="relative rounded-3xl bg-gradient-to-r from-red-600 via-rose-700 to-red-800 text-white p-8 md:p-12 shadow-xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs md:text-sm font-semibold text-rose-100">
              <Sparkles className="w-4 h-4" /> রক্তদান ক্যাম্প ও ইভেন্ট ডিরেক্টরি
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              স্বেচ্ছায় রক্তদান ক্যাম্প ও ড্রাইভ
            </h1>
            <p className="text-rose-100 text-sm md:text-base leading-relaxed">
              আপনার এলাকায় অনুষ্ঠিত হতে যাওয়া রক্তদান ক্যাম্পসমূহের সময়সূচি জানুন, অংশগ্রহণ করুন এবং সরাসরি রক্ত দিয়ে জীবন বাঁচান।
            </p>
          </div>

          {canCreateCamp && (
            <button
              onClick={() => setShowAddCampModal(true)}
              className="flex items-center gap-2 px-6 py-3.5 bg-white text-red-700 hover:bg-rose-50 font-bold rounded-2xl shadow-lg transition transform active:scale-95 shrink-0 cursor-pointer text-sm"
            >
              <Plus className="w-5 h-5" />
              নতুন ক্যাম্প যোগ করুন
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> ফিল্টার:
          </span>

          <select
            value={filterDistrict}
            onChange={(e) => setFilterDistrict(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
          >
            <option value="all">সকল জেলা</option>
            <option value="Dhaka">ঢাকা (ধামরাই, সাভার)</option>
            <option value="Manikganj">মানিকগঞ্জ</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
          >
            <option value="all">সকল স্ট্যাটাস</option>
            <option value="upcoming">আসন্ন ক্যাম্প (Upcoming)</option>
            <option value="completed">সম্পন্ন ক্যাম্প (Completed)</option>
          </select>
        </div>

        <div className="text-sm font-semibold text-slate-600">
          মোট ক্যাম্প: <span className="text-red-600 font-bold">{filteredCamps.length}টি</span>
        </div>
      </div>

      {/* Camps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCamps.map((camp) => (
          <div
            key={camp.id}
            className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between"
          >
            <div>
              {/* Card Banner / Status Header */}
              <div className="p-6 bg-gradient-to-br from-slate-900 to-rose-950 text-white relative">
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase ${
                      camp.status === 'upcoming'
                        ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300'
                        : 'bg-slate-500/20 border border-slate-400 text-slate-300'
                    }`}
                  >
                    {camp.status === 'upcoming' ? 'আসন্ন ক্যাম্প' : 'সম্পন্ন হয়েছে'}
                  </span>
                  <span className="text-xs text-rose-200 font-bold flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-amber-400" /> লক্ষ্য: {camp.targetUnits} ব্যাগ
                  </span>
                </div>

                <h3 className="font-black text-lg text-white leading-snug line-clamp-2">
                  {camp.titleBn}
                </h3>
                <p className="text-xs text-rose-200 mt-1 font-medium">{camp.organizerName}</p>
              </div>

              {/* Card Details */}
              <div className="p-6 space-y-4 text-sm text-slate-700">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 font-bold block">{camp.startDate}</strong>
                      <span className="text-xs text-slate-500 font-medium">{camp.startTime} - {camp.endTime}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-800">{camp.venueAddress}</p>
                      <span className="text-xs text-slate-500">{camp.upazila}, {camp.district}</span>
                    </div>
                  </div>

                  {camp.partnerHospital && (
                    <div className="flex items-start gap-2">
                      <Building2 className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span className="text-xs text-slate-600">
                        সহযোগী: <strong>{camp.partnerHospital}</strong>
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  {camp.descriptionBn}
                </p>

                {/* Progress bar or Participant count */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-semibold">
                  <span className="flex items-center gap-1 text-slate-600">
                    <Users className="w-4 h-4 text-red-600" />
                    প্রি-রেজিস্ট্রেশন: <strong>{camp.registeredCount || 0} জন</strong>
                  </span>
                  {camp.status === 'completed' && (
                    <span className="text-emerald-700 font-bold">
                      সংগৃহীত: {camp.collectedUnits || camp.registeredCount} ব্যাগ
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Card Footer Button */}
            <div className="p-6 pt-0">
              {camp.status === 'upcoming' ? (
                <button
                  onClick={() => setSelectedCamp(camp)}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  <Heart className="w-4 h-4 fill-current" />
                  রক্ত দিতে প্রি-রেজিস্ট্রেশন করুন
                </button>
              ) : (
                <div className="w-full py-2.5 bg-slate-100 text-slate-600 font-bold rounded-2xl text-center text-xs flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> ক্যাম্প সম্পন্ন হয়েছে
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Registration Modal */}
      {selectedCamp && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in">
            <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white p-6">
              <h3 className="font-black text-xl text-white">ক্যাম্পে রক্তদান প্রি-রেজিস্ট্রেশন</h3>
              <p className="text-xs text-rose-100 mt-1">{selectedCamp.titleBn}</p>
            </div>

            {regSuccess ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h4 className="text-2xl font-black text-slate-900">রেজিস্ট্রেশন সফল হয়েছে!</h4>
                <p className="text-sm text-slate-600">
                  রক্তদান ক্যাম্পে আসার জন্য আপনাকে ধন্যবাদ। যথা সময়ে নির্ধারিত ভেন্যুতে উপস্থিত হতে অনুরোধ করা হলো।
                </p>
              </div>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">আপনার পুরো নাম *</label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="নাম লিখুন"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">মোবাইল নম্বর *</label>
                  <input
                    type="tel"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">রক্তের গ্রুপ *</label>
                    <select
                      value={regBloodGroup}
                      onChange={(e) => setRegBloodGroup(e.target.value as BloodGroup)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none font-bold text-red-600"
                    >
                      {BLOOD_GROUPS.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">পছন্দের সময়</label>
                    <select
                      value={regTime}
                      onChange={(e) => setRegTime(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                    >
                      <option value="সকাল ০৯:০০ - ১১:০০">সকাল ০৯:০০ - ১১:০০</option>
                      <option value="সকাল ১১:০০ - ০১:০০">সকাল ১১:০০ - ০১:০০</option>
                      <option value="দুপুর ০২:০০ - ০৪:০০">দুপুর ০২:০০ - ০৪:০০</option>
                      <option value="যেকোনো সময়">যেকোনো সময়</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedCamp(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm cursor-pointer"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md text-sm cursor-pointer"
                  >
                    কনফার্ম রেজিস্ট্রেশন
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Add Camp Modal (for Admins) */}
      {showAddCampModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in">
            <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white p-6">
              <h3 className="font-black text-xl text-white">নতুন রক্তদান ক্যাম্প যোগ করুন</h3>
              <p className="text-xs text-rose-100 mt-1">স্বেচ্ছাসেবী টিম ও শাখার জন্য ক্যাম্প শিডিউল ফর্ম</p>
            </div>

            <form onSubmit={handleCreateCampSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">ক্যাম্পের নাম (বাংলায়) *</label>
                <input
                  type="text"
                  required
                  value={newCamp.titleBn}
                  onChange={(e) => setNewCamp({ ...newCamp, titleBn: e.target.value })}
                  placeholder="যেমন: ধামরাই সরকারি কলেজ ব্লাড ড্রাইভ"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">আয়োজক দল/শাখা *</label>
                  <input
                    type="text"
                    required
                    value={newCamp.organizerName}
                    onChange={(e) => setNewCamp({ ...newCamp, organizerName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">সহযোগী হাসপাতাল/ল্যাব</label>
                  <input
                    type="text"
                    value={newCamp.partnerHospital}
                    onChange={(e) => setNewCamp({ ...newCamp, partnerHospital: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">জেলা *</label>
                  <select
                    value={newCamp.district}
                    onChange={(e) => setNewCamp({ ...newCamp, district: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                  >
                    <option value="Dhaka">Dhaka</option>
                    <option value="Manikganj">Manikganj</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">উপজেলা *</label>
                  <input
                    type="text"
                    required
                    value={newCamp.upazila}
                    onChange={(e) => setNewCamp({ ...newCamp, upazila: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">টার্গেট (ব্যাগ) *</label>
                  <input
                    type="number"
                    required
                    value={newCamp.targetUnits}
                    onChange={(e) => setNewCamp({ ...newCamp, targetUnits: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">ভেন্যুর পূর্ণ ঠিকানা *</label>
                <input
                  type="text"
                  required
                  value={newCamp.venueAddress}
                  onChange={(e) => setNewCamp({ ...newCamp, venueAddress: e.target.value })}
                  placeholder="যেমন: ধামরাই পৌর কমিউনিটি সেন্টার মিলনায়তন"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">তারিখ *</label>
                  <input
                    type="date"
                    required
                    value={newCamp.startDate}
                    onChange={(e) => setNewCamp({ ...newCamp, startDate: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">সময়সূচি</label>
                  <input
                    type="text"
                    value={newCamp.startTime}
                    onChange={(e) => setNewCamp({ ...newCamp, startTime: e.target.value })}
                    placeholder="০৯:০০ AM - ০৫:০০ PM"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">যোগাযোগের ব্যক্তি</label>
                  <input
                    type="text"
                    value={newCamp.contactPerson}
                    onChange={(e) => setNewCamp({ ...newCamp, contactPerson: e.target.value })}
                    placeholder="সমন্বয়কের নাম"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">মোবাইল নম্বর</label>
                  <input
                    type="tel"
                    value={newCamp.contactPhone}
                    onChange={(e) => setNewCamp({ ...newCamp, contactPhone: e.target.value })}
                    placeholder="01XXXXXXXXX"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">ক্যাম্পের বিস্তারিত বিবরণ</label>
                <textarea
                  rows={3}
                  value={newCamp.descriptionBn}
                  onChange={(e) => setNewCamp({ ...newCamp, descriptionBn: e.target.value })}
                  placeholder="ক্যাম্পের সুযোগ-সুবিধা ও রক্তদাতাদের জন্য উপহার সম্পর্কিত তথ্য..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddCampModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md text-sm cursor-pointer"
                >
                  ক্যাম্প প্রকাশ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
