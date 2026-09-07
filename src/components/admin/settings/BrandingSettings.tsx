import React, { useState, useEffect } from 'react';
import { Palette, Save, MapPin, Image, Shield } from 'lucide-react';
import { useSystemConfig } from '../../../contexts/SystemConfigContext';
import { useDialog } from '../../../contexts/DialogContext';
import type { BrandingSettingsConfig } from '../../../types/config';

export const BrandingSettings: React.FC = () => {
  const { config, updateSection } = useSystemConfig();
  const dialog = useDialog();

  const [formData, setFormData] = useState<BrandingSettingsConfig>(config.branding);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData(config.branding);
  }, [config.branding]);

  const handleChange = (field: keyof BrandingSettingsConfig, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await updateSection('branding', formData);
    setIsSaving(false);

    if (res.success) {
      dialog.alert({
        title: 'ব্র্যান্ডিং সেটিংস সংরক্ষিত',
        message: 'লোগো, কালার, হেডার ও ফুটার কনফিগারেশন সফলভাবে আপডেট করা হয়েছে।',
        theme: 'success',
      });
    } else {
      dialog.alert({
        title: 'সংরক্ষণ ব্যর্থ',
        message: res.error || 'ব্র্যান্ডিং সেটিংস সংরক্ষণ করতে সমস্যা হয়েছে।',
        theme: 'danger',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/90 text-xs flex items-start gap-2.5">
        <Palette className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-900 block text-sm">
            ভিজ্যুয়াল ব্র্যান্ডিং ও থিম ডিজাইন (Branding & Design System)
          </span>
          <p className="text-slate-600 mt-0.5 leading-relaxed">
            ওয়েবসাইটের প্রাইমারি কালার, হেডার ব্র্যান্ডিং, ফুটারের পরিচিতি ও কভারেজ জোন নিয়ন্ত্রণ করুন।
          </p>
        </div>
      </div>

      {/* Colors & Visual Tokens */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div>
          <label className="block font-bold text-slate-800 mb-1">
            ব্র্যান্ড প্রাইমারি কালার
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={formData.primaryColor || '#dc2626'}
              onChange={(e) => handleChange('primaryColor', e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer border border-slate-300 p-0.5"
            />
            <input
              type="text"
              value={formData.primaryColor || '#dc2626'}
              onChange={(e) => handleChange('primaryColor', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none bg-white font-bold"
            />
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-800 mb-1">
            লোগো ইমেজ URL (ঐচ্ছিক)
          </label>
          <div className="relative">
            <Image className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="url"
              value={formData.logoUrl}
              onChange={(e) => handleChange('logoUrl', e.target.value)}
              placeholder="https://.../logo.png"
              className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none bg-white font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-800 mb-1">
            ফেভিকন URL (ঐচ্ছিক)
          </label>
          <div className="relative">
            <Image className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="url"
              value={formData.faviconUrl}
              onChange={(e) => handleChange('faviconUrl', e.target.value)}
              placeholder="https://.../favicon.ico"
              className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none bg-white font-mono"
            />
          </div>
        </div>
      </div>

      {/* Header Configuration */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 text-xs">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          হেডার কনফিগারেশন (Header Config)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              হেডার ডিসপ্লে টাইটেল
            </label>
            <input
              type="text"
              value={formData.headerTitle}
              onChange={(e) => handleChange('headerTitle', e.target.value)}
              placeholder="রক্ত দান পরিবার কালামপুর"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              হেডার সাব-টাইটেল (বাংলা)
            </label>
            <input
              type="text"
              value={formData.headerSubtitleBn}
              onChange={(e) => handleChange('headerSubtitleBn', e.target.value)}
              placeholder="ধামরাই • সাভার • মানিকগঞ্জ"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none font-bold text-red-700"
            />
          </div>
        </div>
      </div>

      {/* Footer Configuration */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-4 text-xs">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          ফুটার টেক্সট ও সিকিউরিটি ব্যাজ (Footer Config)
        </h3>

        <div>
          <label className="block font-bold text-slate-800 mb-1">
            ফুটার মিশন পরিচিতি (About Mission Text) *
          </label>
          <textarea
            rows={2}
            required
            value={formData.footerAboutBn}
            onChange={(e) => handleChange('footerAboutBn', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              সিকিউরিটি ব্যাজ টেক্সট
            </label>
            <input
              type="text"
              value={formData.footerSecurityBadgeBn}
              onChange={(e) => handleChange('footerSecurityBadgeBn', e.target.value)}
              placeholder="নিরাপদ ও প্রাইভেসি-সুরক্ষিত ডোনার ডেটাবেজ"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              ফুটার এলাকা ট্যাগলাইন
            </label>
            <input
              type="text"
              value={formData.footerTaglineBn}
              onChange={(e) => handleChange('footerTaglineBn', e.target.value)}
              placeholder="ধামরাই, সাভার ও মানিকগঞ্জ"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              কপিরাইট সমাপ্তি টেক্সট
            </label>
            <input
              type="text"
              value={formData.footerCopyrightText}
              onChange={(e) => handleChange('footerCopyrightText', e.target.value)}
              placeholder="সর্বস্বত্ব সংরক্ষিত।"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        {/* Coverage Areas */}
        <div className="pt-3 border-t border-slate-100 space-y-3">
          <span className="font-bold text-slate-900 block text-xs flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-red-600" />
            আওতাভুক্ত কভারেজ জোন (Coverage Areas):
          </span>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">জোন ১ শিরোনাম</label>
                <input
                  type="text"
                  value={formData.coverageArea1Title}
                  onChange={(e) => handleChange('coverageArea1Title', e.target.value)}
                  placeholder="ধামরাই ও সাভার শাখা (ঢাকা)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">আওতাভুক্ত এলাকা</label>
                <input
                  type="text"
                  value={formData.coverageArea1Details}
                  onChange={(e) => handleChange('coverageArea1Details', e.target.value)}
                  placeholder="ধামরাই সদর, কালামপুর, কুশুরা, বালিয়া, সাভার বাজার, আশুলিয়া"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">জোন ২ শিরোনাম</label>
                <input
                  type="text"
                  value={formData.coverageArea2Title}
                  onChange={(e) => handleChange('coverageArea2Title', e.target.value)}
                  placeholder="মানিকগঞ্জ জেলা শাখা"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">আওতাভুক্ত এলাকা</label>
                <input
                  type="text"
                  value={formData.coverageArea2Details}
                  onChange={(e) => handleChange('coverageArea2Details', e.target.value)}
                  placeholder="মানিকগঞ্জ সদর, সিংগাইর, সাটুরিয়া, শিবালয়, হরিরামপুর"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end pt-4 border-t border-slate-200">
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-xs transition-colors border border-red-700/60 text-xs flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'ব্র্যান্ডিং সেটিংস সংরক্ষণ করুন'}</span>
        </button>
      </div>
    </form>
  );
};
