import React, { useState, useEffect } from 'react';
import {
  FileText,
  Save,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Zap,
  CheckCircle2,
  Radio,
  Sliders,
} from 'lucide-react';
import { useSystemConfig } from '../../../contexts/SystemConfigContext';
import { useDialog } from '../../../contexts/DialogContext';
import type { BloodRequestsConfig } from '../../../types/config';

const DEFAULT_REQUEST_CONFIG: BloodRequestsConfig = {
  requestEnabled: true,
  emergencyRequestEnabled: true,
  requirePhoneVerification: false,
  requireHospital: true,
  requireBloodGroup: true,
  requireUnits: true,
  minimumUnits: 1,
  maximumUnits: 10,
  requestExpiryHours: 48,
  autoMatchingEnabled: true,
  autoBroadcastEnabled: false,
};

export const BloodRequestSettings: React.FC = () => {
  const { config, updateSection } = useSystemConfig();
  const dialog = useDialog();

  const [formData, setFormData] = useState<BloodRequestsConfig>(
    config.bloodRequests || DEFAULT_REQUEST_CONFIG
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (config.bloodRequests) {
      setFormData(config.bloodRequests);
    }
  }, [config.bloodRequests]);

  const handleChange = <K extends keyof BloodRequestsConfig>(key: K, value: BloodRequestsConfig[K]) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleReset = async () => {
    const confirmed = await dialog.confirm({
      title: 'ডিফল্ট সেটিংসে রিসেট করবেন?',
      message: 'রক্তের আবেদন নিয়ন্ত্রণ সংক্রান্ত সমস্ত নিয়ম প্রমিত ডিফল্ট মানে রিসেট করা হবে।',
      confirmText: 'হ্যাঁ, রিসেট করুন',
      confirmTheme: 'warning',
    });
    if (confirmed) {
      setFormData(DEFAULT_REQUEST_CONFIG);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.minimumUnits > formData.maximumUnits) {
      dialog.alert({
        title: 'ভুল ইনপুট',
        message: 'সর্বনিম্ন ব্যাগ সংখ্যা সর্বোচ্চ ব্যাগ সংখ্যার চেয়ে বেশি হতে পারে না।',
        theme: 'error',
      });
      return;
    }

    if (formData.requestExpiryHours < 1) {
      dialog.alert({
        title: 'ভুল ইনপুট',
        message: 'আবেদনের মেয়াদ কমপক্ষে ১ ঘণ্টা হতে হবে।',
        theme: 'error',
      });
      return;
    }

    setIsSaving(true);
    const res = await updateSection('bloodRequests', formData);
    setIsSaving(false);

    if (res.success) {
      dialog.alert({
        title: 'আবেদন নীতিমালা সংরক্ষিত',
        message: 'রক্তের আবেদন ও নিয়ন্ত্রণ সংক্রান্ত সেন্ট্রাল কনফিগারেশন সফলভাবে আপডেট করা হয়েছে।',
        theme: 'success',
      });
    } else {
      dialog.alert({
        title: 'সংরক্ষণ ব্যর্থ',
        message: res.error || 'আবেদন সেটিংস সংরক্ষণ করতে সমস্যা হয়েছে।',
        theme: 'error',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-red-50 to-pink-50 p-4 rounded-xl border border-red-100 flex items-start gap-3">
        <FileText className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <h3 className="font-bold text-slate-900 text-sm">
            রক্তের আবেদন নীতি ও নিয়ন্ত্রণ কনফিগারেশন (Blood Request Policy & Control)
          </h3>
          <p className="text-slate-600">
            রক্তের নতুন আবেদন গ্রহণ সচল/স্থগিত রাখা, মেয়াদোত্তীর্ণ হওয়ার সময়সীমা, রক্তের ব্যাগের পরিমাণ ও অটোমেশন রুলস পরিচালনা করুন।
          </p>
        </div>
      </div>

      {/* Primary Availability Controls */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-4 text-xs">
        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
          <Radio className="w-4 h-4 text-red-600" />
          সিস্টেম অ্যাক্টিভেশন ও জরুরি চ্যানেল (Master Availability)
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className={`p-4 rounded-xl border transition-all ${
            formData.requestEnabled ? 'bg-emerald-50/70 border-emerald-300' : 'bg-rose-50/70 border-rose-300'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 text-sm block">সাধারণ আবেদন গ্রহণ</span>
                <span className="text-[11px] text-slate-500">
                  {formData.requestEnabled ? 'ওয়েবসাইটে রক্তের আবেদন ফর্ম উন্মুক্ত' : 'নতুন আবেদন গ্রহণ সাময়িকভাবে স্থগিত'}
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.requestEnabled}
                onChange={(e) => handleChange('requestEnabled', e.target.checked)}
                className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
              />
            </div>
          </div>

          <div className={`p-4 rounded-xl border transition-all ${
            formData.emergencyRequestEnabled ? 'bg-red-50/70 border-red-300' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 text-sm block">জরুরি (Emergency) আবেদন চ্যানেল</span>
                <span className="text-[11px] text-slate-500">
                  {formData.emergencyRequestEnabled ? 'উচ্চ অগ্রাধিকারের জরুরি আবেদন সক্ষম' : 'জরুরি চ্যানেল নিষ্ক্রিয়'}
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.emergencyRequestEnabled}
                onChange={(e) => handleChange('emergencyRequestEnabled', e.target.checked)}
                className="w-5 h-5 accent-red-600 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Units & Expiry Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        {/* Unit Limits */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-4">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            রক্তের ব্যাগের পরিমাণ সীমা (Bag Limits)
          </h4>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">সর্বনিম্ন ব্যাগ (Min Units)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.minimumUnits}
                  onChange={(e) => handleChange('minimumUnits', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-800"
                  required
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">সর্বোচ্চ ব্যাগ (Max Units)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.maximumUnits}
                  onChange={(e) => handleChange('maximumUnits', parseInt(e.target.value) || 10)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-800"
                  required
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              একটি একক আবেদনে আবেদনকারী সর্বোচ্চ কত ব্যাগ রক্তের অনুরোধ করতে পারবেন (ডিফল্ট: ১ - ১০ ব্যাগ)।
            </p>
          </div>
        </div>

        {/* Expiry Controls */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-4">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
            <Clock className="w-4 h-4 text-amber-600" />
            আবেদনের স্বয়ংক্রিয় মেয়াদ (Auto Expiry)
          </h4>

          <div className="space-y-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">মেয়াদোত্তীর্ণ হওয়ার সময়সীমা (ঘণ্টা)</label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={formData.requestExpiryHours}
                  onChange={(e) => handleChange('requestExpiryHours', parseInt(e.target.value) || 48)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-800"
                  required
                />
                <span className="absolute right-3 top-2 text-slate-400 font-medium">ঘণ্টা (ডিফল্ট: ৪৮)</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              আবেদনের প্রয়োজনীয় তারিখ ও সময় পার হওয়ার পর সিস্টেম স্বয়ংক্রিয়ভাবে আবেদনটিকে Expired চিহ্নিত করবে।
            </p>
          </div>
        </div>
      </div>

      {/* Validation & Verification Enforcement */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-4 text-xs">
        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          বাধ্যতামূলক তথ্য ও ভেরিফিকেশন নীতি (Form Requirements)
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.requireHospital}
              onChange={(e) => handleChange('requireHospital', e.target.checked)}
              className="mt-0.5 rounded text-red-600"
            />
            <div>
              <span className="font-bold text-slate-800 block">হাসপাতালের নাম বাধ্যতামূলক</span>
              <span className="text-[11px] text-slate-500">চিকিৎসাধীন হাসপাতাল বা ক্লিনিক উল্লেখ আবশ্যক</span>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.requirePhoneVerification}
              onChange={(e) => handleChange('requirePhoneVerification', e.target.checked)}
              className="mt-0.5 rounded text-red-600"
            />
            <div>
              <span className="font-bold text-slate-800 block">মোবাইল নম্বর যাচাই বাধ্যতামূলক</span>
              <span className="text-[11px] text-slate-500">OTP বা অ্যাডমিন ভেরিফিকেশন ছাড়া পোস্ট হবে না</span>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.requireUnits}
              onChange={(e) => handleChange('requireUnits', e.target.checked)}
              className="mt-0.5 rounded text-red-600"
            />
            <div>
              <span className="font-bold text-slate-800 block">ব্যাগের পরিমাণ নির্দিষ্টকরণ</span>
              <span className="text-[11px] text-slate-500">নির্দিষ্ট ব্যাগের সংখ্যা নির্বাচন বাধ্যতামূলক</span>
            </div>
          </label>
        </div>
      </div>

      {/* Automation Triggers */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-4 text-xs">
        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
          <Zap className="w-4 h-4 text-amber-500" />
          স্মার্ট অটোমেশন ও ব্রডকাস্ট ট্রিগার (Automation)
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.autoMatchingEnabled}
              onChange={(e) => handleChange('autoMatchingEnabled', e.target.checked)}
              className="mt-0.5 rounded text-indigo-600"
            />
            <div>
              <span className="font-bold text-slate-800 block">স্বয়ংক্রিয় স্মার্ট ম্যাচিং (Auto-Matching)</span>
              <span className="text-[11px] text-slate-500">আবেদন সাবমিট হওয়ামাত্র নিকটবর্তী সামঞ্জস্যপূর্ণ রক্তদাতাদের তালিকা প্রস্তুত হবে</span>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.autoBroadcastEnabled}
              onChange={(e) => handleChange('autoBroadcastEnabled', e.target.checked)}
              className="mt-0.5 rounded text-indigo-600"
            />
            <div>
              <span className="font-bold text-slate-800 block">স্বয়ংক্রিয় জরুরি ব্রডকাস্ট (Auto-Broadcast)</span>
              <span className="text-[11px] text-slate-500">ক্রিটিক্যাল রক্তের আবেদন যাচাইয়ের সাথে সাথে সংশ্লিষ্ট এলাকার ডোনারদের এসএমএস যাবে</span>
            </div>
          </label>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
        <button
          type="button"
          onClick={handleReset}
          className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          ডিফল্টে রিসেট
        </button>

        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl shadow-xs flex items-center gap-2 transition-colors"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'সংরক্ষণ হচ্ছে...' : 'আবেদন নীতিমালা সংরক্ষণ করুন'}
        </button>
      </div>
    </form>
  );
};
