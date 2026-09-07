import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Plus,
  Search,
  MapPin,
  Clock,
  Building2,
  Phone,
  Users,
  Award,
  CheckCircle2,
  AlertTriangle,
  Edit2,
  Trash2,
  Sparkles,
  Download,
  Filter,
  Check,
  X,
} from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useDialog } from '../../../contexts/DialogContext';
import {
  filterCamps,
  calculateCampMetrics,
  validateCampPayload,
} from '../../../services/campService';
import { convertCollectionToCsv, downloadFile } from '../../../services/backupService';
import type { BloodCamp } from '../../../types';

export const AdminCampsTab: React.FC = () => {
  const { bloodCamps, addBloodCamp, updateBloodCamp, deleteBloodCamp, addAuditLog } = useData();
  const { currentUser } = useAuth();
  const dialog = useDialog();

  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled'>('all');
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCamp, setEditingCamp] = useState<BloodCamp | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Collected Units Modal
  const [collectedUnitsModalCamp, setCollectedUnitsModalCamp] = useState<BloodCamp | null>(null);
  const [collectedUnitsInput, setCollectedUnitsInput] = useState<number>(0);

  // Form State
  const [form, setForm] = useState<Partial<BloodCamp>>({
    titleBn: '',
    titleEn: '',
    organizerName: 'রক্তবন্ধন রক্তদান সংগঠন',
    partnerHospital: 'ধামরাই উপজেলা স্বাস্থ্য কমপ্লেক্স',
    division: 'Dhaka',
    district: 'ঢাকা',
    upazila: 'ধামরাই',
    venueAddress: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    startTime: '09:00 AM',
    endTime: '04:00 PM',
    targetUnits: 50,
    collectedUnits: 0,
    contactPerson: currentUser?.fullName || 'সমন্বয়ক',
    contactPhone: currentUser?.phone || '01712345678',
    descriptionBn: 'ধামরাই ও আশেপাশের মুমূর্ষু রোগীদের জরুরি রক্তের প্রয়োজনে স্বেচ্ছাসেবী রক্তদান ক্যাম্পেইন।',
    status: 'upcoming',
  });

  const metrics = useMemo(() => calculateCampMetrics(bloodCamps), [bloodCamps]);

  const filteredCamps = useMemo(() => {
    return filterCamps(bloodCamps, {
      status: statusFilter,
      district: districtFilter,
      searchTerm: searchQuery,
    });
  }, [bloodCamps, statusFilter, districtFilter, searchQuery]);

  const openCreateModal = () => {
    setEditingCamp(null);
    setForm({
      titleBn: '',
      titleEn: '',
      organizerName: 'রক্তবন্ধন রক্তদান সংগঠন',
      partnerHospital: 'ধামরাই উপজেলা স্বাস্থ্য কমপ্লেক্স',
      division: 'Dhaka',
      district: 'ঢাকা',
      upazila: 'ধামরাই',
      venueAddress: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      startTime: '09:00 AM',
      endTime: '04:00 PM',
      targetUnits: 50,
      collectedUnits: 0,
      contactPerson: currentUser?.fullName || 'সমন্বয়ক',
      contactPhone: currentUser?.phone || '01712345678',
      descriptionBn: 'ধামরাই ও আশেপাশের মুমূর্ষু রোগীদের জরুরি রক্তের প্রয়োজনে স্বেচ্ছাসেবী রক্তদান ক্যাম্পেইন।',
      status: 'upcoming',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (camp: BloodCamp) => {
    setEditingCamp(camp);
    setForm({ ...camp });
    setIsModalOpen(true);
  };

  const handleSaveCamp = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateCampPayload(form);
    if (!validation.isValid) {
      dialog.alert({
        title: 'ভুল তথ্য প্রদান করা হয়েছে',
        message: validation.errors.join('\n'),
        theme: 'danger',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCamp) {
        await updateBloodCamp(editingCamp.id, form);
        addAuditLog(
          `ব্লাড ক্যাম্প আপডেট করা হয়েছে: ${form.titleBn}`,
          'CAMP',
          editingCamp.id,
          { form }
        );
        dialog.alert({
          title: 'ক্যাম্প আপডেট সম্পন্ন',
          message: 'ব্লাড ক্যাম্পের তথ্য সফলভাবে আপডেট হয়েছে।',
          theme: 'success',
        });
      } else {
        await addBloodCamp(form as any);
        addAuditLog(
          `নতুন ব্লাড ক্যাম্প তৈরি করা হয়েছে: ${form.titleBn}`,
          'CAMP',
          'CREATE',
          { form }
        );
        dialog.alert({
          title: 'নতুন ক্যাম্প তৈরি হয়েছে',
          message: 'ব্লাড ক্যাম্প সফলভাবে তৈরি হয়েছে এবং পাবলিক পেজে প্রদর্শিত হচ্ছে।',
          theme: 'success',
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      dialog.alert({
        title: 'ত্রুটি',
        message: err.message || 'ব্লাড ক্যাম্প সংরক্ষণ করতে ব্যর্থ হয়েছে।',
        theme: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCamp = async (camp: BloodCamp) => {
    const confirmed = await dialog.confirm({
      title: 'ক্যাম্প মুছে ফেলা নিশ্চিতকরণ',
      message: `আপনি কি নিশ্চিত যে "${camp.titleBn}" ক্যাম্পটি স্থায়ীভাবে মুছে ফেলতে চান?`,
      type: 'danger',
      confirmText: 'হ্যাঁ, মুছে ফেলুন',
      cancelText: 'বাতিল',
    });
    if (!confirmed) return;

    try {
      await deleteBloodCamp(camp.id);
      addAuditLog(
        `ব্লাড ক্যাম্প মুছে ফেলা হয়েছে: ${camp.titleBn}`,
        'CAMP',
        camp.id
      );
      dialog.alert({
        title: 'মুছে ফেলা হয়েছে',
        message: 'ক্যাম্পটি সফলভাবে মুছে ফেলা হয়েছে।',
        theme: 'info',
      });
    } catch (err: any) {
      dialog.alert({
        title: 'ত্রুটি',
        message: err.message || 'ক্যাম্প মুছে ফেলতে ব্যর্থ হয়েছে।',
        theme: 'danger',
      });
    }
  };

  const handleUpdateStatus = async (camp: BloodCamp, newStatus: BloodCamp['status']) => {
    try {
      await updateBloodCamp(camp.id, { status: newStatus });
      addAuditLog(
        `ক্যাম্প স্ট্যাটাস পরিবর্তন: ${camp.titleBn} -> ${newStatus}`,
        'CAMP',
        camp.id,
        { oldStatus: camp.status, newStatus }
      );
    } catch (err: any) {
      dialog.alert({
        title: 'ত্রুটি',
        message: err.message || 'স্ট্যাটাস আপডেট ব্যর্থ হয়েছে।',
        theme: 'danger',
      });
    }
  };

  const handleSaveCollectedUnits = async () => {
    if (!collectedUnitsModalCamp) return;
    try {
      await updateBloodCamp(collectedUnitsModalCamp.id, {
        collectedUnits: Number(collectedUnitsInput) || 0,
        status: 'completed',
      });
      addAuditLog(
        `ক্যাম্পে সংগৃহীত রক্তের পরিমাণ রেকর্ড: ${collectedUnitsModalCamp.titleBn} (${collectedUnitsInput} ব্যাগ)`,
        'CAMP',
        collectedUnitsModalCamp.id,
        { collectedUnits: collectedUnitsInput }
      );
      setCollectedUnitsModalCamp(null);
      dialog.alert({
        title: 'রেকর্ড সংরক্ষিত হয়েছে',
        message: `ক্যাম্পে সংগৃহীত ${collectedUnitsInput} ব্যাগ রক্ত সফলভাবে সিস্টেমে যুক্ত হয়েছে।`,
        theme: 'success',
      });
    } catch (err: any) {
      dialog.alert({
        title: 'ত্রুটি',
        message: err.message || 'সংগৃহীত রক্ত রেকর্ড করতে ব্যর্থ হয়েছে।',
        theme: 'danger',
      });
    }
  };

  const handleExportCsv = () => {
    if (bloodCamps.length === 0) {
      dialog.alert({
        title: 'ডেটা নেই',
        message: 'এক্সপোর্ট করার মতো কোনো ব্লাড ক্যাম্প নেই।',
        theme: 'info',
      });
      return;
    }
    const csv = convertCollectionToCsv(bloodCamps, [
      { key: 'id', label: 'আইডি' },
      { key: 'titleBn', label: 'ক্যাম্পের নাম' },
      { key: 'organizerName', label: 'আয়োজক' },
      { key: 'partnerHospital', label: 'হাসপাতাল' },
      { key: 'district', label: 'জেলা' },
      { key: 'upazila', label: 'উপজেলা' },
      { key: 'venueAddress', label: 'ভেন্যু' },
      { key: 'startDate', label: 'শুরুর তারিখ' },
      { key: 'endDate', label: 'শেষের তারিখ' },
      { key: 'targetUnits', label: 'টার্গেট ইউনিট' },
      { key: 'collectedUnits', label: 'সংগৃহীত ইউনিট' },
      { key: 'registeredCount', label: 'নিবন্ধিত ডোনার' },
      { key: 'status', label: 'স্ট্যাটাস' },
      { key: 'contactPerson', label: 'সমন্বয়ক' },
      { key: 'contactPhone', label: 'ফোন' },
    ]);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadFile(`roktobondon_camps_${dateStr}.csv`, csv, 'text/csv;charset=utf-8;');
  };

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                <Calendar className="w-5 h-5" />
              </div>
              <h2 className="font-bold text-lg text-slate-900">
                ব্লাড ক্যাম্পেইন ও ইভেন্ট ম্যানেজমেন্ট সেন্টার
              </h2>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              ধামরাই, সাভার ও মানিকগঞ্জে স্বেচ্ছাসেবী রক্তদান ক্যাম্প তৈরি, ভেন্যু নির্ধারণ, ডোনার প্রি-রেজিস্ট্রেশন এবং সংগৃহীত রক্তের হিসাব নিয়ন্ত্রণ করুন।
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>এক্সপোর্ট (CSV)</span>
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন ক্যাম্প যুক্ত করুন</span>
            </button>
          </div>
        </div>

        {/* KPI Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p className="text-[11px] text-slate-500 font-medium">সর্বমোট ক্যাম্প</p>
            <p className="text-base font-extrabold text-slate-900 mt-0.5">{metrics.totalCamps}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p className="text-[11px] text-slate-500 font-medium">আসন্ন ক্যাম্প</p>
            <p className="text-base font-extrabold text-blue-600 mt-0.5">{metrics.upcomingCamps}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p className="text-[11px] text-slate-500 font-medium">চলমান ক্যাম্প</p>
            <p className="text-base font-extrabold text-emerald-600 mt-0.5">{metrics.ongoingCamps}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p className="text-[11px] text-slate-500 font-medium">লক্ষ্যমাত্রা (ব্যাগ)</p>
            <p className="text-base font-extrabold text-amber-600 mt-0.5">{metrics.totalTargetUnits}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p className="text-[11px] text-slate-500 font-medium">সংগৃহীত রক্ত (ব্যাগ)</p>
            <p className="text-base font-extrabold text-red-600 mt-0.5">{metrics.totalCollectedUnits}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p className="text-[11px] text-slate-500 font-medium">মোট ডোনার রেজিস্ট্রেশন</p>
            <p className="text-base font-extrabold text-purple-600 mt-0.5">{metrics.totalRegistrations}</p>
          </div>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(
            [
              { id: 'all', label: 'সকল ক্যাম্প' },
              { id: 'upcoming', label: 'আসন্ন' },
              { id: 'ongoing', label: 'চলমান' },
              { id: 'completed', label: 'সম্পন্ন' },
              { id: 'cancelled', label: 'বাতিল' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setStatusFilter(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                statusFilter === t.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search & District */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-hidden"
          >
            <option value="all">সকল জেলা</option>
            <option value="ঢাকা">ঢাকা</option>
            <option value="মানিকগঞ্জ">মানিকগঞ্জ</option>
          </select>

          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ক্যাম্প, ভেন্যু বা সমন্বয়ক খুঁজুন..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-hidden focus:bg-white focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>
      </div>

      {/* Camp Cards Grid */}
      {filteredCamps.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCamps.map((camp) => {
            const progress = camp.targetUnits > 0
              ? Math.min(100, Math.round(((camp.collectedUnits || 0) / camp.targetUnits) * 100))
              : 0;

            const statusColors = {
              upcoming: 'bg-blue-50 text-blue-700 border-blue-200',
              ongoing: 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse',
              completed: 'bg-purple-50 text-purple-700 border-purple-200',
              cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
            };

            const statusLabels = {
              upcoming: 'আসন্ন ক্যাম্প',
              ongoing: 'চলমান',
              completed: 'সম্পন্ন',
              cancelled: 'বাতিল',
            };

            return (
              <div
                key={camp.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4 flex flex-col justify-between hover:shadow-md transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusColors[camp.status]}`}
                    >
                      {statusLabels[camp.status]}
                    </span>
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => openEditModal(camp)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        title="সম্পাদনা করুন"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCamp(camp)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-slate-900 line-clamp-1 group-hover:text-red-600 transition-colors">
                      {camp.titleBn}
                    </h3>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      আয়োজক: {camp.organizerName}
                    </p>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span className="line-clamp-1">{camp.venueAddress}, {camp.upazila}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{camp.startDate} {camp.startDate !== camp.endDate ? `হতে ${camp.endDate}` : ''}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{camp.startTime} - {camp.endTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{camp.contactPerson} ({camp.contactPhone})</span>
                    </div>
                  </div>

                  {/* Progress towards collection */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-600">সংগ্রহ: {camp.collectedUnits || 0} / {camp.targetUnits} ব্যাগ</span>
                      <span className="text-red-600 font-mono">{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 to-rose-600 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-bold">
                    <Users className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{camp.registeredCount || 0} জন নিবন্ধিত</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {camp.status === 'upcoming' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(camp, 'ongoing')}
                        className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[11px] font-bold border border-emerald-200 transition-colors"
                      >
                        শুরু করুন
                      </button>
                    )}

                    {camp.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => {
                          setCollectedUnitsModalCamp(camp);
                          setCollectedUnitsInput(camp.collectedUnits || 0);
                        }}
                        className="px-2.5 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-[11px] font-bold border border-purple-200 transition-colors"
                      >
                        রক্ত সংগ্রহ রেকর্ড
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center space-y-3">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-sm text-slate-700">কোনো ব্লাড ক্যাম্প পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            নির্বাচিত ফিল্টারের আওতায় কোনো ক্যাম্প নেই অথবা নতুন ক্যাম্প তৈরি করা হয়নি।
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>নতুন ক্যাম্প তৈরি করুন</span>
          </button>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-red-600" />
                <h3 className="font-extrabold text-base text-slate-900">
                  {editingCamp ? 'ব্লাড ক্যাম্প সম্পাদনা করুন' : 'নতুন ব্লাড ক্যাম্প তৈরি করুন'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCamp} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">ক্যাম্পের নাম (বাংলা)</label>
                  <input
                    type="text"
                    required
                    value={form.titleBn}
                    onChange={(e) => setForm({ ...form, titleBn: e.target.value })}
                    placeholder="ধামরাই ফ্রি ব্লাড গ্রুপিং ও স্বেচ্ছাসেবী রক্তদান ক্যাম্পেইন"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">আয়োজক সংস্থা / সংগঠন</label>
                  <input
                    type="text"
                    value={form.organizerName}
                    onChange={(e) => setForm({ ...form, organizerName: e.target.value })}
                    placeholder="রক্তবন্ধন ও ধামরাই যুব ফাউন্ডেশন"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">অংশীদার হাসপাতাল / ব্লাড ব্যাংক</label>
                  <input
                    type="text"
                    value={form.partnerHospital}
                    onChange={(e) => setForm({ ...form, partnerHospital: e.target.value })}
                    placeholder="ধামরাই উপজেলা স্বাস্থ্য কমপ্লেক্স"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">জেলা</label>
                  <select
                    value={form.district}
                    onChange={(e) => setForm({ ...form, district: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-white outline-hidden"
                  >
                    <option value="ঢাকা">ঢাকা</option>
                    <option value="মানিকগঞ্জ">মানিকগঞ্জ</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">উপজেলা / থানা</label>
                  <input
                    type="text"
                    value={form.upazila}
                    onChange={(e) => setForm({ ...form, upazila: e.target.value })}
                    placeholder="ধামরাই"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-hidden"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">ভেন্যু ও পূর্ণাঙ্গ ঠিকানা</label>
                  <input
                    type="text"
                    required
                    value={form.venueAddress}
                    onChange={(e) => setForm({ ...form, venueAddress: e.target.value })}
                    placeholder="ধামরাই সরকারি কলেজ প্রাঙ্গণ, ধামরাই বাজার"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">শুরুর তারিখ</label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">সমাপ্তির তারিখ</label>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">সময়সীমা</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={form.startTime}
                      onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                      placeholder="09:00 AM"
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs outline-hidden"
                    />
                    <input
                      type="text"
                      value={form.endTime}
                      onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                      placeholder="05:00 PM"
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs outline-hidden"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">লক্ষ্যমাত্রা (টার্গেট ব্যাগ)</label>
                  <input
                    type="number"
                    min={1}
                    value={form.targetUnits}
                    onChange={(e) => setForm({ ...form, targetUnits: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">সমন্বয়কের নাম</label>
                  <input
                    type="text"
                    value={form.contactPerson}
                    onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                    placeholder="মো: আরিফুল ইসলাম"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">যোগাযোগের মোবাইল</label>
                  <input
                    type="text"
                    value={form.contactPhone}
                    onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                    placeholder="01712345678"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-hidden"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">ক্যাম্পের অবস্থা (Status)</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white outline-hidden"
                  >
                    <option value="upcoming">আসন্ন ক্যাম্প (Upcoming)</option>
                    <option value="ongoing">চলমান ক্যাম্প (Ongoing)</option>
                    <option value="completed">সম্পন্ন ক্যাম্প (Completed)</option>
                    <option value="cancelled">বাতিলকৃত (Cancelled)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : editingCamp ? 'আপডেট করুন' : 'তৈরি করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Collected Units Modal */}
      {collectedUnitsModalCamp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-slate-900">
              <Award className="w-5 h-5 text-purple-600" />
              <h3 className="font-extrabold text-sm">সংগৃহীত রক্তের পরিমাণ রেকর্ড করুন</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              <strong className="text-slate-800">{collectedUnitsModalCamp.titleBn}</strong> ক্যাম্পে সংগৃহীত মোট রক্তের ব্যাগ সংখ্যা ইনপুট দিন। এটি ক্যাম্পকে ‘সম্পন্ন’ হিসেবে আপডেট করবে।
            </p>

            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-slate-700">সংগৃহীত রক্তের পরিমাণ (ব্যাগ)</label>
              <input
                type="number"
                min={0}
                value={collectedUnitsInput}
                onChange={(e) => setCollectedUnitsInput(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-extrabold text-slate-900 focus:ring-2 focus:ring-purple-500 outline-hidden"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCollectedUnitsModalCamp(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleSaveCollectedUnits}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                সংরক্ষণ সম্পন্ন করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
