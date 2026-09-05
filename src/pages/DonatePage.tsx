import React, { useState, useMemo } from 'react';
import {
  Heart,
  ShieldCheck,
  CreditCard,
  Copy,
  Check,
  FileText,
  Users,
  Award,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Clock,
  MapPin,
  Sparkles,
  PhoneCall,
  Lock,
  ArrowRight,
  Droplets,
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useDialog } from '../contexts/DialogContext';
import { DonationReceiptModal } from '../components/modals';
import type { FundDonation } from '../types';

export const DonatePage: React.FC = () => {
  const dialog = useDialog();
  const { currentUser } = useAuth();
  const {
    fundDonations,
    paymentMethods,
    donationCauses,
    fundDisbursements,
    addFundDonation,
  } = useData();

  const [activeTab, setActiveTab] = useState<'donate' | 'transparency' | 'honors'>('donate');

  // Donation form state
  const [selectedAmount, setSelectedAmount] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [selectedCauseId, setSelectedCauseId] = useState<string>('emergency_patient');
  const [selectedMethodId, setSelectedMethodId] = useState<string>('pay-bkash');
  const [donorName, setDonorName] = useState(currentUser?.fullName || '');
  const [donorPhone, setDonorPhone] = useState(currentUser?.phone || '');
  const [donorEmail, setDonorEmail] = useState(currentUser?.email || '');
  const [transactionId, setTransactionId] = useState('');
  const [senderAccount, setSenderAccount] = useState('');
  const [area, setArea] = useState('ধামরাই');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [copiedMethodId, setCopiedMethodId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submittedDonation, setSubmittedDonation] = useState<FundDonation | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Active payment methods
  const activeMethods = useMemo(
    () => paymentMethods.filter((m) => m.isActive),
    [paymentMethods]
  );
  const currentMethod =
    activeMethods.find((m) => m.id === selectedMethodId) || activeMethods[0] || paymentMethods[0];

  // Financial calculations
  const totalRaised = useMemo(() => {
    return fundDonations
      .filter((d) => d.status === 'verified')
      .reduce((sum, d) => sum + d.amount, 0);
  }, [fundDonations]);

  const totalDisbursed = useMemo(() => {
    return fundDisbursements.reduce((sum, d) => sum + d.amount, 0);
  }, [fundDisbursements]);

  const currentBalance = totalRaised - totalDisbursed;

  // Handle Amount selection
  const handleAmountClick = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (val: string) => {
    setCustomAmount(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) {
      setSelectedAmount(num);
    }
  };

  // Copy account number
  const handleCopyAccount = (num: string, id: string) => {
    navigator.clipboard?.writeText(num.replace(/[^0-9]/g, '') || num);
    setCopiedMethodId(id);
    setTimeout(() => setCopiedMethodId(null), 1500);
    dialog.alert({
      title: 'নম্বর কপি হয়েছে',
      message: `${num} নম্বরটি আপনার ক্লিপবোর্ডে কপি করা হয়েছে। আপনার পেমেন্ট অ্যাপে পেস্ট করুন।`,
      theme: 'success',
    });
  };

  // Handle donation submission
  const handleSubmitDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const finalAmount = customAmount ? parseInt(customAmount, 10) : selectedAmount;
    if (!finalAmount || finalAmount < 10) {
      setErrorMessage('অনুগ্রহ করে কমপক্ষে ১০ টাকা অনুদানের পরিমাণ প্রদান করুন।');
      return;
    }

    if (!donorName.trim()) {
      setErrorMessage('অনুগ্রহ করে আপনার নাম প্রদান করুন (প্রকাশ্যে গোপন রাখতে নিচের বক্সে টিক দিন)।');
      return;
    }

    if (!donorPhone.trim() || donorPhone.length < 11) {
      setErrorMessage('অনুগ্রহ করে সঠিক মোবাইল নম্বর প্রদান করুন।');
      return;
    }

    if (!transactionId.trim() || transactionId.trim().length < 4) {
      setErrorMessage('অনুগ্রহ করে পেমেন্টের পর প্রাপ্ত সঠিক Transaction ID (TrxID) প্রদান করুন।');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await addFundDonation({
        donorName: donorName.trim(),
        donorPhone: donorPhone.trim(),
        donorEmail: donorEmail.trim() || undefined,
        amount: finalAmount,
        paymentMethod: (currentMethod?.name as any) || 'bKash',
        transactionId: transactionId.trim().toUpperCase(),
        accountNumber: senderAccount.trim() || undefined,
        fundCause: selectedCauseId,
        area: area.trim(),
        message: message.trim() || undefined,
        isAnonymous,
        organizationId: 'org-roktobondon',
      });

      setSubmittedDonation(created);
      setShowReceiptModal(true);

      // Reset transaction form
      setTransactionId('');
      setSenderAccount('');
      setMessage('');
    } catch (err: any) {
      setErrorMessage(err.message || 'অনুদানের তথ্য সাবমিট করতে সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-950 via-slate-900 to-slate-950 text-white p-6 sm:p-10 shadow-xl border border-red-900/40">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-red-600/30 border border-red-500/40 text-red-200 text-xs font-bold">
            <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" />
            <span>মানবতার সেবায় পাশে থাকুন</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            ডোনেট এবং সাপোর্ট করুন
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
            ধামরাই, সাভার ও মানিকগঞ্জের অসহায় রোগীদের জরুরি রক্তের ব্যাগ, ল্যাব টেস্ট ও পরিবহন খরচে সহায়তা করতে আপনার সামান্য অনুদানও কারো জীবন বাঁচাতে পারে। আমাদের সকল আর্থিক হিসাব সম্পূর্ণ স্বচ্ছ ও অডিটকৃত।
          </p>

          {/* Quick Metrics Bar */}
          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-semibold">
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-xs">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>মোট সংগৃহীত: ৳{totalRaised.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-xs">
              <Droplets className="w-4 h-4 text-red-400" />
              <span>রোগী সহায়তা ব্যয়: ৳{totalDisbursed.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-xl backdrop-blur-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>বর্তমান তহবিল: ৳{currentBalance.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 text-xs font-bold">
        {[
          { id: 'donate', label: 'এখনই অনুদান দিন', icon: Heart },
          { id: 'transparency', label: 'আর্থিক স্বচ্ছতা ও অডিট রিপোর্ট', icon: FileText },
          { id: 'honors', label: `দাতা সম্মাননা তালিকা (${fundDonations.length})`, icon: Award },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${
                isSelected
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: MAKE A DONATION */}
      {activeTab === 'donate' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Form (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                অনুদানের তথ্য পূরণ করুন
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                অনুগ্রহ করে নিচের একাউন্টে টাকা পাঠিয়ে প্রাপ্ত TrxID প্রদান করুন
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmitDonation} className="space-y-6">
              {/* 1. Amount selection */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  ১. অনুদানের পরিমাণ নির্বাচন করুন (টাকা) *
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {[100, 500, 1000, 2500, 5000].map((amt) => {
                    const isSelected = selectedAmount === amt && !customAmount;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleAmountClick(amt)}
                        className={`py-2.5 px-2 rounded-xl text-xs font-bold text-center transition-all border ${
                          isSelected
                            ? 'bg-red-600 text-white border-red-700 shadow-xs scale-102'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                        }`}
                      >
                        ৳ {amt.toLocaleString()}
                      </button>
                    );
                  })}
                  <div className="col-span-3 sm:col-span-1">
                    <input
                      type="number"
                      min="10"
                      value={customAmount}
                      onChange={(e) => handleCustomAmountChange(e.target.value)}
                      placeholder="অন্যান্য পরিমাণ"
                      className="w-full py-2.5 px-2.5 rounded-xl text-xs text-center border border-slate-200 focus:ring-2 focus:ring-red-600 focus:outline-hidden font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Cause selection */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  ২. কোন খাতে অনুদান দিতে চান? *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {donationCauses.map((cause) => {
                    const isSelected = selectedCauseId === cause.id;
                    return (
                      <div
                        key={cause.id}
                        onClick={() => setSelectedCauseId(cause.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-red-50/80 border-red-300 ring-2 ring-red-500/20'
                            : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900 block">
                            {cause.nameBn}
                          </span>
                          <input
                            type="radio"
                            name="fundCause"
                            checked={isSelected}
                            onChange={() => setSelectedCauseId(cause.id)}
                            className="text-red-600 focus:ring-red-500"
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                          {cause.descriptionBn}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Payment Method Choice */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  ৩. পেমেন্ট মেথড নির্বাচন করুন *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {activeMethods.map((m) => {
                    const isSelected = selectedMethodId === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMethodId(m.id)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-950 shadow-xs'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>{m.nameBn}</span>
                        <span className="text-[10px] font-normal opacity-70">
                          {m.accountType === 'merchant' ? 'মার্চেন্ট' : 'পার্সোনাল'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Payment instructions for selected method */}
              {currentMethod && (
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900">
                      {currentMethod.nameBn} নম্বর:
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 font-bold">
                      {currentMethod.accountType === 'merchant' ? 'Merchant Payment' : 'Send Money'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-xl border border-amber-200">
                    <span className="font-mono text-base font-black text-slate-900 tracking-wider">
                      {currentMethod.accountNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyAccount(currentMethod.accountNumber, currentMethod.id)}
                      className="px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-50 rounded-lg flex items-center gap-1 border border-red-200 transition-colors"
                    >
                      {copiedMethodId === currentMethod.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>কপি</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    💡 <strong>নির্দেশনা:</strong> {currentMethod.instructionsBn}
                  </p>
                </div>
              )}

              {/* 5. Donor Information */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  ৪. আপনার তথ্য ও লেনদেন বিবরণ *
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      আপনার পূর্ণ নাম *
                    </label>
                    <input
                      type="text"
                      required
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      placeholder="নাম লিখুন"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      মোবাইল নম্বর *
                    </label>
                    <input
                      type="tel"
                      required
                      value={donorPhone}
                      onChange={(e) => setDonorPhone(e.target.value)}
                      placeholder="017xxxxxxxx"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Transaction ID (TrxID) *
                    </label>
                    <input
                      type="text"
                      required
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="যেমন: BL9X45TR81"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase font-bold text-red-700"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      যে নম্বর থেকে পাঠিয়েছেন (লাস্ট ৪ ডিজিট)
                    </label>
                    <input
                      type="text"
                      value={senderAccount}
                      onChange={(e) => setSenderAccount(e.target.value)}
                      placeholder="যেমন: 01712***877"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      আপনার এলাকা / উপজেলা
                    </label>
                    <select
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50"
                    >
                      <option value="ধামরাই">ধামরাই</option>
                      <option value="কালামপুর বাজার, ধামরাই">কালামপুর বাজার</option>
                      <option value="সাভার">সাভার</option>
                      <option value="মানিকগঞ্জ সদর">মানিকগঞ্জ সদর</option>
                      <option value="সিংগাইর">সিংগাইর</option>
                      <option value="ঢাকা সিটি">ঢাকা সেন্ট্রাল</option>
                      <option value="অন্যান্য">অন্যান্য জেলা/প্রবাসী</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      ইমেইল ঠিকানা (ঐচ্ছিক)
                    </label>
                    <input
                      type="email"
                      value={donorEmail}
                      onChange={(e) => setDonorEmail(e.target.value)}
                      placeholder="রসিদ পাওয়ার জন্য ইমেইল"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-xs">
                    শুভবার্তা বা দোয়া (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="মুমূর্ষু রোগীদের জন্য কোনো বার্তা বা শুভকামনা..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>

                {/* Anonymous Toggle */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="rounded-sm text-red-600 focus:ring-red-500 w-4 h-4"
                    />
                    <span className="font-semibold text-slate-800">
                      পাবলিক তালিকায় আমার নাম গোপন রাখুন (Anonymous)
                    </span>
                  </label>
                  <Lock className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 active:scale-98 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Heart className="w-4 h-4 fill-white" />
                <span>
                  {isSubmitting
                    ? 'অনুদানের তথ্য সাবমিট হচ্ছে...'
                    : `৳${(customAmount ? parseInt(customAmount, 10) : selectedAmount) || 0} টাকা অনুদান সাবমিট করুন`}
                </span>
              </button>
            </form>
          </div>

          {/* Right Info Box (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Trust & Transparency Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-6 rounded-2xl border border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>১০০% শতভাগ স্বচ্ছতা ও দায়বদ্ধতা</span>
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                আপনার অনুদানের প্রতিটি টাকা কিভাবে কাজে লাগে?
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-red-400 font-bold">✓</span>
                  <span>দরিদ্র ও দুর্ঘটনাকবলিত রোগীর রক্তের ব্যাগ ও ক্রসমেচিং ল্যাব ফি পরিশোধ।</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 font-bold">✓</span>
                  <span>ধামরাই, সাভার ও মানিকগঞ্জে বিনামূল্যে ডোনার ক্যাম্পেইন পরিচালনা।</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 font-bold">✓</span>
                  <span>জরুরি মধ্যরাতে রক্তদাতা দ্রুত হাসপাতালে পৌঁছানোর গাড়িভাড়া সহায়তা।</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 font-bold">✓</span>
                  <span>প্রতিটি খরচের অনুমোদন ভাউচার আমাদের ওয়েবসাইটে উন্মুক্ত রাখা হয়।</span>
                </li>
              </ul>
            </div>

            {/* Fund Balance Preview Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                লাইভ ফান্ড স্ট্যাটাস
              </span>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">মোট সংগৃহীত অনুদান:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    ৳ {totalRaised.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">রোগী ও ক্যাম্পেইন ব্যয়:</span>
                  <span className="font-bold text-red-600 font-mono">
                    ৳ {totalDisbursed.toLocaleString()}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800">চলতি ফান্ড ব্যালেন্স:</span>
                  <span className="font-black text-base text-emerald-600 font-mono">
                    ৳ {currentBalance.toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('transparency')}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1 transition-colors"
              >
                <span>সম্পূর্ণ অডিট লেজার দেখুন</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TRANSPARENCY & AUDIT REPORT */}
      {activeTab === 'transparency' && (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-xs text-slate-400 font-medium">সর্বমোট অনুদান প্রাপ্তি</span>
              <span className="text-2xl font-black text-slate-900 block font-mono">
                ৳ {totalRaised.toLocaleString()}
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold">যাচাইকৃত ডোনেশন</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-xs text-slate-400 font-medium">মোট ব্যয় / সহায়তা বিতরণ</span>
              <span className="text-2xl font-black text-red-600 block font-mono">
                ৳ {totalDisbursed.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold">ভাউচারযুক্ত ব্যয়</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-xs text-slate-400 font-medium">চলতি ফান্ড ব্যালেন্স</span>
              <span className="text-2xl font-black text-emerald-600 block font-mono">
                ৳ {currentBalance.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold">বর্তমানে জরুরি রিজার্ভ</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-xs text-slate-400 font-medium">সহায়তাপ্রাপ্ত রোগী/কার্যক্রম</span>
              <span className="text-2xl font-black text-blue-600 block font-mono">
                {fundDisbursements.length} টি
              </span>
              <span className="text-[10px] text-slate-500 font-semibold">ধামরাই ও সাভার চ্যাপ্টার</span>
            </div>
          </div>

          {/* Public Disbursements / Expense Ledger */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                পাবলিক আর্থিক ব্যয় ও বিতরণ লেজার (Public Audit Ledger)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                প্ল্যাটফর্মের অনুদান থেকে কোন রোগী বা খাতের পেছনে কত টাকা ব্যয় হয়েছে তার পূর্ণাঙ্গ হিসাব
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-y border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">তারিখ ও ভাউচার</th>
                    <th className="py-2.5 px-3 font-semibold">ব্যয়ের বিবরণ ও উদ্দেশ্য</th>
                    <th className="py-2.5 px-3 font-semibold">উপকারভোগী / হাসপাতাল</th>
                    <th className="py-2.5 px-3 font-semibold">এলাকা</th>
                    <th className="py-2.5 px-3 font-semibold">পরিমাণ</th>
                    <th className="py-2.5 px-3 font-semibold text-right">অনুমোদনকারী</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fundDisbursements.map((disb) => (
                    <tr key={disb.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-3 font-mono">
                        <div className="font-bold text-slate-900">{disb.date}</div>
                        <span className="text-[10px] text-slate-400">{disb.voucherNo}</span>
                      </td>
                      <td className="py-3 px-3 max-w-sm">
                        <div className="font-semibold text-slate-800">{disb.title}</div>
                        {disb.notes && (
                          <div className="text-[10px] text-slate-500 mt-0.5">{disb.notes}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-700">{disb.recipient}</td>
                      <td className="py-3 px-3 text-slate-600">{disb.area}</td>
                      <td className="py-3 px-3 font-bold text-red-600 font-mono">
                        ৳ {disb.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-500 text-[11px]">
                        {disb.approvedBy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DONOR HONOR ROLL */}
      {activeTab === 'honors' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                দাতা সম্মাননা তালিকা (Donor Honor Roll)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                যাঁরা আর্থিক সহায়তা দিয়ে মুমূর্ষু মানুষের মুখে হাসি ফুটিয়েছেন তাঁদের প্রতি সশ্রদ্ধ সালাম ও কৃতজ্ঞতা
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {fundDonations.map((don) => (
                <div
                  key={don.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        {don.isAnonymous ? 'গোপন শুভানুধ্যায়ী' : don.donorName}
                      </h4>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {new Date(don.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 font-mono">
                      ৳ {don.amount.toLocaleString()}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{don.area || 'ধামরাই'}</span>
                  </div>

                  {don.message && (
                    <div className="p-2.5 bg-white rounded-lg border border-slate-150 text-[11px] text-slate-600 italic">
                      &ldquo;{don.message}&rdquo;
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 font-mono border-t border-slate-200 pt-2 flex items-center justify-between">
                    <span>মেথড: {don.paymentMethod}</span>
                    <span>স্ট্যাটাস: {don.status === 'verified' ? 'যাচাইকৃত ✓' : 'পেন্ডিং'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Donation Receipt Modal */}
      <DonationReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        donation={submittedDonation}
      />
    </div>
  );
};
