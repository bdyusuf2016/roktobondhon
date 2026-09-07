import React, { useState, useEffect } from 'react';
import { Building, CheckCircle, Save, Phone, Mail, MapPin, Globe } from 'lucide-react';
import { useSystemConfig } from '../../../contexts/SystemConfigContext';
import { useDialog } from '../../../contexts/DialogContext';
import type { OrganizationSettingsConfig } from '../../../types/config';

export const OrganizationSettings: React.FC = () => {
  const { config, updateSection } = useSystemConfig();
  const dialog = useDialog();

  const [formData, setFormData] = useState<OrganizationSettingsConfig>(config.organization);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData(config.organization);
  }, [config.organization]);

  const handleChange = (field: keyof OrganizationSettingsConfig, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await updateSection('organization', formData);
    setIsSaving(false);

    if (res.success) {
      dialog.alert({
        title: 'প্রতিষ্ঠান তথ্য সংরক্ষিত',
        message: 'সংগঠনের পরিচিতি ও অফিসিয়াল তথ্য সফলভাবে আপডেট করা হয়েছে।',
        theme: 'success',
      });
    } else {
      dialog.alert({
        title: 'সংরক্ষণ ব্যর্থ',
        message: res.error || 'প্রতিষ্ঠান তথ্য সংরক্ষণ করতে সমস্যা হয়েছে।',
        theme: 'danger',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/90 text-xs flex items-start gap-2.5">
        <Building className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-900 block text-sm">
            সংগঠনের পরিচিতি ও প্রাতিষ্ঠানিক তথ্য (Organization Information)
          </span>
          <p className="text-slate-600 mt-0.5 leading-relaxed">
            এখানে প্রদত্ত তথ্য সরাসরি পাবলিক ওয়েবসাইটের পরিচিতি, সনদপত্র, মেটাডেটা এবং জরুরি যোগাযোগ ডিরেক্টরিতে প্রতিফলিত হবে।
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block font-bold text-slate-800 mb-1">
            সংগঠনের নাম (English) *
          </label>
          <input
            type="text"
            required
            value={formData.organizationName}
            onChange={(e) => handleChange('organizationName', e.target.value)}
            placeholder="RoktoBondon Blood Donation Platform"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none bg-white font-medium"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-800 mb-1">
            সংগঠনের নাম (বাংলা) *
          </label>
          <input
            type="text"
            required
            value={formData.organizationNameBn}
            onChange={(e) => handleChange('organizationNameBn', e.target.value)}
            placeholder="রক্তবন্ধন রক্তদান সংগঠন"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none bg-white font-medium"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-800 mb-1">
            সংক্ষিপ্ত নাম / ট্যাগ (Short Name)
          </label>
          <input
            type="text"
            value={formData.shortName}
            onChange={(e) => handleChange('shortName', e.target.value)}
            placeholder="রক্তবন্ধন"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none bg-white"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-800 mb-1">
            অফিসিয়াল ওয়েবসাইট URL
          </label>
          <div className="relative">
            <Globe className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="url"
              value={formData.website}
              onChange={(e) => handleChange('website', e.target.value)}
              placeholder="https://roktobondon.org"
              className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none bg-white font-mono"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block font-bold text-slate-800 mb-1">
            মূল স্লোগান (বাংলা)
          </label>
          <input
            type="text"
            value={formData.sloganBn}
            onChange={(e) => handleChange('sloganBn', e.target.value)}
            placeholder="রক্তের বন্ধনে বাঁচুক প্রতিটি প্রাণ..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none bg-white"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-800 mb-1">
            মূল স্লোগান (English)
          </label>
          <input
            type="text"
            value={formData.slogan}
            onChange={(e) => handleChange('slogan', e.target.value)}
            placeholder="Saving lives through voluntary blood donation"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none bg-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block font-bold text-slate-800 mb-1">
            সাধারণ যোগাযোগ নম্বর
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+8801712-345678"
              className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-800 mb-1">
            ২৪/৭ জরুরি হটলাইন *
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-red-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              required
              value={formData.emergencyPhone}
              onChange={(e) => handleChange('emergencyPhone', e.target.value)}
              placeholder="+8801712-345678"
              className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-red-700 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none bg-white"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block font-bold text-slate-800 mb-1">
            অফিসিয়াল ইমেইল এড্রেস *
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="help@roktobondon.org"
              className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-800 mb-1">
            কেন্দ্রীয় কার্যালয়ের ঠিকানা
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="ধামরাই ও সাভার কেন্দ্রীয় কার্যালয়, ঢাকা"
              className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none bg-white"
            />
          </div>
        </div>
      </div>

      <div className="text-xs">
        <label className="block font-bold text-slate-800 mb-1">
          সংগঠনের সংক্ষিপ্ত বিবরণী (বাংলা)
        </label>
        <textarea
          rows={2}
          value={formData.descriptionBn}
          onChange={(e) => handleChange('descriptionBn', e.target.value)}
          placeholder="ধামরাই, সাভার ও মানিকগঞ্জে জরুরি রক্তের প্রয়োজনে নিঃস্বার্থ রক্তদাতাদের তাৎক্ষণিক সংযোগকারী প্ল্যাটফর্ম..."
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none bg-white resize-none"
        />
      </div>

      <div className="flex items-center justify-end pt-4 border-t border-slate-200">
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-xs transition-colors border border-red-700/60 text-xs flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'প্রতিষ্ঠান তথ্য সংরক্ষণ করুন'}</span>
        </button>
      </div>
    </form>
  );
};
