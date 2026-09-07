import React, { useState, useEffect } from 'react';
import { Layout, Save, AlertCircle, Sparkles, Share2, Link as LinkIcon } from 'lucide-react';
import { useSystemConfig } from '../../../contexts/SystemConfigContext';
import { useDialog } from '../../../contexts/DialogContext';
import type { WebsiteSettingsConfig } from '../../../types/config';

export const WebsiteSettings: React.FC = () => {
  const { config, updateSection } = useSystemConfig();
  const dialog = useDialog();

  const [formData, setFormData] = useState<WebsiteSettingsConfig>(config.website);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData(config.website);
  }, [config.website]);

  const handleChange = (field: keyof WebsiteSettingsConfig, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSocialChange = (network: 'facebook' | 'youtube' | 'twitter' | 'instagram', value: string) => {
    setFormData((prev) => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [network]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await updateSection('website', formData);
    setIsSaving(false);

    if (res.success) {
      dialog.alert({
        title: 'ওয়েবসাইট সেটিংস সংরক্ষিত',
        message: 'হোমপেজ টাইটেল, ব্যানার নোটিশ ও সোশ্যাল লিংক সফলভাবে আপডেট করা হয়েছে।',
        theme: 'success',
      });
    } else {
      dialog.alert({
        title: 'সংরক্ষণ ব্যর্থ',
        message: res.error || 'ওয়েবসাইট সেটিংস সংরক্ষণ করতে সমস্যা হয়েছে।',
        theme: 'danger',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/90 text-xs flex items-start gap-2.5">
        <Layout className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-900 block text-sm">
            ওয়েবসাইট কনটেন্ট ও ঘোষণা ব্যানার (Website Content & Banner)
          </span>
          <p className="text-slate-600 mt-0.5 leading-relaxed">
            হোমপেজের মূল বার্তা, কল-টু-অ্যাকশন বোতাম, জরুরি নোটিশ ব্যানার এবং সোশ্যাল মিডিয়া সংযোগ পরিচালনা করুন।
          </p>
        </div>
      </div>

      {/* Hero Section Content */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-4 text-xs">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          হোমপেজ ব্যানার বার্তা (Hero Section)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              হোমপেজ মূল শিরোনাম (H1) *
            </label>
            <input
              type="text"
              required
              value={formData.homepageTitle}
              onChange={(e) => handleChange('homepageTitle', e.target.value)}
              placeholder="রক্তের বন্ধনে বাঁচুক প্রতিটি প্রাণ"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">
              কল-টু-অ্যাকশন বাটন টেক্সট (CTA Text)
            </label>
            <input
              type="text"
              value={formData.ctaText}
              onChange={(e) => handleChange('ctaText', e.target.value)}
              placeholder="রক্তদাতা খুঁজুন"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none font-medium"
            />
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-800 mb-1">
            হোমপেজ সাব-শিরোনাম বিবরণী (Subtitle)
          </label>
          <textarea
            rows={2}
            value={formData.homepageSubtitle}
            onChange={(e) => handleChange('homepageSubtitle', e.target.value)}
            placeholder="ধামরাই, সাভার ও মানিকগঞ্জে জরুরি রক্তের প্রয়োজনে তাৎক্ষণিক রক্তদাতা খুঁজুন..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none resize-none"
          />
        </div>
      </div>

      {/* Emergency Announcement Banner */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="font-bold text-slate-900 text-sm">হেডারের উপরে লাইভ নোটিশ ব্যানার</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.showAnnouncement}
              onChange={(e) => handleChange('showAnnouncement', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
            <span className="ml-2 text-xs font-semibold text-slate-700">
              {formData.showAnnouncement ? 'সক্রিয় (Visible)' : 'লুকানো (Hidden)'}
            </span>
          </label>
        </div>

        {formData.showAnnouncement && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                ব্যানার নোটিশ টেক্সট *
              </label>
              <input
                type="text"
                required={formData.showAnnouncement}
                value={formData.announcementText}
                onChange={(e) => handleChange('announcementText', e.target.value)}
                placeholder="জরুরি রক্তের প্রয়োজনে ২৪ ঘণ্টা হটলাইনে যোগাযোগ করুন..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-medium"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                বাটন লিংক
              </label>
              <input
                type="text"
                value={formData.announcementLink}
                onChange={(e) => handleChange('announcementLink', e.target.value)}
                placeholder="/request-blood"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-mono"
              />
            </div>
          </div>
        )}
      </div>

      {/* Social Media Links */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 text-xs">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Share2 className="w-4 h-4 text-blue-600" />
          সোশ্যাল মিডিয়া প্রোফাইল লিংক (Social Links)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              ফেসবুক পেজ / গ্রুপ URL
            </label>
            <input
              type="url"
              value={formData.socialLinks?.facebook || ''}
              onChange={(e) => handleSocialChange('facebook', e.target.value)}
              placeholder="https://facebook.com/roktobondon"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">
              ইউটিউব চ্যানেল URL
            </label>
            <input
              type="url"
              value={formData.socialLinks?.youtube || ''}
              onChange={(e) => handleSocialChange('youtube', e.target.value)}
              placeholder="https://youtube.com/@roktobondon"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
            />
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
          <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'ওয়েবসাইট সেটিংস সংরক্ষণ করুন'}</span>
        </button>
      </div>
    </form>
  );
};
