import React, { createContext, useContext, useState, useEffect } from 'react';
import type { OrganizationConfig } from '../types';
import { DEFAULT_SYSTEM_CONFIG } from '../services/configService';

const DEFAULT_ORG_CONFIG: OrganizationConfig = {
  id: 'org-roktobondon',
  name: DEFAULT_SYSTEM_CONFIG.organization.organizationName,
  nameBn: DEFAULT_SYSTEM_CONFIG.organization.organizationNameBn,
  sloganBn: DEFAULT_SYSTEM_CONFIG.organization.sloganBn,
  headerSubtitleBn: DEFAULT_SYSTEM_CONFIG.branding.headerSubtitleBn,
  logoUrl: DEFAULT_SYSTEM_CONFIG.branding.logoUrl,
  primaryColor: DEFAULT_SYSTEM_CONFIG.branding.primaryColor,
  emergencyHotline: DEFAULT_SYSTEM_CONFIG.organization.emergencyPhone,
  email: DEFAULT_SYSTEM_CONFIG.organization.email,
  address: DEFAULT_SYSTEM_CONFIG.organization.address,
  facebookUrl: DEFAULT_SYSTEM_CONFIG.organization.facebookUrl,
  activeDistricts: ['ঢাকা (ধামরাই ও সাভার)', 'মানিকগঞ্জ'],
  // Dynamic Announcement Banner
  showAnnouncement: DEFAULT_SYSTEM_CONFIG.website.showAnnouncement,
  announcementTextBn: DEFAULT_SYSTEM_CONFIG.website.announcementText,
  announcementLink: DEFAULT_SYSTEM_CONFIG.website.announcementLink,
  // Dynamic Footer Fields
  footerAboutBn: DEFAULT_SYSTEM_CONFIG.branding.footerAboutBn,
  footerSecurityBadgeBn: DEFAULT_SYSTEM_CONFIG.branding.footerSecurityBadgeBn,
  footerTaglineBn: DEFAULT_SYSTEM_CONFIG.branding.footerTaglineBn,
  footerCopyrightText: DEFAULT_SYSTEM_CONFIG.branding.footerCopyrightText,
  coverageArea1Title: DEFAULT_SYSTEM_CONFIG.branding.coverageArea1Title,
  coverageArea1Details: DEFAULT_SYSTEM_CONFIG.branding.coverageArea1Details,
  coverageArea2Title: DEFAULT_SYSTEM_CONFIG.branding.coverageArea2Title,
  coverageArea2Details: DEFAULT_SYSTEM_CONFIG.branding.coverageArea2Details,
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
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_ORG_CONFIG, ...JSON.parse(saved) };
      }
      // Check if central sys_config exists
      const sysOrg = localStorage.getItem('roktobondon_sys_config_organization');
      const sysBrand = localStorage.getItem('roktobondon_sys_config_branding');
      const sysWeb = localStorage.getItem('roktobondon_sys_config_website');

      if (sysOrg || sysBrand || sysWeb) {
        const org = sysOrg ? JSON.parse(sysOrg) : {};
        const brand = sysBrand ? JSON.parse(sysBrand) : {};
        const web = sysWeb ? JSON.parse(sysWeb) : {};
        return {
          ...DEFAULT_ORG_CONFIG,
          name: org.organizationName || DEFAULT_ORG_CONFIG.name,
          nameBn: org.organizationNameBn || DEFAULT_ORG_CONFIG.nameBn,
          sloganBn: org.sloganBn || DEFAULT_ORG_CONFIG.sloganBn,
          emergencyHotline: org.emergencyPhone || DEFAULT_ORG_CONFIG.emergencyHotline,
          email: org.email || DEFAULT_ORG_CONFIG.email,
          address: org.address || DEFAULT_ORG_CONFIG.address,
          facebookUrl: org.facebookUrl || DEFAULT_ORG_CONFIG.facebookUrl,
          primaryColor: brand.primaryColor || DEFAULT_ORG_CONFIG.primaryColor,
          headerSubtitleBn: brand.headerSubtitleBn || DEFAULT_ORG_CONFIG.headerSubtitleBn,
          footerAboutBn: brand.footerAboutBn || DEFAULT_ORG_CONFIG.footerAboutBn,
          footerSecurityBadgeBn: brand.footerSecurityBadgeBn || DEFAULT_ORG_CONFIG.footerSecurityBadgeBn,
          footerTaglineBn: brand.footerTaglineBn || DEFAULT_ORG_CONFIG.footerTaglineBn,
          footerCopyrightText: brand.footerCopyrightText || DEFAULT_ORG_CONFIG.footerCopyrightText,
          coverageArea1Title: brand.coverageArea1Title || DEFAULT_ORG_CONFIG.coverageArea1Title,
          coverageArea1Details: brand.coverageArea1Details || DEFAULT_ORG_CONFIG.coverageArea1Details,
          coverageArea2Title: brand.coverageArea2Title || DEFAULT_ORG_CONFIG.coverageArea2Title,
          coverageArea2Details: brand.coverageArea2Details || DEFAULT_ORG_CONFIG.coverageArea2Details,
          showAnnouncement: web.showAnnouncement ?? DEFAULT_ORG_CONFIG.showAnnouncement,
          announcementTextBn: web.announcementText || DEFAULT_ORG_CONFIG.announcementTextBn,
          announcementLink: web.announcementLink || DEFAULT_ORG_CONFIG.announcementLink,
        };
      }
    } catch (e) {
      console.error('Failed to parse saved org config', e);
    }
    return DEFAULT_ORG_CONFIG;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.warn('Storage set error:', e);
    }
  }, [config]);

  const updateConfig = (newConfig: Partial<OrganizationConfig>) => {
    setConfig((prev) => {
      const merged = { ...prev, ...newConfig };
      // Also sync to systemConfig localStorage keys so central system stays in lockstep
      try {
        if (newConfig.name || newConfig.nameBn || newConfig.sloganBn || newConfig.emergencyHotline || newConfig.email || newConfig.address || newConfig.facebookUrl) {
          const rawOrg = localStorage.getItem('roktobondon_sys_config_organization');
          const currOrg = rawOrg ? JSON.parse(rawOrg) : DEFAULT_SYSTEM_CONFIG.organization;
          localStorage.setItem('roktobondon_sys_config_organization', JSON.stringify({
            ...currOrg,
            organizationName: merged.name,
            organizationNameBn: merged.nameBn,
            sloganBn: merged.sloganBn,
            emergencyPhone: merged.emergencyHotline,
            phone: merged.emergencyHotline,
            email: merged.email,
            address: merged.address,
            facebookUrl: merged.facebookUrl,
          }));
        }
        if (newConfig.primaryColor || newConfig.headerSubtitleBn || newConfig.footerAboutBn || newConfig.footerSecurityBadgeBn || newConfig.footerTaglineBn || newConfig.footerCopyrightText || newConfig.coverageArea1Title || newConfig.coverageArea1Details || newConfig.coverageArea2Title || newConfig.coverageArea2Details) {
          const rawBrand = localStorage.getItem('roktobondon_sys_config_branding');
          const currBrand = rawBrand ? JSON.parse(rawBrand) : DEFAULT_SYSTEM_CONFIG.branding;
          localStorage.setItem('roktobondon_sys_config_branding', JSON.stringify({
            ...currBrand,
            primaryColor: merged.primaryColor,
            headerSubtitleBn: merged.headerSubtitleBn,
            footerAboutBn: merged.footerAboutBn,
            footerSecurityBadgeBn: merged.footerSecurityBadgeBn,
            footerTaglineBn: merged.footerTaglineBn,
            footerCopyrightText: merged.footerCopyrightText,
            coverageArea1Title: merged.coverageArea1Title,
            coverageArea1Details: merged.coverageArea1Details,
            coverageArea2Title: merged.coverageArea2Title,
            coverageArea2Details: merged.coverageArea2Details,
          }));
        }
        if (newConfig.showAnnouncement !== undefined || newConfig.announcementTextBn !== undefined || newConfig.announcementLink !== undefined) {
          const rawWeb = localStorage.getItem('roktobondon_sys_config_website');
          const currWeb = rawWeb ? JSON.parse(rawWeb) : DEFAULT_SYSTEM_CONFIG.website;
          localStorage.setItem('roktobondon_sys_config_website', JSON.stringify({
            ...currWeb,
            showAnnouncement: merged.showAnnouncement,
            announcementText: merged.announcementTextBn,
            announcementLink: merged.announcementLink,
          }));
        }
      } catch (err) {
        console.warn('Sync to sys config notice:', err);
      }
      return merged;
    });
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
