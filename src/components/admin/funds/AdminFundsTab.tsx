import React, { useState } from 'react';
import {
  Plus,
  CreditCard,
  TrendingUp,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  Heart,
  DollarSign,
  Receipt,
  Layers,
  Edit2,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useDialog } from '../../../contexts/DialogContext';
import { PaymentMethodModal } from '../../modals';
import type { PaymentMethodConfig, DonationCauseConfig } from '../../../types';

export const AdminFundsTab: React.FC = () => {
  const {
    fundDonations,
    fundDisbursements,
    donationCauses,
    paymentMethods,
    verifyFundDonation,
    rejectFundDonation,
    addFundDisbursement,
    deleteFundDisbursement,
    updatePaymentMethod,
    addPaymentMethod,
    deletePaymentMethod,
    updateDonationCause,
    addDonationCause,
    hasPermission,
  } = useData();
  const { currentUser } = useAuth();
  const dialog = useDialog();

  const canManageFunds = hasPermission(currentUser?.role || 'admin', 'manage_funds');
  const canManageDisbursements = hasPermission(currentUser?.role || 'admin', 'manage_disbursements');
  const canManagePaymentMethods = hasPermission(currentUser?.role || 'admin', 'manage_payment_methods');

  const [activeSubTab, setActiveSubTab] = useState<'donations' | 'disbursements' | 'methods' | 'causes'>('donations');

  // Donation Filter & Search
  const [fundFilterStatus, setFundFilterStatus] = useState<string>('all');
  const [donationSearch, setDonationSearch] = useState('');

  // Disbursement Filter & Search
  const [disbursementSearch, setDisbursementSearch] = useState('');

  // Payment Method Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentForEdit, setSelectedPaymentForEdit] = useState<PaymentMethodConfig | null>(null);

  // Add Disbursement Modal State
  const [showAddDisbModal, setShowAddDisbModal] = useState(false);
  const [disbTitle, setDisbTitle] = useState('');
  const [disbAmount, setDisbAmount] = useState(1000);
  const [disbRecipient, setDisbRecipient] = useState('');
  const [disbArea, setDisbArea] = useState('ধামরাই');
  const [disbCause, setDisbCause] = useState('emergency_patient');
  const [disbNotes, setDisbNotes] = useState('');

  // Add Cause Modal State
  const [showAddCauseModal, setShowAddCauseModal] = useState(false);
  const [causeNameBn, setCauseNameBn] = useState('');
  const [causeTargetAmount, setCauseTargetAmount] = useState(50000);
  const [causeDescription, setCauseDescription] = useState('');

  // Financial Metrics
  const totalVerifiedFunds = fundDonations
    .filter((d) => d.status === 'verified')
    .reduce((sum, d) => sum + d.amount, 0);

  const totalDisbursedFunds = fundDisbursements.reduce((sum, d) => sum + d.amount, 0);
  const netReserveBalance = totalVerifiedFunds - totalDisbursedFunds;
  const pendingVerificationsCount = fundDonations.filter((d) => d.status === 'pending').length;

  const handleCreateDisbursement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disbTitle.trim() || !disbAmount || !disbRecipient.trim()) {
      dialog.alert({
        title: 'তথ্য অসম্পূর্ণ',
        message: 'অনুগ্রহ করে ব্যয়ের শিরোনাম, পরিমাণ এবং উপকারভোগীর নাম প্রদান করুন।',
        theme: 'warning',
      });
      return;
    }

    await addFundDisbursement({
      title: disbTitle.trim(),
      amount: Number(disbAmount),
      recipient: disbRecipient.trim(),
      area: disbArea,
      cause: disbCause,
      approvedBy: currentUser?.fullName || 'এডমিন',
      voucherNo: `VCH-${new Date().getFullYear()}-${String(fundDisbursements.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      notes: disbNotes.trim() || undefined,
    });

    setShowAddDisbModal(false);
    setDisbTitle('');
    setDisbAmount(1000);
    setDisbRecipient('');
    setDisbNotes('');

    dialog.alert({
      title: 'ভাউচার সংরক্ষিত',
      message: 'রোগী সহায়তা বা ব্যয়ের ভাউচার সফলভাবে সিস্টেমে সংরক্ষণ করা হয়েছে।',
      theme: 'success',
    });
  };

  const handleCreateCause = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!causeNameBn.trim()) return;

    await addDonationCause({
      nameBn: causeNameBn.trim(),
      targetAmount: Number(causeTargetAmount) || 50000,
      raisedAmount: 0,
      descriptionBn: causeDescription.trim() || 'স্বেচ্ছাসেবী তহবিল খাত',
      isActive: true,
    });

    setShowAddCauseModal(false);
    setCauseNameBn('');
    setCauseTargetAmount(50000);
    setCauseDescription('');

    dialog.alert({
      title: 'তহবিল খাত তৈরি হয়েছে',
      message: `"${causeNameBn}" নতুন ডোনেশন ক্যাম্পেইন খাত সফলভাবে যুক্ত করা হয়েছে।`,
      theme: 'success',
    });
  };

  const filteredDonations = fundDonations.filter((d) => {
    if (fundFilterStatus !== 'all' && d.status !== fundFilterStatus) return false;
    if (donationSearch.trim()) {
      const q = donationSearch.toLowerCase();
      return (
        d.donorName.toLowerCase().includes(q) ||
        d.donorPhone.includes(q) ||
        d.transactionId.toLowerCase().includes(q) ||
        d.paymentMethod.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredDisbursements = fundDisbursements.filter((disb) => {
    if (disbursementSearch.trim()) {
      const q = disbursementSearch.toLowerCase();
      return (
        disb.title.toLowerCase().includes(q) ||
        disb.recipient.toLowerCase().includes(q) ||
        disb.voucherNo.toLowerCase().includes(q) ||
        disb.area.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Financial Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">মোট অনুদান প্রাপ্তি</span>
          <span className="text-2xl font-black text-slate-900 block mt-1 tracking-tight font-mono">
            ৳ {totalVerifiedFunds.toLocaleString()}
          </span>
          <span className="text-[10px] text-emerald-600 font-semibold">যাচাইকৃত ডোনেশন</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">রোগী সহায়তা ব্যয়</span>
          <span className="text-2xl font-black text-red-600 block mt-1 tracking-tight font-mono">
            ৳ {totalDisbursedFunds.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 font-semibold">{fundDisbursements.length}টি কার্যক্রমে প্রদান</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">চলতি ফান্ড ব্যালেন্স</span>
          <span className={`text-2xl font-black block mt-1 tracking-tight font-mono ${netReserveBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            ৳ {netReserveBalance.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 font-semibold">বর্তমান রিজার্ভ তহবিল</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">যাচাইকরণ বাকি</span>
          <span className="text-2xl font-black text-amber-600 block mt-1 tracking-tight font-mono">
            {pendingVerificationsCount} টি
          </span>
          <span className="text-[10px] text-amber-700 font-semibold">অনুমোদন প্রয়োজন</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Navigation Sub-Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 p-2 gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveSubTab('donations')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'donations'
                ? 'bg-white text-red-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <Heart className="w-4 h-4" />
            প্রাপ্ত আর্থিক অনুদান ({fundDonations.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('disbursements')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'disbursements'
                ? 'bg-white text-red-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <Receipt className="w-4 h-4" />
            রোগী সহায়তা ও ব্যয় ভাউচার ({fundDisbursements.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('methods')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'methods'
                ? 'bg-white text-red-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            পেমেন্ট গেটওয়ে ও মেথডস ({paymentMethods.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('causes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'causes'
                ? 'bg-white text-red-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <Layers className="w-4 h-4" />
            ডোনেশন খাত ও ক্যাম্পেইন ({donationCauses.length})
          </button>
        </div>

        {/* TAB 1: Received Donations */}
        {activeSubTab === 'donations' && (
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">প্রাপ্ত অনুদানের তালিকা ও ভেরিফিকেশন কিউ</h3>
                <p className="text-xs text-slate-500">বিকাশ, নগদ, রকেট ও ব্যাংক একাউন্টে জমা হওয়া আর্থিক অনুদান</p>
              </div>
            </div>

            {/* Filter and Search */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={donationSearch}
                  onChange={(e) => setDonationSearch(e.target.value)}
                  placeholder="দাতার নাম, ফোন নম্বর, TrxID বা মেথড দিয়ে অনুসন্ধান..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <select
                value={fundFilterStatus}
                onChange={(e) => setFundFilterStatus(e.target.value)}
                className="w-full sm:w-48 px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 font-medium"
              >
                <option value="all">সকল ডোনেশন ({fundDonations.length})</option>
                <option value="pending">পেন্ডিং ভেরিফিকেশন ({fundDonations.filter((d) => d.status === 'pending').length})</option>
                <option value="verified">যাচাইকৃত / অনুমোদিত ({fundDonations.filter((d) => d.status === 'verified').length})</option>
                <option value="rejected">বাতিলকৃত</option>
              </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-y border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">দাতার নাম ও ফোন</th>
                    <th className="py-2.5 px-3 font-semibold">পরিমাণ</th>
                    <th className="py-2.5 px-3 font-semibold">মেথড ও TrxID</th>
                    <th className="py-2.5 px-3 font-semibold">উদ্দেশ্য / খাত</th>
                    <th className="py-2.5 px-3 font-semibold">তারিখ ও এলাকা</th>
                    <th className="py-2.5 px-3 font-semibold">স্ট্যাটাস</th>
                    {canManageFunds && <th className="py-2.5 px-3 font-semibold text-right">অ্যাকশন</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDonations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        কোনো অনুদান রেকর্ড পাওয়া যায়নি
                      </td>
                    </tr>
                  ) : (
                    filteredDonations.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">
                            {d.isAnonymous ? 'গোপন শুভানুধ্যায়ী' : d.donorName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {d.donorPhone}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-emerald-600">
                          ৳ {d.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-mono">
                          <span className="font-semibold text-slate-800">{d.paymentMethod}</span>
                          <div className="text-[10px] text-red-700 font-bold">{d.transactionId}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {d.fundCause === 'emergency_patient'
                            ? 'জরুরি রোগী ফান্ড'
                            : d.fundCause === 'blood_bags_kits'
                            ? 'ব্লাড ব্যাগ ও কিটস'
                            : d.fundCause === 'volunteer_campaign'
                            ? 'ক্যাম্পেইন ফান্ড'
                            : 'সাধারণ ফান্ড'}
                        </td>
                        <td className="py-3 px-3 text-slate-500 text-[11px]">
                          <div>{new Date(d.createdAt).toLocaleDateString('bn-BD')}</div>
                          <div className="text-slate-400">{d.area || 'ধামরাই'}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              d.status === 'verified'
                                ? 'bg-emerald-100 text-emerald-800'
                                : d.status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {d.status === 'verified' ? 'যাচাইকৃত ✓' : d.status === 'pending' ? 'পেন্ডিং' : 'বাতিল'}
                          </span>
                        </td>
                        {canManageFunds && (
                          <td className="py-3 px-3 text-right">
                            {d.status === 'pending' && (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await verifyFundDonation(d.id, currentUser?.fullName || 'এডমিন');
                                    dialog.alert({
                                      title: 'অনুমোদন সফল',
                                      message: `৳${d.amount} টাকার অনুদান সফলভাবে অনুমোদন করা হয়েছে।`,
                                      theme: 'success',
                                    });
                                  }}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-bold transition-colors"
                                >
                                  অনুমোদন
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await rejectFundDonation(d.id);
                                    dialog.alert({
                                      title: 'বাতিল করা হয়েছে',
                                      message: 'অনুদানের আবেদনটি বাতিল হিসেবে চিহ্নিত করা হয়েছে।',
                                      theme: 'warning',
                                    });
                                  }}
                                  className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-[10px] font-semibold transition-colors"
                                >
                                  বাতিল
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Patient Assistance & Expense Vouchers */}
        {activeSubTab === 'disbursements' && (
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">রোগী সহায়তা ও ব্যয় ভাউচার রেজিস্টার</h3>
                <p className="text-xs text-slate-500">অসহায় রোগীদের রক্তদান খরচ, টেস্ট কিট ও ভাউচার হিসেব</p>
              </div>
              {canManageDisbursements && (
                <button
                  type="button"
                  onClick={() => setShowAddDisbModal(true)}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs border border-red-700/60 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  নতুন সহায়তা / ব্যয় ভাউচার
                </button>
              )}
            </div>

            {/* Search */}
            <div className="pt-2 border-t border-slate-100">
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={disbursementSearch}
                  onChange={(e) => setDisbursementSearch(e.target.value)}
                  placeholder="ভাউচার নম্বর, রোগীর নাম বা কারণ দিয়ে অনুসন্ধান..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-y border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">তারিখ ও ভাউচার</th>
                    <th className="py-2.5 px-3 font-semibold">ব্যয়ের বিবরণ</th>
                    <th className="py-2.5 px-3 font-semibold">উপকারভোগী / রোগী</th>
                    <th className="py-2.5 px-3 font-semibold">এলাকা</th>
                    <th className="py-2.5 px-3 font-semibold">পরিমাণ</th>
                    <th className="py-2.5 px-3 font-semibold">অনুমোদনকারী</th>
                    {canManageDisbursements && <th className="py-2.5 px-3 font-semibold text-right">অ্যাকশন</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDisbursements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        কোনো ব্যয়ের ভাউচার পাওয়া যায়নি
                      </td>
                    </tr>
                  ) : (
                    filteredDisbursements.map((disb) => (
                      <tr key={disb.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-mono">
                          <div className="font-bold">{disb.date}</div>
                          <div className="text-[10px] text-slate-400">{disb.voucherNo}</div>
                        </td>
                        <td className="py-2.5 px-3 max-w-xs text-slate-800 font-medium">
                          {disb.title}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{disb.recipient}</td>
                        <td className="py-2.5 px-3 text-slate-600">{disb.area}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-red-600">
                          ৳ {disb.amount.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">{disb.approvedBy}</td>
                        {canManageDisbursements && (
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={async () => {
                                const ok = await dialog.confirm({
                                  title: 'ব্যয় রেকর্ড মুছে ফেলবেন?',
                                  message: `"${disb.title}" রেকর্ডটি তালিকা থেকে মুছে ফেলতে চান?`,
                                  confirmText: 'হ্যাঁ, মুছুন',
                                  confirmTheme: 'danger',
                                });
                                if (ok) {
                                  await deleteFundDisbursement(disb.id);
                                  dialog.alert({
                                    title: 'মুছে ফেলা হয়েছে',
                                    message: 'ব্যয় রেকর্ডটি সফলভাবে মুছে ফেলা হয়েছে।',
                                    theme: 'success',
                                  });
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Payment Methods Configuration */}
        {activeSubTab === 'methods' && (
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">পেমেন্ট গেটওয়ে ও মোবাইল ব্যাংকিং কনফিগারেশন</h3>
                <p className="text-xs text-slate-500">বিকাশ, নগদ, রকেট ও ব্যাংক একাউন্ট নম্বর নিয়ন্ত্রণ</p>
              </div>
              {canManagePaymentMethods && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPaymentForEdit(null);
                    setShowPaymentModal(true);
                  }}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs border border-red-700/60 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  নতুন পেমেন্ট মেথড যোগ করুন
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {paymentMethods.map((pm) => (
                <div
                  key={pm.id}
                  className={`p-4 rounded-xl border transition-all ${
                    pm.isActive
                      ? 'border-slate-200 bg-white hover:border-red-200 hover:shadow-xs'
                      : 'border-slate-200 bg-slate-50/80 opacity-70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-red-50 text-red-700 flex items-center justify-center font-bold text-xs border border-red-100">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{pm.nameBn}</h4>
                        <span className="text-[10px] text-slate-400 font-mono uppercase">{pm.type} • {pm.accountType}</span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        pm.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-300'
                      }`}
                    >
                      {pm.isActive ? 'সক্রিয়' : 'বন্ধ'}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-xs">
                    <div className="text-slate-500 text-[11px]">একাউন্ট নম্বর:</div>
                    <div className="font-mono font-black text-slate-900 text-sm bg-slate-50 p-2 rounded-lg border border-slate-200">
                      {pm.accountNumber}
                    </div>
                    {pm.instructionsBn && (
                      <p className="text-[11px] text-slate-600 mt-2 line-clamp-2">
                        {pm.instructionsBn}
                      </p>
                    )}
                  </div>

                  {canManagePaymentMethods && (
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPaymentForEdit(pm);
                          setShowPaymentModal(true);
                        }}
                        className="px-2.5 py-1 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg text-xs font-medium border border-slate-200 flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        এডিট
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await dialog.confirm({
                            title: 'পেমেন্ট মেথড মুছে ফেলবেন?',
                            message: `"${pm.nameBn}" মেথডটি অপসারণ করতে চান?`,
                            confirmText: 'হ্যাঁ, মুছুন',
                            confirmTheme: 'danger',
                          });
                          if (ok) {
                            await deletePaymentMethod(pm.id);
                          }
                        }}
                        className="px-2.5 py-1 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-medium border border-slate-200 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        মুছুন
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: Donation Causes & Targets */}
        {activeSubTab === 'causes' && (
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">ডোনেশন ফান্ডিং খাত ও ক্যাম্পেইনসমূহ</h3>
                <p className="text-xs text-slate-500">বিশেষায়িত রক্তদান সহায়তা খাত ও টার্গেট ফান্ডিং</p>
              </div>
              {canManageFunds && (
                <button
                  type="button"
                  onClick={() => setShowAddCauseModal(true)}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs border border-red-700/60 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  নতুন তহবিল খাত যুক্ত করুন
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {donationCauses.map((cause) => {
                const percent = Math.min(
                  100,
                  Math.round(((cause.raisedAmount || 0) / (cause.targetAmount || 1)) * 100)
                );
                return (
                  <div
                    key={cause.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{cause.nameBn}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">{cause.descriptionBn}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          cause.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-300'
                        }`}
                      >
                        {cause.isActive ? 'সক্রিয়' : 'স্থগিত'}
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className="text-slate-500">সংগৃহীত: ৳ {(cause.raisedAmount || 0).toLocaleString()}</span>
                        <span className="text-slate-800 font-bold">লক্ষ্য: ৳ {(cause.targetAmount || 0).toLocaleString()}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-600 rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="text-right text-[10px] text-slate-400 font-bold font-mono">
                        {percent}% অর্জিত
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add Disbursement / Expense Modal */}
      {showAddDisbModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-red-600" />
                নতুন রোগী সহায়তা / খরচ ভাউচার এন্ট্রি
              </h3>
              <button
                type="button"
                onClick={() => setShowAddDisbModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDisbursement} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ব্যয়ের শিরোনাম / কারণ *
                </label>
                <input
                  type="text"
                  required
                  value={disbTitle}
                  onChange={(e) => setDisbTitle(e.target.value)}
                  placeholder="যেমন: রোগীর ও-নেগেটিভ রক্ত সংগ্রহ ও টেস্ট খরচ"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-red-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    টাকার পরিমাণ (৳) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={disbAmount}
                    onChange={(e) => setDisbAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold focus:ring-1 focus:ring-red-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    অনুদান খাত / তহবিল *
                  </label>
                  <select
                    value={disbCause}
                    onChange={(e) => setDisbCause(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-medium outline-hidden"
                  >
                    {donationCauses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameBn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    উপকারভোগী / রোগী / গ্রহীতা *
                  </label>
                  <input
                    type="text"
                    required
                    value={disbRecipient}
                    onChange={(e) => setDisbRecipient(e.target.value)}
                    placeholder="রোগীর নাম বা প্রতিনিধি"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-red-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    এলাকা / উপজেলা *
                  </label>
                  <select
                    value={disbArea}
                    onChange={(e) => setDisbArea(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-medium outline-hidden"
                  >
                    <option value="ধামরাই">ধামরাই</option>
                    <option value="কালামপুর">কালামপুর</option>
                    <option value="সাভার">সাভার</option>
                    <option value="সাটুরিয়া">সাটুরিয়া</option>
                    <option value="মানিকগঞ্জ">মানিকগঞ্জ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  মন্তব্য বা ভাউচার বিবরণী (ঐচ্ছিক)
                </label>
                <textarea
                  rows={2}
                  value={disbNotes}
                  onChange={(e) => setDisbNotes(e.target.value)}
                  placeholder="হাসপাতালের নাম, বেড নম্বর বা ভাউচার বিস্তারিত..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-red-500 outline-hidden resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddDisbModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors shadow-xs"
                >
                  ভাউচার সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Cause Modal */}
      {showAddCauseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">
              নতুন অনুদান খাত যুক্ত করুন
            </h3>
            <form onSubmit={handleCreateCause} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  খাত বা ক্যাম্পেইনের নাম *
                </label>
                <input
                  type="text"
                  required
                  value={causeNameBn}
                  onChange={(e) => setCauseNameBn(e.target.value)}
                  placeholder="যেমন: থ্যালাসেমিয়া রোগী রক্ত পরিসঞ্চালন তহবিল"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-red-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  টার্গেট ফান্ডিং পরিমাণ (৳)
                </label>
                <input
                  type="number"
                  required
                  min="1000"
                  value={causeTargetAmount}
                  onChange={(e) => setCauseTargetAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-red-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  খাতের বিবরণী
                </label>
                <textarea
                  rows={2}
                  value={causeDescription}
                  onChange={(e) => setCauseDescription(e.target.value)}
                  placeholder="এই তহবিলের অর্থ কোন কোন উদ্দেশ্যে ব্যয় হবে লিখুন..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-red-500 outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddCauseModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors shadow-xs"
                >
                  খাত সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Method Config Modal */}
      <PaymentMethodModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedPaymentForEdit(null);
        }}
        methodToEdit={selectedPaymentForEdit}
        onSave={async (data) => {
          if (selectedPaymentForEdit) {
            await updatePaymentMethod(selectedPaymentForEdit.id, data);
            dialog.alert({
              title: 'আপডেট সফল',
              message: `"${data.nameBn}" পেমেন্ট মেথড আপডেট করা হয়েছে।`,
              theme: 'success',
            });
          } else {
            await addPaymentMethod(data);
            dialog.alert({
              title: 'যুক্ত হয়েছে',
              message: `"${data.nameBn}" নতুন পেমেন্ট মেথড সফলভাবে যোগ করা হয়েছে।`,
              theme: 'success',
            });
          }
        }}
      />
    </div>
  );
};
