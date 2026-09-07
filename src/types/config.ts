/**
 * System Configuration Types
 * Defines the schema and structure for each document in the `systemConfig` collection.
 */

export interface OrganizationSettingsConfig {
  organizationName: string;
  organizationNameBn: string;
  shortName: string;
  slogan: string;
  sloganBn: string;
  description: string;
  descriptionBn: string;
  phone: string;
  emergencyPhone: string;
  email: string;
  address: string;
  website: string;
  facebookUrl: string;
}

export interface BrandingSettingsConfig {
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  headerTitle: string;
  headerSubtitle: string;
  headerSubtitleBn: string;
  footerAboutBn: string;
  footerSecurityBadgeBn: string;
  footerTaglineBn: string;
  footerCopyrightText: string;
  coverageArea1Title: string;
  coverageArea1Details: string;
  coverageArea2Title: string;
  coverageArea2Details: string;
}

export interface WebsiteSettingsConfig {
  homepageTitle: string;
  homepageSubtitle: string;
  ctaText: string;
  ctaLink: string;
  showAnnouncement: boolean;
  announcementText: string;
  announcementLink: string;
  hotline: string;
  copyright: string;
  socialLinks: {
    facebook?: string;
    youtube?: string;
    twitter?: string;
    instagram?: string;
  };
}

export interface BloodSystemConfig {
  activeBloodGroups: string[];
  displayLabels: Record<string, string>;
  order: string[];
}

export interface MatchingWeightsConfig {
  compatibilityWeight: number;
  distanceWeight: number;
  availabilityWeight: number;
  eligibilityWeight: number;
  verificationWeight: number;
  reliabilityWeight: number;
  responseRateWeight: number;
  emergencyWeight: number;
  maxSearchRadiusKm: number;
  strictEligibility: boolean;
}

export interface DonorEligibilityConfig {
  minimumDonationIntervalDays: number;
  femaleMinimumDonationIntervalDays: number;
  minimumAge: number;
  maximumAge: number;
  minimumWeightKg: number;
  temporaryDeferralEnabled: boolean;
  requireVerification: boolean;
  requireAvailability: boolean;
}

export interface BloodRequestsConfig {
  requestEnabled: boolean;
  emergencyRequestEnabled: boolean;
  requirePhoneVerification: boolean;
  requireHospital: boolean;
  requireBloodGroup: boolean;
  requireUnits: boolean;
  minimumUnits: number;
  maximumUnits: number;
  requestExpiryHours: number;
  autoMatchingEnabled: boolean;
  autoBroadcastEnabled: boolean;
}

export interface EmergencySettingsConfig {
  emergencyMode: boolean;
  emergencyPriority: number;
  broadcastEnabled: boolean;
  broadcastRadiusKm: number;
  repeatNotification: boolean;
  maxNotificationsPerRequest: number;
  escalationEnabled: boolean;
  escalationAfterMinutes: number;
  autoExpireAfterHours: number;
}

export interface NotificationSettingsConfig {
  smsEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  whatsappEnabled: boolean;
  defaultLanguage: 'bn' | 'en';
  smsProvider: string;
  emailProvider: string;
}

export interface PrivacySettingsConfig {
  publicDonorProfile: boolean;
  showBloodGroup: boolean;
  showDistrict: boolean;
  showUpazila: boolean;
  showAvailability: boolean;
  showEmergencyStatus: boolean;
  allowDirectContactDefault: boolean;
}

export interface MaintenanceSettingsConfig {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  allowedRoles: string[];
}

export interface SecuritySettingsConfig {
  sessionTimeoutMinutes: number;
  requireMfaForAdmin: boolean;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
}

export interface SeoSettingsConfig {
  siteTitle: string;
  siteTitleBn: string;
  metaDescription: string;
  metaDescriptionBn: string;
  metaKeywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  twitterCardType: 'summary' | 'summary_large_image';
  twitterHandle: string;
  canonicalUrl: string;
  structuredDataEnabled: boolean;
  googleSiteVerification: string;
  robotsIndex: boolean;
  socialShareButtons: {
    facebook: boolean;
    whatsapp: boolean;
    telegram: boolean;
    twitter: boolean;
    copyLink: boolean;
  };
  crisisShareTemplateBn: string;
}

export interface GamificationSettingsConfig {
  enabled: boolean;
  allowPublicCertificates: boolean;
  requireVerificationForCertificate: boolean;
  organizationSignatoryName: string;
  organizationSignatoryTitle: string;
  organizationSignatoryNameBn: string;
  organizationSignatoryTitleBn: string;
  certificateTemplate: 'classic_gold' | 'modern_emerald' | 'crimson_prestige';
  donorLevelMilestones: {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
    legend: number;
  };
  pointsPerDonation: number;
  pointsPerEmergencyDonation: number;
  pointsPerReferral: number;
  leaderboardEnabled: boolean;
  leaderboardTimeframe: 'all_time' | 'yearly' | 'monthly';
}

export interface PwaSettingsConfig {
  appName: string;
  appNameBn: string;
  shortName: string;
  shortNameBn: string;
  descriptionBn: string;
  themeColor: string;
  backgroundColor: string;
  displayMode: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  startUrl: string;
  offlineCaching: boolean;
  cacheStrategy: 'network-first' | 'cache-first' | 'stale-while-revalidate';
  backgroundSyncEnabled: boolean;
  offlineEmergencyDirectory: boolean;
  autoUpdatePrompt: boolean;
  installBannerEnabled: boolean;
  appVersion: string;
}

export type SystemConfigSection =
  | 'organization'
  | 'branding'
  | 'website'
  | 'seo'
  | 'gamification'
  | 'pwa'
  | 'bloodSystem'
  | 'matching'
  | 'donorEligibility'
  | 'bloodRequests'
  | 'emergency'
  | 'notifications'
  | 'privacy'
  | 'maintenance'
  | 'security';

export interface SystemConfig {
  organization: OrganizationSettingsConfig;
  branding: BrandingSettingsConfig;
  website: WebsiteSettingsConfig;
  seo: SeoSettingsConfig;
  gamification: GamificationSettingsConfig;
  pwa: PwaSettingsConfig;
  bloodSystem: BloodSystemConfig;
  matching: MatchingWeightsConfig;
  donorEligibility: DonorEligibilityConfig;
  bloodRequests: BloodRequestsConfig;
  emergency: EmergencySettingsConfig;
  notifications: NotificationSettingsConfig;
  privacy: PrivacySettingsConfig;
  maintenance: MaintenanceSettingsConfig;
  security: SecuritySettingsConfig;
}
