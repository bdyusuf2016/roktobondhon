import React, { useState, useEffect } from 'react';
import {
  Flame,
  Save,
  Radio,
  Clock,
  Send,
  ShieldAlert,
  RotateCcw,
  Zap,
  Sliders,
  AlertTriangle,
} from 'lucide-react';
import { useSystemConfig } from '../../../contexts/SystemConfigContext';
import { useDialog } from '../../../contexts/DialogContext';
import type { EmergencySettingsConfig } from '../../../types/config';

const DEFAULT_EMERGENCY_CONFIG: EmergencySettingsConfig = {
  emergencyMode: false,
  emergencyPriority: 2,
  broadcastEnabled: true,
  broadcastRadiusKm: 50,
  repeatNotification: true,
  maxNotificationsPerRequest: 3,
  escalationEnabled: true,
  escalationAfterMinutes: 30,
  autoExpireAfterHours: 24,
};

export const EmergencyControlSettings: React.FC = () => {
  const { config, updateSection } = useSystemConfig();
  const dialog = useDialog();

  const [formData, setFormData] = useState<EmergencySettingsConfig>(
    config.emergency || DEFAULT_EMERGENCY_CONFIG
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (config.emergency) {
      setFormData(config.emergency);
    }
  }, [config.emergency]);

  const handleChange = <K extends keyof EmergencySettingsConfig>(key: K, value: EmergencySettingsConfig[K]) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleReset = async () => {
    const confirmed = await dialog.confirm({
      title: 'ডিফল্ট এমার্জেন্সি সেটিংসে রিসেট করবেন?',
      message: 'জরুরি রেসপন্স ও ব্রডকাস্টের সমস্ত প্যারামিটার প্রমিত মানে ফিরিয়ে নেওয়া হবে।',
      confirmText: 'হ্যাঁ, রিসেট করুন',
      confirmTheme: 'warning',
    });
    if (confirmed) {
      setFormData(DEFAULT_EMERGENCY_CONFIG);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.broadcastRadiusKm < 1) {
      dialog.alert({
        title: 'ভুল ইনপুট',
        message: 'ব্রডকাস্ট ব্যাসার্ধ কমপক্ষে ১ কিমি হতে হবে।',
        theme: 'error',
      });
      return;
    }

    if (formData.emergencyMode) {
      const confirmMode = await dialog.confirm({
        title: '⚠️ রেড অ্যালার্ট এমার্জেন্সি মোড সক্রিয়করণ',
        message: 'রেড অ্যালার্ট মোড চালু করলে প্ল্যাটফর্মের সকল ভিজিটরের সামনে জরুরি ক্রাইসিস ব্যানার প্রদর্শিত হবে এবং জরুরি রক্তের আবেদনগুলো সর্বোচ্চ প্রাধান্য পাবে। আপনি কি নিশ্চিত?',
        confirmText: 'হ্যাঁ, চালু করুন',
        confirmTheme: 'danger',
      });
      if (!confirmMode) return;
    }

    setIsSaving(true);
    const res = await updateSection('emergency', formData);
    setIsSaving(false);

    if (res.success) {
      dialog.alert({
        title: 'জরুরি সেটিংস সংরক্ষিত',
        message: 'জরুরি কন্ট্রোল সেন্টার ও ব্রডকাস্ট কনফিগারেশন সফলভাবে আপডেট হয়েছে।',
        theme: 'success',
      });
    } else {
      dialog.alert({
        title: 'সংরক্ষণ ব্যর্থ',
        message: res.error || 'সংরক্ষণ করতে সমস্যা হয়েছে।',
        theme: 'error',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white p-5 rounded-2xl shadow-sm flex items-start gap-3.5">
        <Flame className="w-6 h-6 text-white fill-white shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="font-extrabold text-base tracking-tight">
            জরুরি রেসপন্স ও ক্রাইসিস কন্ট্রোল সেন্টার (Emergency Control Center)
          </h3>
          <p className="text-xs text-rose-100 leading-relaxed">
            ধামরাই, সাভার ও মানিকগঞ্জ জোনে দুর্ঘটনা বা সংকটকালীন পরিস্থিতিতে ১-ক্লিক রেড অ্যালার্ট সক্রিয়করণ, পেরিমিটার ব্রডকাস্ট ও অটো-এসকেলেশন নিয়ন্ত্রণ করুন।
          </p>
        </div>
      </div>

      {/* Master Red Alert Crisis Toggle */}
      <div className={`p-5 rounded-2xl border transition-all ${
        formData.emergencyMode
          ? 'bg-red-50 border-red-400 shadow-md ring-2 ring-red-500/20'
          : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 text-base">
                সেন্ট্রাল রেড অ্যালার্ট মোড (Master Emergency Mode)
              </span>
              {formData.emergencyMode ? (
                <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white font-extrabold text-[11px] animate-pulse flex items-center gap-1">
                  <Flame className="w-3 h-3 fill-white" /> সক্রিয় (ACTIVE)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[11px]">
                  স্বাভাবিক (NORMAL)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
              সক্রিয় থাকলে ওয়েবসাইটে ভিজিটরদের সামনে টপ ক্রাইসিস ব্যানার শো করবে, জরুরি আবেদনগুলো সর্বোচ্চ প্রায়োরিটিতে প্রমোট হবে এবং রক্তদাতাদের এসএমএস পুশ দ্রুত গতিতে পাঠানো হবে।
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={formData.emergencyMode}
              onChange={(e) => handleChange('emergencyMode', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-600"></div>
          </label>
        </div>
      </div>

      {/* Broadcast Engine & Perimeter */}
      <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4 text-xs">
        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
          <Radio className="w-4 h-4 text-red-600" />
          ডোনার ব্রডকাস্ট ও রেডিয়াস পেরিমিটার (Broadcast Perimeter)
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1 font-semibold text-slate-700">
                <label>সার্চ ও নোটিফিকেশন ব্যাসার্ধ (Radius in KM)</label>
                <span className="font-bold text-red-600 font-mono text-sm">{formData.broadcastRadiusKm} কিমি</span>
              </div>
              <input
                type="range"
                min="5"
                max="150"
                step="5"
                value={formData.broadcastRadiusKm}
                onChange={(e) => handleChange('broadcastRadiusKm', parseInt(e.target.value) || 50)}
                className="w-full accent-red-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>৫ কিমি (লোকাল)</span>
                <span>৫০ কিমি (ধামরাই-সাভার-মানিকগঞ্জ)</span>
                <span>১৫0 কিমি (বৃহত্তর ঢাকা)</span>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                সর্বোচ্চ ব্রডকাস্ট পুশ প্রতি আবেদন (Max Push per Request)
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={formData.maxNotificationsPerRequest}
                onChange={(e) => handleChange('maxNotificationsPerRequest', parseInt(e.target.value) || 3)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-800"
                required
              />
              <span className="text-[11px] text-slate-500 mt-0.5 block">একটি জরুরি আবেদনে সর্বোচ্চ কতবার পুশ/মেসেজ পাঠানো যাবে</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                জরুরি প্রায়োরিটি স্কোর বুস্টার গুণক (Priority Multiplier)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="5"
                  step="0.5"
                  value={formData.emergencyPriority}
                  onChange={(e) => handleChange('emergencyPriority', parseFloat(e.target.value) || 2)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-800 font-mono"
                  required
                />
                <span className="absolute right-3 top-2 text-slate-400 font-medium">x গুণ (ডিফল্ট: 2x)</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">ম্যাচিং অ্যালগরিদমে জরুরি ডোনারদের অতিরিক্ত স্কোর বুস্ট দেবে</span>
            </div>

            <div className="pt-2">
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.broadcastEnabled}
                  onChange={(e) => handleChange('broadcastEnabled', e.target.checked)}
                  className="mt-0.5 rounded text-red-600"
                />
                <div>
                  <span className="font-bold text-slate-800 block">জরুরি ব্রডকাস্ট ইঞ্জিন সক্রিয়</span>
                  <span className="text-[11px] text-slate-500">অনুমোদিত হলে ১-ক্লিক হোয়াটসঅ্যাপ ও নোটিফিকেশন ব্রডকাস্ট পাঠানো যাবে</span>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Escalation & Auto-Expire Controls */}
      <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4 text-xs">
        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
          <Clock className="w-4 h-4 text-amber-600" />
          স্বয়ংক্রিয় এসকেলেশন ও লাইফসাইকেল (Escalation & Lifecycle)
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-xl border border-slate-200 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.escalationEnabled}
                onChange={(e) => handleChange('escalationEnabled', e.target.checked)}
                className="mt-0.5 rounded text-red-600"
              />
              <div>
                <span className="font-bold text-slate-800 block">অটো-এসকেলেশন সক্রিয় (Auto-Escalation)</span>
                <span className="text-[11px] text-slate-500">নির্দিষ্ট সময়ে ডোনার সাড়া না দিলে স্বয়ংক্রিয়ভাবে আশেপাশের জেলা ও ভলান্টিয়ারদের অ্যালার্ট যাবে</span>
              </div>
            </label>

            {formData.escalationEnabled && (
              <div className="pt-2">
                <label className="font-semibold text-slate-700 block mb-1">কত মিনিট পর এসকেলেট হবে?</label>
                <div className="relative">
                  <input
                    type="number"
                    min="5"
                    max="360"
                    value={formData.escalationAfterMinutes}
                    onChange={(e) => handleChange('escalationAfterMinutes', parseInt(e.target.value) || 30)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-800"
                  />
                  <span className="absolute right-3 top-1.5 text-slate-400 font-medium">মিনিট (ডিফল্ট: ৩০)</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.repeatNotification}
                onChange={(e) => handleChange('repeatNotification', e.target.checked)}
                className="mt-0.5 rounded text-red-600"
              />
              <div>
                <span className="font-bold text-slate-800 block">পুনরাবৃত্ত নোটিফিকেশন (Repeat Notification)</span>
                <span className="text-[11px] text-slate-500">জরুরি আবেদন পূরণ না হওয়া পর্যন্ত নির্দিষ্ট বিরতিতে রিমাইন্ডার পাঠাবে</span>
              </div>
            </label>

            <div className="pt-2">
              <label className="font-semibold text-slate-700 block mb-1">জরুরি আবেদনের স্বয়ংক্রিয় মেয়াদ (Auto-Expire)</label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="72"
                  value={formData.autoExpireAfterHours}
                  onChange={(e) => handleChange('autoExpireAfterHours', parseInt(e.target.value) || 24)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-800"
                />
                <span className="absolute right-3 top-1.5 text-slate-400 font-medium">ঘণ্টা (ডিফল্ট: ২৪)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
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
          {isSaving ? 'সংরক্ষণ হচ্ছে...' : 'জরুরি নীতিমালা সংরক্ষণ করুন'}
        </button>
      </div>
    </form>
  );
};
