import React, { useState } from 'react';
import {
  Settings,
  Building,
  Palette,
  Layout,
  CreditCard,
  Database,
  Download,
} from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useDialog } from '../../../contexts/DialogContext';
import { PaymentMethodModal } from '../../modals';
import { OrganizationSettings } from './OrganizationSettings';
import { BrandingSettings } from './BrandingSettings';
import { WebsiteSettings } from './WebsiteSettings';
import { SeoSettings } from './SeoSettings';
import { GamificationSettings } from './GamificationSettings';
import { BloodSystemSettings } from '../blood/BloodSystemSettings';
import { MatchingSettings } from '../blood/MatchingSettings';
import { DonorEligibilitySettings } from '../blood/DonorEligibilitySettings';
import { BloodRequestSettings } from '../requests/BloodRequestSettings';
import { EmergencyControlSettings } from '../emergency/EmergencyControlSettings';
import type { PaymentMethodConfig } from '../../../types';
import { Droplets, SlidersHorizontal, UserCheck, FileText, Flame, Globe, Award } from 'lucide-react';

interface AdminSettingsTabProps {
  onNavigateToTab?: (tab: string) => void;
}

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({ onNavigateToTab }) => {
  const { paymentMethods, addPaymentMethod, updatePaymentMethod } = useData();
  const dialog = useDialog();

  const [activeSubtab, setActiveSubtab] = useState<
    'organization' | 'branding' | 'website' | 'seo' | 'gamification' | 'blood' | 'matching' | 'eligibility' | 'requests' | 'emergency' | 'quick'
  >('organization');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentForEdit, setSelectedPaymentForEdit] = useState<PaymentMethodConfig | null>(null);

  const subtabs: { id: typeof activeSubtab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'organization', label: 'প্রতিষ্ঠান ও পরিচিতি', icon: Building },
    { id: 'branding', label: 'ব্র্যান্ডিং ও ডিজাইন', icon: Palette },
    { id: 'website', label: 'ওয়েবসাইট ও ব্যানার', icon: Layout },
    { id: 'seo', label: 'এসইও ও সোশ্যাল শেয়ারিং', icon: Globe },
    { id: 'gamification', label: 'সনদপত্র ও সম্মাননা', icon: Award },
    { id: 'blood', label: 'রক্তের গ্রুপ ও কম্প্যাটিবিলিটি', icon: Droplets },
    { id: 'matching', label: 'ম্যাচিং স্কোরিং ও অ্যালগরিদম', icon: SlidersHorizontal },
    { id: 'eligibility', label: 'রক্তদাতা যোগ্যতা নীতি', icon: UserCheck },
    { id: 'requests', label: 'আবেদন নীতিমালা ও নিয়ন্ত্রণ', icon: FileText },
    { id: 'emergency', label: 'জরুরি ও ব্রডকাস্ট নীতি', icon: Flame },
    { id: 'quick', label: 'পেমেন্ট ও সিস্টেম শর্টকাট', icon: CreditCard },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Settings className="w-5 h-5 text-red-600" />
              প্ল্যাটফর্ম ও সেন্ট্রাল কন্ট্রোল সেন্টার সেটিংস (Control Center Settings)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              সংগঠনের পরিচিতি, লোগো, এসইও, সনদপত্র স্বাক্ষরকারী, রক্তের গ্রুপ ম্যাট্রিক্স, ম্যাচিং ওয়েটস, ডোনার পলিসি, আবেদন ও জরুরি ব্রডকাস্ট নীতি নিয়ন্ত্রণ করুন
            </p>
          </div>
        </div>

        {/* Sub-navigation tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-100">
          {subtabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubtab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubtab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  isActive
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Subtab Panels */}
        {activeSubtab === 'organization' && <OrganizationSettings />}
        {activeSubtab === 'branding' && <BrandingSettings />}
        {activeSubtab === 'website' && <WebsiteSettings />}
        {activeSubtab === 'seo' && <SeoSettings />}
        {activeSubtab === 'gamification' && <GamificationSettings />}
        {activeSubtab === 'blood' && <BloodSystemSettings />}
        {activeSubtab === 'matching' && <MatchingSettings />}
        {activeSubtab === 'eligibility' && <DonorEligibilitySettings />}
        {activeSubtab === 'requests' && <BloodRequestSettings />}
        {activeSubtab === 'emergency' && <EmergencyControlSettings />}

        {/* Quick Shortcuts */}
        {activeSubtab === 'quick' && (
          <div className="space-y-4 text-xs">
            <div className="bg-purple-50/60 p-3.5 rounded-xl border border-purple-100 text-slate-700 text-xs flex items-start gap-2">
              <CreditCard className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-purple-900 block">পেমেন্ট মেথড ও আর্থিক অনুদান সরাসরি ব্যবস্থাপনা:</span>
                বিকাশ, নগদ, রকেট, ব্যাংক অ্যাকাউন্ট সেটিংস পরিবর্তন করতে বা নতুন পেমেন্ট মেথড যুক্ত করতে নিচের শর্টকাটগুলো ব্যবহার করুন।
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                  <CreditCard className="w-4 h-4 text-red-600" />
                  পেমেন্ট মেথড কনফিগারেশন
                </h4>
                <p className="text-slate-500 text-[11px]">
                  বর্তমান সক্রিয় মেথড: {paymentMethods.filter((m) => m.isActive).length} টি (বিকাশ, নগদ, রকেট, ইত্যাদি)
                </p>
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPaymentForEdit(null);
                      setShowPaymentModal(true);
                    }}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition-colors"
                  >
                    + নতুন মেথড যুক্ত করুন
                  </button>
                  {onNavigateToTab && (
                    <button
                      type="button"
                      onClick={() => onNavigateToTab('funds')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors"
                    >
                      তহবিল তালিকা দেখুন
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                  <Database className="w-4 h-4 text-emerald-600" />
                  ডাটা ব্যাকআপ ও নিরাপত্তা
                </h4>
                <p className="text-slate-500 text-[11px]">
                  সম্পূর্ণ প্ল্যাটফর্ম কনফিগারেশন ও ডাটাবেজ এক ক্লিকে JSON ফাইলে ডাউনলোড ও রিস্টোর করুন।
                </p>
                <div className="pt-2">
                  {onNavigateToTab && (
                    <button
                      type="button"
                      onClick={() => onNavigateToTab('backup')}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs flex items-center gap-1 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      ডাটা ব্যাকআপ ট্যাবে যান
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

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
