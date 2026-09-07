import React, { useState } from 'react';
import {
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Download,
  Wifi,
  RefreshCw,
  Layers,
  Save,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useSystemConfig } from '../../../contexts/SystemConfigContext';
import { useDialog } from '../../../contexts/DialogContext';
import { usePWA } from '../../../hooks/usePWA';

export const PwaSettings: React.FC = () => {
  const { config, updateSection } = useSystemConfig();
  const dialog = useDialog();
  const { isInstalled, isOnline, promptInstall, isInstallable } = usePWA();

  const pwaConfig = config.pwa || {
    appName: 'রক্তবন্ধন (RoktoBondhon)',
    appNameBn: 'রক্তবন্ধন (RoktoBondon) - রক্তদান প্ল্যাটফর্ম',
    shortName: 'RoktoBondon',
    shortNameBn: 'রক্তবন্ধন',
    descriptionBn: 'ধামরাই, সাভার ও মানিকগঞ্জে জরুরি রক্তের প্রয়োজনে রক্তদাতা অনুসন্ধান ও স্বেচ্ছাসেবী প্ল্যাটফর্ম।',
    themeColor: '#dc2626',
    backgroundColor: '#ffffff',
    displayMode: 'standalone',
    startUrl: '/',
    offlineCaching: true,
    cacheStrategy: 'stale-while-revalidate',
    backgroundSyncEnabled: true,
    offlineEmergencyDirectory: true,
    autoUpdatePrompt: true,
    installBannerEnabled: true,
    appVersion: '1.0.0',
  };

  const [formData, setFormData] = useState(pwaConfig);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await updateSection('pwa', formData);

      if (res.success) {
        dialog.alert({
          title: 'PWA সেটিংস সংরক্ষিত হয়েছে!',
          message: 'মোবাইল অ্যাপ্লিকেশন ও অফলাইন পিডব্লিউএ কনফিগারেশন সফলভাবে আপডেট করা হয়েছে।',
          type: 'success',
        });
      } else {
        throw new Error(res.error || 'PWA সেটিংস সেভ করতে সমস্যা হয়েছে।');
      }
    } catch (err: any) {
      dialog.alert({
        title: 'সংরক্ষণ ব্যর্থ হয়েছে',
        message: err?.message || 'PWA সেটিংস সেভ করতে সমস্যা হয়েছে।',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-indigo-600" />
          মোবাইল অ্যাপ ও অফলাইন PWA কনফিগারেশন (Progressive Web App)
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          অ্যান্ড্রয়েড ও আইওএস মোবাইলে অ্যাপের মতো ইনস্টল সুবিধা, অফলাইন ক্যাশে এবং নোটিফিকেশন নিয়ন্ত্রণ করুন
        </p>
      </div>

      {/* PWA Realtime Device Status Badge */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50 flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isInstalled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-medium block">অ্যাপ ইনস্টলেশন স্ট্যাটাস</span>
            <strong className="text-xs text-slate-800 font-bold">
              {isInstalled ? 'মোবাইলে ইনস্টলড' : 'ব্রাউজার মোডে চলছে'}
            </strong>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50 flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            <Wifi className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-medium block">নেটওয়ার্ক মোড</span>
            <strong className="text-xs text-slate-800 font-bold">
              {isOnline ? 'অনলাইন ও সিঙ্কড' : 'অফলাইন মোড (Offline)'}
            </strong>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-medium block">সার্ভিস ওয়ার্কার ক্যাশে</span>
            <strong className="text-xs text-slate-800 font-bold">Vite PWA অ্যাক্টিভ</strong>
          </div>
        </div>
      </div>

      {/* Manifest App Settings */}
      <div className="space-y-4 pt-2">
        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
          অ্যাপ ম্যানিফেস্ট ও ব্র্যান্ডিং ইনফো (App Manifest)
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              অ্যাপের পুরো নাম (বাংলা) *
            </label>
            <input
              type="text"
              required
              value={formData.appNameBn}
              onChange={(e) => setFormData({ ...formData, appNameBn: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 font-semibold text-slate-800"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              শর্ট নাম (বাংলা) *
            </label>
            <input
              type="text"
              required
              value={formData.shortNameBn}
              onChange={(e) => setFormData({ ...formData, shortNameBn: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 font-semibold text-slate-800"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            অ্যাপের বিবরণ (App Description)
          </label>
          <input
            type="text"
            value={formData.descriptionBn}
            onChange={(e) => setFormData({ ...formData, descriptionBn: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 text-slate-800"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              থিম কালার (Theme Color)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={formData.themeColor}
                onChange={(e) => setFormData({ ...formData, themeColor: e.target.value })}
                className="w-10 h-10 p-0 rounded-lg border border-slate-200 cursor-pointer"
              />
              <input
                type="text"
                value={formData.themeColor}
                onChange={(e) => setFormData({ ...formData, themeColor: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              ডিসপ্লে মোড (Display Mode)
            </label>
            <select
              value={formData.displayMode}
              onChange={(e) => setFormData({ ...formData, displayMode: e.target.value as any })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 font-semibold text-slate-800"
            >
              <option value="standalone">Standalone (Full App Experience)</option>
              <option value="fullscreen">Fullscreen (Immersive)</option>
              <option value="minimal-ui">Minimal UI</option>
              <option value="browser">Browser</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              ক্যাশে স্ট্র্যাটেজি (Caching Policy)
            </label>
            <select
              value={formData.cacheStrategy}
              onChange={(e) => setFormData({ ...formData, cacheStrategy: e.target.value as any })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 font-semibold text-slate-800"
            >
              <option value="stale-while-revalidate">Stale While Revalidate (Fast + Live Sync)</option>
              <option value="cache-first">Cache First (Maximum Offline Speed)</option>
              <option value="network-first">Network First (Strict Fresh Data)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="space-y-3 pt-2">
        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
          অফলাইন ও ব্যাকগ্রাউন্ড সার্ভিস (Offline Capabilities)
        </h4>

        <label className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 cursor-pointer transition">
          <input
            type="checkbox"
            checked={formData.offlineCaching}
            onChange={(e) => setFormData({ ...formData, offlineCaching: e.target.checked })}
            className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
          />
          <div>
            <strong className="text-xs font-bold text-slate-900 block">
              অফলাইন ডেটা ক্যাশিং ও ফলব্যাক এনাবল রাখুন
            </strong>
            <span className="text-[11px] text-slate-500">
              ইন্টারনেট না থাকলেও ইতিমধ্যে লোড হওয়া ডোনার ও হাসপাতালের তালিকা অফলাইনে দেখা যাবে।
            </span>
          </div>
        </label>

        <label className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 cursor-pointer transition">
          <input
            type="checkbox"
            checked={formData.backgroundSyncEnabled}
            onChange={(e) => setFormData({ ...formData, backgroundSyncEnabled: e.target.checked })}
            className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
          />
          <div>
            <strong className="text-xs font-bold text-slate-900 block">
              ব্যাকগ্রাউন্ড ডাটা সিনক্রোনাইজেশন
            </strong>
            <span className="text-[11px] text-slate-500">
              অফলাইনে সংরক্ষিত রিকোয়েস্ট ও ফর্ম ইন্টারনেট পাওয়ার সাথে সাথে স্বয়ংক্রিয়ভাবে সিঙ্ক হবে।
            </span>
          </div>
        </label>

        <label className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 cursor-pointer transition">
          <input
            type="checkbox"
            checked={formData.installBannerEnabled}
            onChange={(e) => setFormData({ ...formData, installBannerEnabled: e.target.checked })}
            className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
          />
          <div>
            <strong className="text-xs font-bold text-slate-900 block">
              মোবাইল ইনস্টল ব্যানার প্রম্পট সক্রিয় রাখুন
            </strong>
            <span className="text-[11px] text-slate-500">
              স্মার্টফোনে সাইট ভিজিট করলে হোমস্ক্রিনে অ্যাপ ইনস্টল করার জন্য বাটন প্রদর্শিত হবে।
            </span>
          </div>
        </label>
      </div>

      {/* Save Button Bar */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md text-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'সংরক্ষণ হচ্ছে...' : 'PWA সেটিংস সেভ করুন'}
        </button>
      </div>
    </form>
  );
};