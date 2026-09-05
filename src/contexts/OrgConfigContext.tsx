import React, { createContext, useContext, useState, useEffect } from 'react';
import type { OrganizationConfig } from '../types';

const DEFAULT_ORG_CONFIG: OrganizationConfig = {
  id: 'org-roktobondon',
  name: 'রক্তবন্ধন (RoktoBondon)',
  nameBn: 'রক্তবন্ধন রক্তদান সংগঠন',
  sloganBn: 'রক্তের বন্ধনে বাঁচুক প্রতিটি প্রাণ — ধামরাই, সাভার ও মানিকগঞ্জ',
  headerSubtitleBn: 'ধামরাই • সাভার • মানিকগঞ্জ',
  logoUrl: '',
  primaryColor: '#dc2626',
  emergencyHotline: '+8801712-345678',
  email: 'help@roktobondon.org',
  address: 'ধামরাই ও সাভার কেন্দ্রীয় কার্যালয়, ঢাকা',
  facebookUrl: 'https://facebook.com/roktobondon',
  activeDistricts: ['ঢাকা (ধামরাই ও সাভার)', 'মানিকগঞ্জ'],
  // Dynamic Announcement Banner
  showAnnouncement: true,
  announcementTextBn: 'জরুরি রক্তের প্রয়োজনে ২৪ ঘণ্টা হটলাইনে যোগাযোগ করুন অথবা রক্তের আবেদন ফরম পূরণ করুন!',
  announcementLink: '/request-blood',
  // Dynamic Footer Fields
  footerAboutBn: 'ধামরাই, সাভার ও মানিকগঞ্জে জরুরি রক্তের প্রয়োজনে নিঃস্বার্থ রক্তদাতাদের তাৎক্ষণিক সংযোগকারী মানবিক ও স্বেচ্ছাসেবী প্রযুক্তি প্ল্যাটফর্ম।',
  footerSecurityBadgeBn: 'নিরাপদ ও প্রাইভেসি-সুরক্ষিত ডোনার ডেটাবেজ',
  footerTaglineBn: 'ধামরাই, সাভার ও মানিকগঞ্জ',
  footerCopyrightText: 'সর্বস্বত্ব সংরক্ষিত।',
  coverageArea1Title: 'ধামরাই ও সাভার শাখা (ঢাকা)',
  coverageArea1Details: 'ধামরাই সদর, কালামপুর, কুশুরা, বালিয়া, সাভার বাজার, আশুলিয়া',
  coverageArea2Title: 'মানিকগঞ্জ জেলা শাখা',
  coverageArea2Details: 'মানিকগঞ্জ সদর, সিংগাইর, সাটুরিয়া, শিবালয়, হরিরামপুর',
};

interface OrgConfigContextType {
  config: OrganizationConfig;
  updateConfig: (newConfig: Partial<OrganizationConfig>) => void;
  resetConfig: () => void;
}

const OrgConfigContext = createContext<OrgConfigContextType | undefined>(undefined);

const STORAGE_KEY = 'roktobondon_org_config';

export const OrgConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<OrganizationConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return { ...DEFAULT_ORG_CONFIG, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Failed to parse saved org config', e);
      }
    }
    return DEFAULT_ORG_CONFIG;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  const updateConfig = (newConfig: Partial<OrganizationConfig>) => {
    setConfig((prev) => ({ ...prev, ...newConfig }));
  };

  const resetConfig = () => {
    setConfig(DEFAULT_ORG_CONFIG);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <OrgConfigContext.Provider value={{ config, updateConfig, resetConfig }}>
      {children}
    </OrgConfigContext.Provider>
  );
};

export function useOrgConfig(): OrgConfigContextType {
  const context = useContext(OrgConfigContext);
  if (!context) {
    throw new Error('useOrgConfig must be used within an OrgConfigProvider');
  }
  return context;
}
