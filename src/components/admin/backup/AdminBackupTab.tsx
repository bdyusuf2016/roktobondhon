import React, { useState, useMemo } from 'react';
import {
  Database,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  HardDrive,
  FileJson,
  Layers,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useDialog } from '../../../contexts/DialogContext';
import {
  validateBackupPayload,
  convertCollectionToCsv,
  downloadFile,
} from '../../../services/backupService';
import type { BackupValidationResult, BackupCollectionKey } from '../../../types/backup';

export const AdminBackupTab: React.FC = () => {
  const {
    donors,
    bloodRequests,
    donorRequests,
    donations,
    locations,
    branches,
    hospitals,
    fundDonations,
    paymentMethods,
    donationCauses,
    fundDisbursements,
    users,
    auditLogs,
    exportBackupData,
    importBackupData,
    restoreSelectiveBackup,
    migrateLocalToFirestore,
  } = useData();
  const { currentUser } = useAuth();
  const dialog = useDialog();

  const [validationResult, setValidationResult] = useState<BackupValidationResult | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<BackupCollectionKey[]>([]);
  const [restoreStrategy, setRestoreStrategy] = useState<'replace' | 'merge'>('replace');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeNotification, setActiveNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Overall system metrics summary
  const systemMetrics = useMemo(() => {
    const totalRecords =
      donors.length +
      bloodRequests.length +
      donorRequests.length +
      donations.length +
      locations.length +
      branches.length +
      hospitals.length +
      fundDonations.length +
      paymentMethods.length +
      donationCauses.length +
      fundDisbursements.length +
      users.length +
      auditLogs.length;

    return {
      totalRecords,
      donorsCount: donors.length,
      requestsCount: bloodRequests.length,
      donationsCount: donations.length,
      hospitalsCount: hospitals.length,
      fundsCount: fundDonations.length,
      usersCount: users.length,
    };
  }, [
    donors,
    bloodRequests,
    donorRequests,
    donations,
    locations,
    branches,
    hospitals,
    fundDonations,
    paymentMethods,
    donationCauses,
    fundDisbursements,
    users,
    auditLogs,
  ]);

  // Handle Full System JSON Export
  const handleFullBackupExport = () => {
    try {
      exportBackupData();
      setActiveNotification({
        type: 'success',
        message: 'সম্পূর্ণ প্ল্যাটফর্ম ব্যাকআপ (JSON) ফাইল সফলভাবে তৈরি ও ডাউনলোড হয়েছে।',
      });
      dialog.alert({
        title: 'ব্যাকআপ ডাউনলোড সম্পন্ন',
        message: 'সম্পূর্ণ প্ল্যাটফর্ম ডেটা ও সিকিউরিটি কনফিগারেশন JSON ফরম্যাটে ডাউনলোড করা হয়েছে। এটি নিরাপদে অফলাইনে সংরক্ষণ করুন।',
        theme: 'success',
      });
    } catch (err: any) {
      dialog.alert({
        title: 'ব্যাকআপ তৈরিতে ত্রুটি',
        message: err.message || 'ব্যাকআপ ফাইল তৈরিতে ব্যর্থ হয়েছে।',
        theme: 'danger',
      });
    }
  };

  // Handle File Selection & Inspection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = validateBackupPayload(content);
        setValidationResult(result);
        if (result.isValid && result.parsedPayload) {
          // Pre-select all available non-empty collections
          const keys = Object.keys(result.itemCounts).filter(
            (k) => (result.itemCounts as any)[k] > 0
          ) as BackupCollectionKey[];
          setSelectedKeys(keys);
        } else {
          dialog.alert({
            title: 'ব্যাকআপ ফাইল যাচাইকরণ ব্যর্থ',
            message: result.errors.join('\n') || 'ব্যাকআপ ফাইলটি গ্রহণযোগ্য নয়।',
            theme: 'danger',
          });
        }
      }
    };
    reader.readAsText(file);
    // Reset file input value so user can upload the same file again if needed
    e.target.value = '';
  };

  // Execute Selective / Full Restore
  const handleExecuteRestore = async () => {
    if (!validationResult || !validationResult.parsedPayload) return;

    if (currentUser?.role !== 'super_admin') {
      dialog.alert({
        title: 'অনুমতি নেই',
        message: 'শুধুমাত্র সুপার এডমিন ডাটাবেজ ব্যাকআপ রিস্টোর করতে পারেন।',
        theme: 'danger',
      });
      return;
    }

    if (selectedKeys.length === 0) {
      dialog.alert({
        title: 'মডিউল নির্বাচন করুন',
        message: 'অনুগ্রহ করে অন্তত একটি ডেটা মডিউল বা সেটিংস নির্বাচন করুন।',
        theme: 'info',
      });
      return;
    }

    const confirmed = await dialog.confirm({
      title: 'ডাটাবেজ রিস্টোর নিশ্চিতকরণ',
      message: `আপনি ${selectedKeys.length}টি মডিউল (${restoreStrategy === 'replace' ? 'সম্পূর্ণ প্রতিস্থাপন / Overwrite' : 'সংযোজন / Merge'}) করার সিদ্ধান্ত নিয়েছেন। এটি বর্তমান সিস্টেম মেমরি পরিবর্তন করবে। আপনি কি নিশ্চিত?`,
      type: 'danger',
      confirmText: 'হ্যাঁ, রিস্টোর সম্পন্ন করুন',
      cancelText: 'বাতিল',
    });

    if (!confirmed) return;

    setIsProcessing(true);
    try {
      if (restoreSelectiveBackup) {
        const res = restoreSelectiveBackup(
          validationResult.parsedPayload,
          selectedKeys,
          restoreStrategy
        );
        if (res.success) {
          setActiveNotification({
            type: 'success',
            message: res.message,
          });
          dialog.alert({
            title: 'রিস্টোর সফল হয়েছে',
            message: res.message,
            theme: 'success',
          });
          setValidationResult(null);
        } else {
          dialog.alert({
            title: 'রিস্টোর ব্যর্থ',
            message: res.message,
            theme: 'danger',
          });
        }
      } else {
        const res = importBackupData(JSON.stringify(validationResult.parsedPayload));
        if (res.success) {
          setActiveNotification({
            type: 'success',
            message: res.message,
          });
          setValidationResult(null);
        }
      }
    } catch (err: any) {
      dialog.alert({
        title: 'ত্রুটি ঘটেছে',
        message: err.message || 'রিস্টোর চলাকালীন একটি অপ্রত্যাশিত সমস্যা হয়েছে।',
        theme: 'danger',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Export specific module to CSV
  const handleExportCsv = (
    moduleName: string,
    data: any[],
    headers?: { key: string; label: string }[]
  ) => {
    if (!data || data.length === 0) {
      dialog.alert({
        title: 'ডেটা পাওয়া যায়নি',
        message: `${moduleName} তালিকায় কোনো রেকর্ড নেই।`,
        theme: 'info',
      });
      return;
    }

    const csvContent = convertCollectionToCsv(data, headers);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `roktobondon_${moduleName.toLowerCase()}_${dateStr}.csv`;
    const success = downloadFile(filename, csvContent, 'text/csv;charset=utf-8;');
    if (success) {
      setActiveNotification({
        type: 'success',
        message: `${moduleName} এর CSV ফাইল ডাউনলোড হয়েছে।`,
      });
    }
  };

  // Trigger Supabase Cloud Sync
  const handleCloudSync = async () => {
    const confirmed = await dialog.confirm({
      title: 'ক্লাউড ডেটাবেজ সিঙ্ক',
      message: 'বর্তমান লোকাল ডেটাবেজের সকল তথ্য ক্লাউড সার্ভারে সিঙ্ক ও ব্যাকআপ করবেন?',
      type: 'info',
      confirmText: 'সিঙ্ক শুরু করুন',
      cancelText: 'বাতিল',
    });

    if (!confirmed) return;

    setIsProcessing(true);
    try {
      const res = await migrateLocalToFirestore();
      if (res.success) {
        dialog.alert({
          title: 'ক্লাউড সিঙ্ক সম্পন্ন',
          message: res.message,
          theme: 'success',
        });
      } else {
        dialog.alert({
          title: 'ক্লাউড সিঙ্ক বার্তা',
          message: res.message,
          theme: 'info',
        });
      }
    } catch (err: any) {
      dialog.alert({
        title: 'সিঙ্ক ত্রুটি',
        message: err.message,
        theme: 'danger',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleKey = (key: BackupCollectionKey) => {
    if (selectedKeys.includes(key)) {
      setSelectedKeys(selectedKeys.filter((k) => k !== key));
    } else {
      setSelectedKeys([...selectedKeys, key]);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                <Database className="w-5 h-5" />
              </div>
              <h2 className="font-bold text-lg text-slate-900">
                ডাটাবেজ ব্যাকআপ, রিস্টোর ও ডেটা পোর্টাবিলিটি ইঞ্জিন
              </h2>
            </div>
            <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
              প্ল্যাটফর্মের সকল রেকর্ড (রক্তদাতা, আবেদন, ডোনেশন, হাসপাতাল, ফান্ডিং ও সিস্টেম কনফিগারেশন) নিরাপদ ও প্রাতিষ্ঠানিক স্ট্যান্ডার্ডে ব্যাকআপ, রিস্টোর এবং এক্সেল বা সিএসভিতে রূপান্তর করুন।
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCloudSync}
              disabled={isProcessing}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>ক্লাউড সিঙ্ক</span>
            </button>
            <button
              type="button"
              onClick={handleFullBackupExport}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>সম্পূর্ণ সিস্টেম ব্যাকআপ (.JSON)</span>
            </button>
          </div>
        </div>

        {/* Status Metrics Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p className="text-[11px] text-slate-500 font-medium">মোট রেকর্ড</p>
            <p className="text-base font-extrabold text-slate-900 mt-0.5">{systemMetrics.totalRecords}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p className="text-[11px] text-slate-500 font-medium">রক্তদাতা সংখ্যা</p>
            <p className="text-base font-extrabold text-red-600 mt-0.5">{systemMetrics.donorsCount}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p className="text-[11px] text-slate-500 font-medium">রক্তের আবেদন</p>
            <p className="text-base font-extrabold text-blue-600 mt-0.5">{systemMetrics.requestsCount}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p className="text-[11px] text-slate-500 font-medium">রক্তদান ইতিহাস</p>
            <p className="text-base font-extrabold text-emerald-600 mt-0.5">{systemMetrics.donationsCount}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p className="text-[11px] text-slate-500 font-medium">হাসপাতাল তালিকা</p>
            <p className="text-base font-extrabold text-violet-600 mt-0.5">{systemMetrics.hospitalsCount}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p className="text-[11px] text-slate-500 font-medium">আর্থিক অনুদান</p>
            <p className="text-base font-extrabold text-amber-600 mt-0.5">{systemMetrics.fundsCount}</p>
          </div>
        </div>
      </div>

      {activeNotification && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-bold border ${
            activeNotification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{activeNotification.message}</span>
          <button
            type="button"
            onClick={() => setActiveNotification(null)}
            className="text-slate-400 hover:text-slate-600 text-xs ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Grid Layout: Export & Restore */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: System JSON Backup & File Importer */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900">
            <HardDrive className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-sm">সিস্টেম ব্যাকআপ ফাইল আপলোড ও ইন্সপেকশন</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            পূর্বে ডাউনলোড করা নিরাপদ `.json` ব্যাকআপ ফাইল আপলোড করুন। ফাইলটি স্বয়ংক্রিয়ভাবে স্ক্যান হয়ে ভেতরের সকল রেকর্ড ও মডিউলের বিবরণ প্রদর্শন করবে।
          </p>

          <div className="border-2 border-dashed border-slate-200 hover:border-red-400 rounded-2xl p-6 text-center transition-colors bg-slate-50/50 flex flex-col items-center justify-center gap-2">
            <FileJson className="w-8 h-8 text-slate-400" />
            <span className="text-xs font-bold text-slate-700">
              ব্যাকআপ JSON ফাইল সিলেক্ট করুন
            </span>
            <span className="text-[11px] text-slate-400">
              সাপোর্টেড স্কিমা: RoktoBondon v1.0 & v2.0
            </span>
            <label className="mt-2 py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>ফাইল নির্বাচন করুন</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
          </div>

          <div className="p-3.5 bg-blue-50/70 border border-blue-200/70 rounded-xl text-[11px] text-blue-800 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              সিস্টেমের ব্যাকআপ ফাইলে ক্রিপ্টোগ্রাফিক চেকসাম অন্তর্নির্মিত থাকে যা ফাইল বিকৃতি রোধ করে এবং নির্ভরযোগ্য রিস্টোর নিশ্চিত করে।
            </span>
          </div>
        </div>

        {/* Card 2: Granular Portability (CSV / Excel Export) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-sm">সিঙ্গেল মডিউল এক্সপোর্ট (CSV / Excel Portability)</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            এক্সেল বা গুগল শিটে বিশ্লেষণের জন্য নির্দিষ্ট মডিউলের ডেটা সরাসরি ইউনিকোড UTF-8 বাংলা ফরম্যাটে এক্সপোর্ট করুন।
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() =>
                handleExportCsv('Donors', donors, [
                  { key: 'donorId', label: 'ডোনার আইডি' },
                  { key: 'fullName', label: 'পুরো নাম' },
                  { key: 'bloodGroup', label: 'রক্তের গ্রুপ' },
                  { key: 'district', label: 'জেলা' },
                  { key: 'upazila', label: 'উপজেলা' },
                  { key: 'area', label: 'এলাকা' },
                  { key: 'phone', label: 'ফোন' },
                  { key: 'totalDonations', label: 'মোট রক্তদান' },
                  { key: 'lastDonationDate', label: 'সর্বশেষ রক্তদান' },
                  { key: 'availability', label: 'উপস্থিতি' },
                ])
              }
              className="p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 text-left transition-all flex flex-col justify-between group"
            >
              <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-800">
                🩸 রক্তদাতা তালিকা
              </span>
              <span className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                <span>{donors.length} জন ডোনার</span>
                <Download className="w-3 h-3 text-slate-400 group-hover:text-emerald-600" />
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleExportCsv('BloodRequests', bloodRequests, [
                  { key: 'requestId', label: 'অনুরোধ আইডি' },
                  { key: 'patientName', label: 'রোগীর নাম' },
                  { key: 'bloodGroup', label: 'রক্তের গ্রুপ' },
                  { key: 'requiredUnits', label: 'প্রয়োজনীয় ইউনিট' },
                  { key: 'hospitalName', label: 'হাসপাতাল' },
                  { key: 'district', label: 'জেলা' },
                  { key: 'urgency', label: 'জরুরি মাত্রা' },
                  { key: 'status', label: 'অবস্থা' },
                  { key: 'createdAt', label: 'আবেদনের তারিখ' },
                ])
              }
              className="p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-left transition-all flex flex-col justify-between group"
            >
              <span className="text-xs font-bold text-slate-800 group-hover:text-blue-800">
                📋 রক্তের আবেদন
              </span>
              <span className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                <span>{bloodRequests.length}টি আবেদন</span>
                <Download className="w-3 h-3 text-slate-400 group-hover:text-blue-600" />
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleExportCsv('DonationRecords', donations, [
                  { key: 'id', label: 'ট্রানজেকশন আইডি' },
                  { key: 'donorId', label: 'ডোনার আইডি' },
                  { key: 'donorName', label: 'ডোনার নাম' },
                  { key: 'bloodGroup', label: 'রক্তের গ্রুপ' },
                  { key: 'donationDate', label: 'রক্তদানের তারিখ' },
                  { key: 'hospitalName', label: 'হাসপাতাল' },
                  { key: 'donationType', label: 'ধরন' },
                  { key: 'status', label: 'স্ট্যাটাস' },
                ])
              }
              className="p-3 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50/50 text-left transition-all flex flex-col justify-between group"
            >
              <span className="text-xs font-bold text-slate-800 group-hover:text-red-800">
                ❤️ রক্তদান হিস্টোরি
              </span>
              <span className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                <span>{donations.length}টি রেকর্ড</span>
                <Download className="w-3 h-3 text-slate-400 group-hover:text-red-600" />
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleExportCsv('Hospitals', hospitals, [
                  { key: 'id', label: 'হাসপাতাল আইডি' },
                  { key: 'name', label: 'নাম (ইংরেজি)' },
                  { key: 'nameBn', label: 'নাম (বাংলা)' },
                  { key: 'district', label: 'জেলা' },
                  { key: 'address', label: 'ঠিকানা' },
                  { key: 'phone', label: 'ফোন' },
                  { key: 'hasBloodBank', label: 'ব্লাড ব্যাংক সুবিধা' },
                  { key: 'hasEmergency', label: 'জরুরি বিভাগ' },
                  { key: 'isVerified', label: 'ভেরিফায়েড' },
                ])
              }
              className="p-3 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 text-left transition-all flex flex-col justify-between group"
            >
              <span className="text-xs font-bold text-slate-800 group-hover:text-violet-800">
                🏥 হাসপাতাল তালিকা
              </span>
              <span className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                <span>{hospitals.length}টি হাসপাতাল</span>
                <Download className="w-3 h-3 text-slate-400 group-hover:text-violet-600" />
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleExportCsv('FundDonations', fundDonations, [
                  { key: 'id', label: 'অনুদান আইডি' },
                  { key: 'donorName', label: 'দাতা নাম' },
                  { key: 'amount', label: 'পরিমাণ (টাকা)' },
                  { key: 'paymentMethod', label: 'পেমেন্ট মেথড' },
                  { key: 'transactionId', label: 'ট্রানজেকশন আইডি' },
                  { key: 'status', label: 'অবস্থা' },
                  { key: 'createdAt', label: 'তারিখ' },
                ])
              }
              className="p-3 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 text-left transition-all flex flex-col justify-between group"
            >
              <span className="text-xs font-bold text-slate-800 group-hover:text-amber-800">
                💰 আর্থিক অনুদান তালিকা
              </span>
              <span className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                <span>{fundDonations.length}টি অনুদান</span>
                <Download className="w-3 h-3 text-slate-400 group-hover:text-amber-600" />
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleExportCsv('AuditLogs', auditLogs, [
                  { key: 'id', label: 'লগ আইডি' },
                  { key: 'userName', label: 'ইউজার নাম' },
                  { key: 'userRole', label: 'ইউজার রোল' },
                  { key: 'action', label: 'অ্যাকশন' },
                  { key: 'targetType', label: 'টার্গেট টাইপ' },
                  { key: 'targetId', label: 'টার্গেট আইডি' },
                  { key: 'timestamp', label: 'সময়' },
                ])
              }
              className="p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-left transition-all flex flex-col justify-between group"
            >
              <span className="text-xs font-bold text-slate-800 group-hover:text-slate-900">
                📜 অডিট ও সিকিউরিটি লগ
              </span>
              <span className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                <span>{auditLogs.length}টি লগ</span>
                <Download className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Validation & Selective Restore Workspace Modal/Section */}
      {validationResult && validationResult.isValid && (
        <div className="bg-white rounded-2xl border-2 border-indigo-500/80 p-6 shadow-lg space-y-5 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-base text-slate-900">
                  সিলেক্টিভ রিস্টোর প্রিভিউ ও মডিউল নির্বাচন
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                ফাইল স্কিমা ভার্সন: <span className="font-bold text-indigo-600">v{validationResult.version}</span> | এক্সপোর্ট সময়: {validationResult.exportedAt ? new Date(validationResult.exportedAt).toLocaleString('bn-BD') : 'অজানা'} | সর্বমোট রেকর্ড: <span className="font-bold text-slate-900">{validationResult.totalRecords}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setValidationResult(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors"
              >
                বাতিল
              </button>
            </div>
          </div>

          {/* Strategy & Mode selection */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-900">রিস্টোর স্ট্র্যাটেজি (Restore Strategy)</p>
              <p className="text-[11px] text-slate-500">ডাটাবেজে তথ্য সংযোজন করবেন নাকি বর্তমান তথ্য মুছে প্রতিস্থাপন করবেন?</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="restoreStrategy"
                  value="replace"
                  checked={restoreStrategy === 'replace'}
                  onChange={() => setRestoreStrategy('replace')}
                  className="text-red-600 focus:ring-red-500"
                />
                <span>সম্পূর্ণ প্রতিস্থাপন (Replace / Clean Overwrite)</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="restoreStrategy"
                  value="merge"
                  checked={restoreStrategy === 'merge'}
                  onChange={() => setRestoreStrategy('merge')}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span>সংযোজন (Merge / Non-destructive)</span>
              </label>
            </div>
          </div>

          {/* Module selection checkboxes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-slate-500" />
                রিস্টোর করার মডিউল নির্বাচন করুন:
              </span>
              <div className="flex gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    const keys = Object.keys(validationResult.itemCounts).filter(
                      (k) => (validationResult.itemCounts as any)[k] > 0
                    ) as BackupCollectionKey[];
                    setSelectedKeys(keys);
                  }}
                  className="text-indigo-600 hover:underline font-bold"
                >
                  সব নির্বাচন
                </button>
                <span>|</span>
                <button
                  type="button"
                  onClick={() => setSelectedKeys([])}
                  className="text-slate-500 hover:underline"
                >
                  সব বাতিল
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(validationResult.itemCounts).map(([k, count]) => {
                const key = k as BackupCollectionKey;
                const isSelected = selectedKeys.includes(key);
                const hasItems = typeof count === 'number' && count > 0;

                const labels: Record<string, string> = {
                  donors: '🩸 ডোনার তালিকা',
                  bloodRequests: '📋 রক্তের আবেদন',
                  donorRequests: '🔔 ডোনার রিকোয়েস্ট',
                  donations: '❤️ রক্তদান হিস্টোরি',
                  locations: '📍 ভৌগোলিক এরিয়া',
                  branches: '🏢 ব্রাঞ্চ ও শাখা',
                  hospitals: '🏥 হাসপাতাল ডিরেক্টরি',
                  fundDonations: '💰 আর্থিক অনুদান',
                  paymentMethods: '💳 পেমেন্ট গেটওয়ে',
                  donationCauses: '🎯 অনুদান ক্যাম্পেইন',
                  fundDisbursements: '📤 তহবিল ব্যয়',
                  users: '👥 ইউজার অ্যাকাউন্ট',
                  auditLogs: '📜 সিকিউরিটি অডিট',
                  orgConfig: '🏢 সংস্থা সেটিংস',
                  systemConfig: '⚙️ সিস্টেম কনফিগারেশন',
                  permissionMatrix: '🛡️ রোল ও পারমিশন ম্যাট্রিক্স',
                };

                return (
                  <label
                    key={key}
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-600'
                    } ${!hasItems ? 'opacity-40 pointer-events-none' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleKey(key)}
                        disabled={!hasItems}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{labels[key] || key}</span>
                    </div>
                    <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
                      {count}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-amber-700 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>রিস্টোর সম্পন্ন করলে মেমরি আপডেট হবে এবং একটি অডিট লগ রেকর্ড হবে।</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setValidationResult(null)}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                বাতিল করুন
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                disabled={isProcessing || selectedKeys.length === 0}
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{selectedKeys.length}টি নির্বাচিত মডিউল রিস্টোর করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safety & Guidelines Info Banner */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 space-y-2">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
          <HelpCircle className="w-4 h-4 text-slate-500" />
          <span>ব্যাকআপ ও নিরাপত্তা নির্দেশনা</span>
        </div>
        <ul className="text-xs text-slate-500 list-disc list-inside space-y-1 pl-1 leading-relaxed">
          <li>সাপ্তাহিক অথবা যেকোনো গুরুত্বপূর্ণ সিস্টেম আপগ্রেডের পূর্বে সম্পূর্ণ JSON ব্যাকআপ সংরক্ষণ করা বাধ্যতামূলক।</li>
          <li>ব্যক্তিগত সংবেদনশীল তথ্য ও ফোন নাম্বারের সুরক্ষা রক্ষার্থে ব্যাকআপ ফাইলটি শুধুমাত্র অনুমোদিত ড্রাইভ বা নিরাপদ সার্ভারে সংরক্ষণ করুন।</li>
          <li>যেকোনো ত্রুটিপূর্ণ রিস্টোরিং রোধে সিস্টেম প্রতিটি ব্যাকআপের স্কিমা ও ইন্টিগ্রিটি চেকসাম যাচাই করে।</li>
        </ul>
      </div>
    </div>
  );
};
