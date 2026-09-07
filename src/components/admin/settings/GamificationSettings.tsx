import React, { useState, useEffect } from 'react';
import {
  Award,
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Trophy,
  Medal,
  Users,
  Eye,
  FileCheck,
} from 'lucide-react';
import { useSystemConfig } from '../../../contexts/SystemConfigContext';
import { useDialog } from '../../../contexts/DialogContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useData } from '../../../contexts/DataContext';
import { DEFAULT_SYSTEM_CONFIG } from '../../../services/configService';
import type { GamificationSettingsConfig } from '../../../types/config';

export const GamificationSettings: React.FC = () => {
  const { config, updateSection, isLoading } = useSystemConfig();
  const { addAuditLog } = useData();
  const { currentUser } = useAuth();
  const dialog = useDialog();

  const [form, setForm] = useState<GamificationSettingsConfig>(
    config?.gamification || DEFAULT_SYSTEM_CONFIG.gamification
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (config?.gamification) {
      setForm(config.gamification);
    }
  }, [config?.gamification]);

  const handleChange = (field: keyof GamificationSettingsConfig, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleMilestoneChange = (
    tier: keyof GamificationSettingsConfig['donorLevelMilestones'],
    val: number
  ) => {
    setForm((prev) => ({
      ...prev,
      donorLevelMilestones: {
        ...prev.donorLevelMilestones,
        [tier]: Math.max(1, Number(val) || 1),
      },
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSection('gamification', form);
      addAuditLog(
        'সনদপত্র, ব্যাজ ও গ্যামিফিকেশন নীতিমালা আপডেট করা হয়েছে',
        'CONFIG',
        'GAMIFICATION_SETTINGS',
        { form },
        currentUser ? { id: currentUser.id, name: currentUser.fullName, role: currentUser.role } : undefined
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      dialog.alert({
        title: 'সেটিংস সংরক্ষিত হয়েছে',
        message: 'সনদপত্র স্বাক্ষরকারী, ব্যাজ ও গ্যামিফিকেশন সেটিংস সফলভাবে আপডেট হয়েছে।',
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
      message: 'আপনি কি নিশ্চিত যে সনদপত্র ও গ্যামিফিকেশন সেটিংস পূর্বাবস্থায় ফিরিয়ে নিতে চান?',
      type: 'warning',
      confirmText: 'হ্যাঁ, রিসেট করুন',
      cancelText: 'বাতিল',
    });
    if (!confirmed) return;

    try {
      await updateSection('gamification', DEFAULT_SYSTEM_CONFIG.gamification);
      setForm(DEFAULT_SYSTEM_CONFIG.gamification);
      dialog.alert({
        title: 'রিসেট সম্পন্ন',
        message: 'গ্যামিফিকেশন সেটিংস ডিফল্ট মানে রিসেট করা হয়েছে।',
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

  // Certificate template visual theme styles
  const templateThemeStyles = {
    classic_gold: {
      border: 'border-amber-400 bg-gradient-to-br from-amber-50/40 via-white to-amber-50/20',
      sealColor: 'text-amber-600',
      badgeBg: 'bg-amber-500',
      label: 'স্বর্ণালী ক্লাসিক (Classic Gold)',
    },
    modern_emerald: {
      border: 'border-emerald-500 bg-gradient-to-br from-emerald-50/40 via-white to-emerald-50/20',
      sealColor: 'text-emerald-600',
      badgeBg: 'bg-emerald-600',
      label: 'আধুনিক পান্না সবুজ (Modern Emerald)',
    },
    crimson_prestige: {
      border: 'border-rose-500 bg-gradient-to-br from-rose-50/40 via-white to-red-50/20',
      sealColor: 'text-rose-600',
      badgeBg: 'bg-red-600',
      label: 'রক্তিম প্রিমিয়াম (Crimson Prestige)',
    },
  };

  const currentTheme = templateThemeStyles[form.certificateTemplate] || templateThemeStyles.classic_gold;

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200/80">
        <div className="flex items-center gap-2 text-slate-800">
          <Award className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <h4 className="font-bold text-xs">ডিজিটাল সনদপত্র, অর্জন পদক ও গ্যামিফিকেশন গভর্ন্যান্স</h4>
            <p className="text-[11px] text-slate-500">
              রক্তদাতাদের সম্মাননা সনদপত্রের স্বাক্ষরকারী, পদক মাইলস্টোন, লিডারবোর্ড ও পয়েন্ট সিস্টেম নিয়ন্ত্রণ করুন
            </p>
          </div>
        </div>
      </div>

      {/* Live Sample Certificate Simulator */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold border-b border-slate-100 pb-2">
          <span className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-slate-400" />
            লাইভ সনদপত্র সিমুলেটর প্রিভিউ (Live Certificate Preview)
          </span>
          <span className="text-indigo-600 font-bold">{currentTheme.label}</span>
        </div>

        <div className={`p-6 sm:p-8 rounded-2xl border-4 ${currentTheme.border} shadow-sm text-center space-y-3 relative overflow-hidden`}>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold tracking-wider uppercase">
            <Sparkles className="w-3 h-3 text-amber-500" /> Certificate of Voluntary Blood Donation
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            রক্তদাতা সম্মাননা সনদপত্র
          </h3>
          <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
            মুমূর্ষু রোগীর জীবন রক্ষার্থে নিঃস্বার্থভাবে রক্তদান করায় জনাব/জনাবা <strong className="text-slate-900">আব্দুল করিম</strong>-কে এই কৃতজ্ঞতাসূচক সম্মাননা প্রদান করা হলো।
          </p>

          <div className="pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-md mx-auto text-left">
            <div className="text-center sm:text-left">
              <div className="w-24 h-0.5 bg-slate-400 mb-1 mx-auto sm:mx-0"></div>
              <p className="text-xs font-bold text-slate-900">{form.organizationSignatoryNameBn || form.organizationSignatoryName || 'সমন্বয়ক'}</p>
              <p className="text-[10px] text-slate-500">{form.organizationSignatoryTitleBn || form.organizationSignatoryTitle || 'রক্তবন্ধন'}</p>
            </div>
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-200 text-center">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <div>
                <span className="text-[10px] font-extrabold text-slate-900 block">১০০% ভেরিফাইড</span>
                <span className="text-[9px] text-slate-400 font-mono">CODE: RB-CERT-2026</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Signatory Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">সনদপত্র স্বাক্ষরকারীর নাম (বাংলা)</label>
          <input
            type="text"
            value={form.organizationSignatoryNameBn}
            onChange={(e) => handleChange('organizationSignatoryNameBn', e.target.value)}
            placeholder="মুহাম্মদ ইউসুফ"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-hidden transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">স্বাক্ষরকারীর নাম (English)</label>
          <input
            type="text"
            value={form.organizationSignatoryName}
            onChange={(e) => handleChange('organizationSignatoryName', e.target.value)}
            placeholder="Mohammad Yusuf"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-hidden transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">স্বাক্ষরকারীর পদবি (বাংলা)</label>
          <input
            type="text"
            value={form.organizationSignatoryTitleBn}
            onChange={(e) => handleChange('organizationSignatoryTitleBn', e.target.value)}
            placeholder="কেন্দ্রীয় সমন্বয়ক, রক্তবন্ধন"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-hidden transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">স্বাক্ষরকারীর পদবি (English)</label>
          <input
            type="text"
            value={form.organizationSignatoryTitle}
            onChange={(e) => handleChange('organizationSignatoryTitle', e.target.value)}
            placeholder="Lead Coordinator, RoktoBondon"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-hidden transition-all"
          />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <label className="text-xs font-bold text-slate-700">সনদপত্রের ভিজ্যুয়াল ডিজাইন থিম (Theme Template)</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {Object.entries(templateThemeStyles).map(([key, style]) => {
              const isSelected = form.certificateTemplate === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleChange('certificateTemplate', key)}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-red-600 bg-red-50/50 shadow-xs ring-2 ring-red-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-900 block">{style.label}</span>
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Milestone Thresholds */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
          <Medal className="w-4 h-4 text-amber-500" />
          <span>রক্তদাতা সম্মাননা স্তর ও অর্জনের রক্তদান সংখ্যা (Milestone Thresholds)</span>
        </div>
        <p className="text-[11px] text-slate-500">
          রক্তদাতারা নির্দিষ্ট পরিমাণ রক্তদান সম্পন্ন করার সাথে সাথে স্বয়ংক্রিয়ভাবে নতুন পদক ও সম্মাননা স্তর আনলক করবেন।
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
              🥉 ব্রোঞ্জ পদক
            </span>
            <input
              type="number"
              min={1}
              value={form.donorLevelMilestones.bronze}
              onChange={(e) => handleMilestoneChange('bronze', Number(e.target.value))}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white"
            />
            <span className="text-[10px] text-slate-400 block">ন্যূনতম রক্তদান</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <span className="text-[11px] font-bold text-sky-700 flex items-center gap-1">
              🥈 রৌপ্য পদক
            </span>
            <input
              type="number"
              min={1}
              value={form.donorLevelMilestones.silver}
              onChange={(e) => handleMilestoneChange('silver', Number(e.target.value))}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white"
            />
            <span className="text-[10px] text-slate-400 block">ন্যূনতম রক্তদান</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <span className="text-[11px] font-bold text-yellow-700 flex items-center gap-1">
              🥇 স্বর্ণ পদক
            </span>
            <input
              type="number"
              min={1}
              value={form.donorLevelMilestones.gold}
              onChange={(e) => handleMilestoneChange('gold', Number(e.target.value))}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white"
            />
            <span className="text-[10px] text-slate-400 block">ন্যূনতম রক্তদান</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <span className="text-[11px] font-bold text-purple-700 flex items-center gap-1">
              💎 প্লাটিনাম
            </span>
            <input
              type="number"
              min={1}
              value={form.donorLevelMilestones.platinum}
              onChange={(e) => handleMilestoneChange('platinum', Number(e.target.value))}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white"
            />
            <span className="text-[10px] text-slate-400 block">ন্যূনতম রক্তদান</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
              👑 লেজেন্ড
            </span>
            <input
              type="number"
              min={1}
              value={form.donorLevelMilestones.legend}
              onChange={(e) => handleMilestoneChange('legend', Number(e.target.value))}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white"
            />
            <span className="text-[10px] text-slate-400 block">ন্যূনতম রক্তদান</span>
          </div>
        </div>
      </div>

      {/* Gamification Points & Leaderboard */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span>পয়েন্ট ও লিডারবোর্ড গভর্ন্যান্স (Points & Leaderboard Engine)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">প্রতি সাধারণ রক্তদানে পয়েন্ট</label>
            <input
              type="number"
              min={10}
              value={form.pointsPerDonation}
              onChange={(e) => handleChange('pointsPerDonation', Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">জরুরি রক্তদানে পয়েন্ট</label>
            <input
              type="number"
              min={10}
              value={form.pointsPerEmergencyDonation}
              onChange={(e) => handleChange('pointsPerEmergencyDonation', Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">নতুন ডোনার রেফারেল পয়েন্ট</label>
            <input
              type="number"
              min={0}
              value={form.pointsPerReferral}
              onChange={(e) => handleChange('pointsPerReferral', Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold"
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <label className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.leaderboardEnabled}
              onChange={(e) => handleChange('leaderboardEnabled', e.target.checked)}
              className="mt-0.5 rounded text-red-600 focus:ring-red-500"
            />
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                পাবলিক লিডারবোর্ড প্রদর্শন চালু রাখুন
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                সর্বাধিক রক্তদানকারী বীর রক্তদাতাদের তালিকা ওয়েবসাইটে প্রকাশিত থাকবে।
              </span>
            </div>
          </label>

          <label className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.allowPublicCertificates}
              onChange={(e) => handleChange('allowPublicCertificates', e.target.checked)}
              className="mt-0.5 rounded text-red-600 focus:ring-red-500"
            />
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                পাবলিক সনদপত্র যাচাইকরণ অনুমোদন
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                যেকোনো ব্যক্তি বা হাসপাতাল ডোনার আইডি দিয়ে সনদপত্রের সত্যতা যাচাই করতে পারবে।
              </span>
            </div>
          </label>
        </div>
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
