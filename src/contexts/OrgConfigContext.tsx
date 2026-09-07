import React, { createContext, useContext, useMemo } from 'react';
import type { OrganizationConfig } from '../types';
import { DEFAULT_SYSTEM_CONFIG } from '../services/configService';
import { useSystemConfig } from './SystemConfigContext';

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
  activeDistricts: ['ঢাকা (ধামরাই ও সাভার)', 'মানিকগঞ্জ', 'গাজীপুর'],
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
  updateConfig: (newConfig: Partial<OrganizationConfig>) => Promise<void>;
  resetConfig: () => void;
}

const OrgConfigContext = createContext<OrgConfigContextType | undefined>(undefined);

export const OrgConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { config: sysConfig, updateSection } = useSystemConfig();

  // Directly derive live OrganizationConfig from the central SystemConfigContext
  const config: OrganizationConfig = useMemo(() => {
    const org = sysConfig?.organization || DEFAULT_SYSTEM_CONFIG.organization;
    const brand = sysConfig?.branding || DEFAULT_SYSTEM_CONFIG.branding;
    const web = sysConfig?.website || DEFAULT_SYSTEM_CONFIG.website;

    return {
      id: 'org-roktobondon',
      name: org.organizationName || DEFAULT_ORG_CONFIG.name,
      nameBn: org.organizationNameBn || DEFAULT_ORG_CONFIG.nameBn,
      sloganBn: org.sloganBn || DEFAULT_ORG_CONFIG.sloganBn,
      headerSubtitleBn: brand.headerSubtitleBn || DEFAULT_ORG_CONFIG.headerSubtitleBn,
      logoUrl: brand.logoUrl || DEFAULT_ORG_CONFIG.logoUrl,
      primaryColor: brand.primaryColor || DEFAULT_ORG_CONFIG.primaryColor,
      emergencyHotline: org.emergencyPhone || org.phone || DEFAULT_ORG_CONFIG.emergencyHotline,
      email: org.email || DEFAULT_ORG_CONFIG.email,
      address: org.address || DEFAULT_ORG_CONFIG.address,
      facebookUrl: org.facebookUrl || DEFAULT_ORG_CONFIG.facebookUrl,
      activeDistricts: ['ঢাকা (ধামরাই ও সাভার)', 'মানিকগঞ্জ', 'গাজীপুর'],
      showAnnouncement: web.showAnnouncement ?? DEFAULT_ORG_CONFIG.showAnnouncement,
      announcementTextBn: web.announcementText || DEFAULT_ORG_CONFIG.announcementTextBn,
      announcementLink: web.announcementLink || DEFAULT_ORG_CONFIG.announcementLink,
      footerAboutBn: brand.footerAboutBn || DEFAULT_ORG_CONFIG.footerAboutBn,
      footerSecurityBadgeBn: brand.footerSecurityBadgeBn || DEFAULT_ORG_CONFIG.footerSecurityBadgeBn,
      footerTaglineBn: brand.footerTaglineBn || DEFAULT_ORG_CONFIG.footerTaglineBn,
      footerCopyrightText: brand.footerCopyrightText || DEFAULT_ORG_CONFIG.footerCopyrightText,
      coverageArea1Title: brand.coverageArea1Title || DEFAULT_ORG_CONFIG.coverageArea1Title,
      coverageArea1Details: brand.coverageArea1Details || DEFAULT_ORG_CONFIG.coverageArea1Details,
      coverageArea2Title: brand.coverageArea2Title || DEFAULT_ORG_CONFIG.coverageArea2Title,
      coverageArea2Details: brand.coverageArea2Details || DEFAULT_ORG_CONFIG.coverageArea2Details,
    };
  }, [sysConfig]);

  const updateConfig = async (newConfig: Partial<OrganizationConfig>) => {
    // 1. Sync Organization Section
    if (
      newConfig.name ||
      newConfig.nameBn ||
      newConfig.sloganBn ||
      newConfig.emergencyHotline ||
      newConfig.email ||
      newConfig.address ||
      newConfig.facebookUrl
    ) {
      await updateSection('organization', {
        organizationName: newConfig.name || config.name,
        organizationNameBn: newConfig.nameBn || config.nameBn,
        sloganBn: newConfig.sloganBn || config.sloganBn,
        emergencyPhone: newConfig.emergencyHotline || config.emergencyHotline,
        phone: newConfig.emergencyHotline || config.emergencyHotline,
        email: newConfig.email || config.email,
        address: newConfig.address || config.address,
        facebookUrl: newConfig.facebookUrl || config.facebookUrl,
      });
    }

    // 2. Sync Branding Section
    if (
      newConfig.primaryColor ||
      newConfig.logoUrl ||
      newConfig.headerSubtitleBn ||
      newConfig.footerAboutBn ||
      newConfig.footerSecurityBadgeBn ||
      newConfig.footerTaglineBn ||
      newConfig.footerCopyrightText ||
      newConfig.coverageArea1Title ||
      newConfig.coverageArea1Details ||
      newConfig.coverageArea2Title ||
      newConfig.coverageArea2Details
    ) {
      await updateSection('branding', {
        primaryColor: newConfig.primaryColor || config.primaryColor,
        logoUrl: newConfig.logoUrl || config.logoUrl,
        headerSubtitleBn: newConfig.headerSubtitleBn || config.headerSubtitleBn,
        footerAboutBn: newConfig.footerAboutBn || config.footerAboutBn,
        footerSecurityBadgeBn: newConfig.footerSecurityBadgeBn || config.footerSecurityBadgeBn,
        footerTaglineBn: newConfig.footerTaglineBn || config.footerTaglineBn,
        footerCopyrightText: newConfig.footerCopyrightText || config.footerCopyrightText,
        coverageArea1Title: newConfig.coverageArea1Title || config.coverageArea1Title,
        coverageArea1Details: newConfig.coverageArea1Details || config.coverageArea1Details,
        coverageArea2Title: newConfig.coverageArea2Title || config.coverageArea2Title,
        coverageArea2Details: newConfig.coverageArea2Details || config.coverageArea2Details,
      });
    }

    // 3. Sync Website Section
    if (
      newConfig.showAnnouncement !== undefined ||
      newConfig.announcementTextBn !== undefined ||
      newConfig.announcementLink !== undefined
    ) {
      await updateSection('website', {
        showAnnouncement: newConfig.showAnnouncement ?? config.showAnnouncement,
        announcementText: newConfig.announcementTextBn || config.announcementTextBn,
        announcementLink: newConfig.announcementLink || config.announcementLink,
      });
    }
  };

  const resetConfig = () => {
    // Reset to defaults
    updateConfig(DEFAULT_ORG_CONFIG);
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
    return {
      config: DEFAULT_ORG_CONFIG,
      updateConfig: async () => {},
      resetConfig: () => {},
    };
  }
  return context;
}

