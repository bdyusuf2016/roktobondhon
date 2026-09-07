import React, { useState, useEffect } from 'react';
import {
  Globe,
  Share2,
  Search,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Eye,
  MessageCircle,
  Facebook,
  Send,
  Twitter,
  Copy,
} from 'lucide-react';
import { useSystemConfig } from '../../../contexts/SystemConfigContext';
import { useDialog } from '../../../contexts/DialogContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useData } from '../../../contexts/DataContext';
import { DEFAULT_SYSTEM_CONFIG } from '../../../services/configService';
import type { SeoSettingsConfig } from '../../../types/config';

export const SeoSettings: React.FC = () => {
  const { config, updateSection, isLoading } = useSystemConfig();
  const { addAuditLog } = useData();
  const { currentUser } = useAuth();
  const dialog = useDialog();

  const [form, setForm] = useState<SeoSettingsConfig>(
    config?.seo || DEFAULT_SYSTEM_CONFIG.seo
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [previewMode, setPreviewMode] = useState<'google' | 'facebook'>('google');

  useEffect(() => {
    if (config?.seo) {
      setForm(config.seo);
    }
  }, [config?.seo]);

  const handleChange = (field: keyof SeoSettingsConfig, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleSocialButton = (channel: keyof SeoSettingsConfig['socialShareButtons']) => {
    setForm((prev) => ({
      ...prev,
      socialShareButtons: {
        ...prev.socialShareButtons,
        [channel]: !prev.socialShareButtons[channel],
      },
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSection('seo', form);
      addAuditLog(
        'এসইও ও সোশ্যাল শেয়ারিং কনফিগারেশন আপডেট করা হয়েছে',
        'CONFIG',
        'SEO_SETTINGS',
        { form },
        currentUser ? { id: currentUser.id, name: currentUser.fullName, role: currentUser.role } : undefined
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      dialog.alert({
        title: 'সেটিংস সংরক্ষিত হয়েছে',
        message: 'এসইও, মেটা ট্যাগ ও সোশ্যাল শেয়ারিং সেটিংস সফলভাবে আপডেট করা হয়েছে।',
        theme: 'success',
      });
    } catch (err: any) {
      dialog.alert({
        title: 'ত্রুটি ঘটেছে',
        message: err.message || 'সেটিংস সংরক্ষণ করতে ব্যর্থ হয়েছে।',
        theme: 'danger',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    const confirmed = await dialog.confirm({
      title: 'ডিফল্ট সেটিংসে ফিরবেন?',
      message: 'আপনি কি নিশ্চিত যে এসইও ও সোশ্যাল শেয়ারিং সেটিংস পূর্বাবস্থায় ফিরিয়ে নিতে চান?',
      type: 'warning',
      confirmText: 'হ্যাঁ, রিসেট করুন',
      cancelText: 'বাতিল',
    });
    if (!confirmed) return;

    try {
      await updateSection('seo', DEFAULT_SYSTEM_CONFIG.seo);
      setForm(DEFAULT_SYSTEM_CONFIG.seo);
      dialog.alert({
        title: 'রিসেট সম্পন্ন',
        message: 'এসইও সেটিংস ডিফল্ট মানে রিসেট করা হয়েছে।',
        theme: 'info',
      });
    } catch (err: any) {
      dialog.alert({
        title: 'ত্রুটি',
        message: err.message || 'রিসেট ব্যর্থ হয়েছে।',
        theme: 'danger',
      });
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
        <div className="flex items-center gap-2 text-slate-800">
          <Globe className="w-5 h-5 text-red-600 shrink-0" />
          <div>
            <h4 className="font-bold text-xs">সার্চ ইঞ্জিন অপটিমাইজেশন (SEO) ও মেটা কনফিগারেশন</h4>
            <p className="text-[11px] text-slate-500">
              গুগল সার্চ ও সোশ্যাল মিডিয়ায় সাইটের মেটাডেটা, প্রিভিউ কার্ড এবং ইমার্জেন্সি শেয়ার টেমপ্লেট নিয়ন্ত্রণ করুন
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-white p-1 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setPreviewMode('google')}
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
              previewMode === 'google'
                ? 'bg-red-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Google প্রিভিউ
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode('facebook')}
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
              previewMode === 'facebook'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Social কার্ড প্রিভিউ
          </button>
        </div>
      </div>

      {/* Live Snippet Simulator */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold border-b border-slate-100 pb-2">
          <span className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-slate-400" />
            লাইভ সিমুলেটর প্রিভিউ (Live Preview Snippet)
          </span>
          <span>{previewMode === 'google' ? 'Google Search Engine' : 'Facebook / WhatsApp Card'}</span>
        </div>

        {previewMode === 'google' ? (
          <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-200/60 font-sans space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="font-medium text-slate-800">{form.canonicalUrl || 'https://roktobondon.org'}</span>
              <span className="text-slate-400">›</span>
              <span className="text-slate-500">home</span>
            </div>
            <h3 className="text-base text-blue-700 hover:underline font-medium cursor-pointer leading-snug">
              {form.siteTitleBn || form.siteTitle || 'রক্ত দান পরিবার কালামপুর রক্তদান প্ল্যাটফর্ম'}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
              {form.metaDescriptionBn || form.metaDescription || 'ধামরাই, সাভার ও মানিকগঞ্জে জরুরি রক্তের প্রয়োজনে রক্তদাতা অনুসন্ধান ও স্বেচ্ছাসেবী রক্তদান নেটওয়ার্ক।'}
            </p>
          </div>
        ) : (
          <div className="max-w-md border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
            {form.ogImageUrl ? (
              <img
                src={form.ogImageUrl}
                alt="OpenGraph Preview"
                className="w-full h-44 object-cover bg-slate-100"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-32 bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">
                কোনো থাম্বনেইল ছবি দেওয়া হয়নি
              </div>
            )}
            <div className="p-3 bg-slate-50 border-t border-slate-100 space-y-1">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                {form.canonicalUrl.replace(/https?:\/\//, '').split('/')[0] || 'roktodanporibar.org'}
              </p>
              <p className="text-xs font-bold text-slate-900 line-clamp-1">
                {form.ogTitle || form.siteTitleBn || 'রক্ত দান পরিবার কালামপুর রক্তদান প্ল্যাটফর্ম'}
              </p>
              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                {form.ogDescription || form.metaDescriptionBn || form.metaDescription}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Site Title (Bengali) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">সাইটের মূল শিরোনাম (Bangla Title)</label>
          <input
            type="text"
            value={form.siteTitleBn}
            onChange={(e) => handleChange('siteTitleBn', e.target.value)}
            placeholder="রক্ত দান পরিবার কালামপুর — ধামরাই, সাভার ও মানিকগঞ্জের স্বেচ্ছাসেবী রক্তদান প্ল্যাটফর্ম"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-hidden transition-all"
          />
        </div>

        {/* Site Title (English) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">সাইটের শিরোনাম (English Title)</label>
          <input
            type="text"
            value={form.siteTitle}
            onChange={(e) => handleChange('siteTitle', e.target.value)}
            placeholder="RoktoBondon - Voluntary Blood Donation Platform"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-hidden transition-all"
          />
        </div>

        {/* Meta Description (Bangla) */}
        <div className="space-y-1.5 md:col-span-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">মেটা ডেসক্রিপশন (বাংলা বিবরণ)</label>
            <span className="text-[10px] text-slate-400 font-medium">
              {form.metaDescriptionBn?.length || 0} / 160 অক্ষর
            </span>
          </div>
          <textarea
            rows={2}
            value={form.metaDescriptionBn}
            onChange={(e) => handleChange('metaDescriptionBn', e.target.value)}
            placeholder="জরুরি রক্তের প্রয়োজনে রক্তের আবেদন করুন বা রক্তদাতা হিসেবে যুক্ত হয়ে বিনামূল্যে মুমূর্ষু রোগীর জীবন বাঁচান।"
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-hidden transition-all"
          />
        </div>

        {/* Meta Keywords */}
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-xs font-bold text-slate-700">মেটা কি-ওয়ার্ডস (Meta Keywords, কমা দ্বারা পৃথক করুন)</label>
          <input
            type="text"
            value={form.metaKeywords}
            onChange={(e) => handleChange('metaKeywords', e.target.value)}
            placeholder="রক্তদান, ব্লাড ডোনার, ধামরাই ব্লাড ডোনার, সাভার রক্তদাতা, মানিকগঞ্জ রক্তদান, Blood Donor Bangladesh"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-hidden transition-all"
          />
        </div>

        {/* Canonical URL */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">ক্যানোনিকাল সাইট ইউআরএল (Canonical URL)</label>
          <input
            type="url"
            value={form.canonicalUrl}
            onChange={(e) => handleChange('canonicalUrl', e.target.value)}
            placeholder="https://bdyusuf2016.github.io/roktobondhon/"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-hidden transition-all"
          />
        </div>

        {/* Google Site Verification */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Google Search Console Verification টোকেন</label>
          <input
            type="text"
            value={form.googleSiteVerification}
            onChange={(e) => handleChange('googleSiteVerification', e.target.value)}
            placeholder="google-site-verification=abcdef12345..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-hidden transition-all"
          />
        </div>

        {/* Open Graph Image URL */}
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-xs font-bold text-slate-700">সোশ্যাল শেয়ার থাম্বনেইল ছবি (Open Graph Image URL)</label>
          <input
            type="url"
            value={form.ogImageUrl}
            onChange={(e) => handleChange('ogImageUrl', e.target.value)}
            placeholder="https://example.com/assets/og-preview.png"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-hidden transition-all"
          />
        </div>

        {/* Twitter Handle */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">টুইটার হ্যান্ডেল (Twitter Handle)</label>
          <input
            type="text"
            value={form.twitterHandle}
            onChange={(e) => handleChange('twitterHandle', e.target.value)}
            placeholder="@roktobondon"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-hidden transition-all"
          />
        </div>

        {/* Twitter Card Type */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">টুইটার কার্ড ফরম্যাট (Card Format)</label>
          <select
            value={form.twitterCardType}
            onChange={(e) => handleChange('twitterCardType', e.target.value as any)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-hidden transition-all bg-white"
          >
            <option value="summary_large_image">বড় ছবি কার্ড (Summary with Large Image)</option>
            <option value="summary">সাধারণ কার্ড (Standard Summary)</option>
          </select>
        </div>
      </div>

      {/* Indexing & Structured Data Toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <label className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.robotsIndex}
            onChange={(e) => handleChange('robotsIndex', e.target.checked)}
            className="mt-0.5 rounded text-red-600 focus:ring-red-500"
          />
          <div>
            <span className="text-xs font-bold text-slate-800 block">
              সার্চ ইঞ্জিনে ইনডেক্সিং চালু রাখুন (Index & Follow)
            </span>
            <span className="text-[11px] text-slate-500 leading-relaxed block mt-0.5">
              গুগল ও অন্যান্য সার্চ ইঞ্জিন যেন প্ল্যাটফর্মের পেজ ও ডোনার ডিরেক্টরি ইনডেক্স করতে পারে।
            </span>
          </div>
        </label>

        <label className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.structuredDataEnabled}
            onChange={(e) => handleChange('structuredDataEnabled', e.target.checked)}
            className="mt-0.5 rounded text-red-600 focus:ring-red-500"
          />
          <div>
            <span className="text-xs font-bold text-slate-800 block">
              Schema.org JSON-LD স্ট্রাকচার্ড ডেটা
            </span>
            <span className="text-[11px] text-slate-500 leading-relaxed block mt-0.5">
              গুগলে রিচ স্নsnippet ও ইমার্জেন্সি সার্ভিস হিসেবে র্যাংক করতে স্বয়ংক্রিয় JSON-LD ইনজেক্ট করুন।
            </span>
          </div>
        </label>
      </div>

      {/* Social Share Buttons Control */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
          <Share2 className="w-4 h-4 text-indigo-600" />
          <span>পাবলিক পেজে সক্রিয় সোশ্যাল শেয়ার বাটনসমূহ</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <button
            type="button"
            onClick={() => handleToggleSocialButton('whatsapp')}
            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              form.socialShareButtons.whatsapp
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => handleToggleSocialButton('facebook')}
            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              form.socialShareButtons.facebook
                ? 'bg-blue-50 border-blue-300 text-blue-800'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            <Facebook className="w-3.5 h-3.5" />
            <span>Facebook</span>
          </button>

          <button
            type="button"
            onClick={() => handleToggleSocialButton('telegram')}
            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              form.socialShareButtons.telegram
                ? 'bg-sky-50 border-sky-300 text-sky-800'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Telegram</span>
          </button>

          <button
            type="button"
            onClick={() => handleToggleSocialButton('twitter')}
            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              form.socialShareButtons.twitter
                ? 'bg-slate-900 border-slate-900 text-white'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            <Twitter className="w-3.5 h-3.5" />
            <span>Twitter</span>
          </button>

          <button
            type="button"
            onClick={() => handleToggleSocialButton('copyLink')}
            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              form.socialShareButtons.copyLink
                ? 'bg-slate-100 border-slate-300 text-slate-800'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Link</span>
          </button>
        </div>
      </div>

      {/* Urgent Crisis Share Template */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700">
            জরুরি রক্তের আবেদন সোশ্যাল শেয়ার মেসেজ টেমপ্লেট
          </label>
          <span className="text-[10px] text-slate-400">
            ভেরিয়েবল: {'{patientName}'}, {'{bloodGroup}'}, {'{requiredUnits}'}, {'{hospitalName}'}, {'{district}'}, {'{contactPhone}'}, {'{shareUrl}'}
          </span>
        </div>
        <textarea
          rows={4}
          value={form.crisisShareTemplateBn}
          onChange={(e) => handleChange('crisisShareTemplateBn', e.target.value)}
          placeholder="🚨 জরুরি রক্তের প্রয়োজন!..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-hidden transition-all leading-relaxed"
        />
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={handleReset}
          disabled={isLoading || isSaving}
          className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-2"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>ডিফল্ট রিসেট</span>
        </button>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4" />
              <span>সংরক্ষিত হয়েছে!</span>
            </span>
          )}
          <button
            type="submit"
            disabled={isLoading || isSaving}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'সেটিংস সংরক্ষণ করুন'}</span>
          </button>
        </div>
      </div>
    </form>
  );
};
