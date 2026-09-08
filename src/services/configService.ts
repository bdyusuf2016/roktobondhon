/**
 * Central Configuration Service
 * Authoritative interface for reading, validating, and updating system configuration.
 */

import type {
  SystemConfig,
  SystemConfigSection,
  OrganizationSettingsConfig,
  BrandingSettingsConfig,
  WebsiteSettingsConfig,
  SeoSettingsConfig,
  GamificationSettingsConfig,
  BloodSystemConfig,
  MatchingWeightsConfig,
  DonorEligibilityConfig,
  BloodRequestsConfig,
  EmergencySettingsConfig,
  NotificationSettingsConfig,
  PrivacySettingsConfig,
  MaintenanceSettingsConfig,
  SecuritySettingsConfig,
} from '../types/config';
import { recordAuditLog } from './auditService';

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  organization: {
    organizationName: 'রক্ত দান পরিবার কালামপুর (Rokto Dan Poribar Kalampur)',
    organizationNameBn: 'রক্ত দান পরিবার কালামপুর',
    shortName: 'রক্ত দান পরিবার কালামপুর',
    slogan: 'Saving lives through voluntary blood donation',
    sloganBn: 'রক্তের বন্ধনে বাঁচুক প্রতিটি প্রাণ — কালামপুর, ধামরাই, সাভার ও মানিকগঞ্জ',
    description: 'A voluntary blood donation network connecting donors with recipients.',
    descriptionBn: 'কালামপুর, ধামরাই, সাভার ও মানিকগঞ্জে জরুরি রক্তের প্রয়োজনে নিঃস্বার্থ রক্তদাতাদের তাৎক্ষণিক সংযোগকারী প্ল্যাটফর্ম।',
    phone: '+8801712-345678',
    emergencyPhone: '+8801712-345678',
    email: 'help@roktodanporibar.org',
    address: 'কালামপুর বাজার, ধামরাই ও সাভার কেন্দ্রীয় কার্যালয়, ঢাকা',
    website: 'https://bdyusuf2016.github.io/roktobondhon/',
    facebookUrl: 'https://facebook.com/roktodanporibarkalampur',
  },
  branding: {
    logoUrl: `${(typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/roktobondhon/'}logo.png`,
    faviconUrl: `${(typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/roktobondhon/'}favicon.png`,
    primaryColor: '#dc2626',
    headerTitle: 'রক্ত দান পরিবার কালামপুর',
    headerSubtitle: 'কালামপুর • ধামরাই • সাভার',
    headerSubtitleBn: 'কালামপুর • ধামরাই • সাভার • মানিকগঞ্জ এলাকা',
    footerAboutBn: 'রক্ত দান পরিবার কালামপুর একটি সম্পূর্ণ অলাভজনক ও স্বেচ্ছাসেবী মানবিক উদ্যোগ। কালামপুর, ধামরাই, সাভার ও মানিকগঞ্জে রক্তের সংকটে বিনামূল্যে সাহায্য করতে আমরা নিবেদিত।',
    footerSecurityBadgeBn: '১০০% নিরাপদ ও ভেরিফায়েড রক্তদাতা নেটওয়ার্ক',
    footerTaglineBn: 'স্বেচ্ছায় রক্তদান, বাঁচায় রোগীর প্রাণ।',
    footerCopyrightText: 'সর্বস্বত্ব সংরক্ষিত।',
    coverageArea1Title: 'কালামপুর ও ধামরাই শাখা (ঢাকা)',
    coverageArea1Details: 'কালামপুর বাজার, ধামরাই সদর, কুশুরা, বালিয়া, সাভার বাজার, আশুলিয়া',
    coverageArea2Title: 'মানিকগঞ্জ জেলা শাখা',
    coverageArea2Details: 'মানিকগঞ্জ সদর, সিংগাইর, সাটুরিয়া, শিবালয়, হরিরামপুর',
  },
  website: {
    homepageTitle: 'রক্তের বন্ধনে বাঁচুক প্রতিটি প্রাণ',
    homepageSubtitle: 'কালামপুর, ধামরাই, সাভার ও মানিকগঞ্জে জরুরি রক্তের প্রয়োজনে তাৎক্ষণিক রক্তদাতা খুঁজুন।',
    ctaText: 'রক্তদাতা খুঁজুন',
    ctaLink: '/find-blood',
    showAnnouncement: true,
    announcementText: 'জরুরি রক্তের প্রয়োজনে ২৪ ঘণ্টা হটলাইনে যোগাযোগ করুন অথবা রক্তের আবেদন ফরম পূরণ করুন!',
    announcementLink: '/request-blood',
    hotline: '+8801712-345678',
    copyright: '© 2026 রক্ত দান পরিবার কালামপুর। সর্বস্বত্ব সংরক্ষিত।',
    socialLinks: {
      facebook: 'https://facebook.com/roktodanporibarkalampur',
    },
  },
  seo: {
    siteTitle: 'রক্ত দান পরিবার কালামপুর - রক্তদান ও ডোনার প্ল্যাটফর্ম',
    siteTitleBn: 'রক্ত দান পরিবার কালামপুর — কালামপুর, ধামরাই, সাভার ও মানিকগঞ্জের স্বেচ্ছাসেবী রক্তদান প্ল্যাটফর্ম',
    metaDescription: 'কালামপুর, ধামরাই, সাভার ও মানিকগঞ্জ সহ সারাদেশে জরুরি রক্তের প্রয়োজনে রক্তদাতা অনুসন্ধান, রক্তের আবেদন ও স্বেচ্ছাসেবী রক্তদান নেটওয়ার্ক।',
    metaDescriptionBn: 'জরুরি রক্তের প্রয়োজনে রক্তের আবেদন করুন বা রক্তদাতা হিসেবে যুক্ত হয়ে বিনামূল্যে মুমূর্ষু রোগীর জীবন বাঁচান।',
    metaKeywords: 'রক্তদান পরিবার কালামপুর, রক্তদান, ব্লাড ডোনার, কালামপুর ব্লাড ডোনার, ধামরাই ব্লাড ডোনার, সাভার রক্তদাতা, মানিকগঞ্জ রক্তদান, Blood Donor Kalampur, Rokto Dan Poribar Kalampur',
    ogTitle: 'রক্ত দান পরিবার কালামপুর — রক্তের বন্ধনে বাঁচুক প্রতিটি প্রাণ',
    ogDescription: 'কালামপুর, ধামরাই, সাভার ও মানিকগঞ্জে জরুরি রক্তের প্রয়োজনে তাৎক্ষণিক রক্তদাতা খুঁজুন ও আবেদন করুন।',
    ogImageUrl: 'https://bdyusuf2016.github.io/roktobondhon/assets/og-image.png',
    twitterCardType: 'summary_large_image',
    twitterHandle: '@roktodanporibar',
    canonicalUrl: 'https://bdyusuf2016.github.io/roktobondhon/',
    structuredDataEnabled: true,
    googleSiteVerification: '',
    robotsIndex: true,
    socialShareButtons: {
      facebook: true,
      whatsapp: true,
      telegram: true,
      twitter: true,
      copyLink: true,
    },
    crisisShareTemplateBn: '🚨 জরুরি রক্তের প্রয়োজন! 🚨\nরোগী: {patientName}\nরক্তের গ্রুপ: {bloodGroup}\nপ্রয়োজনীয় পরিমাণ: {requiredUnits} ব্যাগ\nহাসপাতাল: {hospitalName}, {district}\nযোগাযোগ: {contactPhone}\n\nদ্রুত রক্তদানে এগিয়ে আসুন অথবা শেয়ার করে রোগীর পাশে দাঁড়ান:\n{shareUrl}',
  },
  gamification: {
    enabled: true,
    allowPublicCertificates: true,
    requireVerificationForCertificate: false,
    organizationSignatoryName: 'Mohammad Yusuf',
    organizationSignatoryTitle: 'Lead Coordinator, Rokto Dan Poribar Kalampur',
    organizationSignatoryNameBn: 'মুহাম্মদ ইউসুফ',
    organizationSignatoryTitleBn: 'কেন্দ্রীয় সমন্বয়ক, রক্ত দান পরিবার কালামপুর',
    certificateTemplate: 'classic_gold',
    donorLevelMilestones: {
      bronze: 1,
      silver: 3,
      gold: 5,
      platinum: 10,
      legend: 20,
    },
    pointsPerDonation: 100,
    pointsPerEmergencyDonation: 150,
    pointsPerReferral: 50,
    leaderboardEnabled: true,
    leaderboardTimeframe: 'all_time',
  },
  pwa: {
    appName: 'Rokto Dan Poribar Kalampur Blood Donation Network',
    appNameBn: 'রক্ত দান পরিবার কালামপুর - রক্তদান প্ল্যাটফর্ম',
    shortName: 'রক্ত দান পরিবার কালামপুর',
    shortNameBn: 'রক্ত দান পরিবার কালামপুর',
    descriptionBn: 'কালামপুর, ধামরাই, সাভার ও মানিকগঞ্জে জরুরি রক্তের প্রয়োজনে রক্তদাতা অনুসন্ধান ও স্বেচ্ছাসেবী প্ল্যাটফর্ম।',
    themeColor: '#dc2626',
    backgroundColor: '#ffffff',
    displayMode: 'standalone',
    startUrl: '/',
    offlineCaching: true,
    cacheStrategy: 'network-first',
    backgroundSyncEnabled: true,
    offlineEmergencyDirectory: true,
    autoUpdatePrompt: true,
    installBannerEnabled: true,
    appVersion: '1.0.0',
  },
  bloodSystem: {
    activeBloodGroups: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    displayLabels: {
      'A+': 'A Positive (এ পজিটিভ)',
      'A-': 'A Negative (এ নেগেটিভ)',
      'B+': 'B Positive (বি পজিটিভ)',
      'B-': 'B Negative (বি নেগেটিভ)',
      'AB+': 'AB Positive (এবি পজিটিভ)',
      'AB-': 'AB Negative (এবি নেগেটিভ)',
      'O+': 'O Positive (ও পজিটিভ)',
      'O-': 'O Negative (ও নেগেটিভ)',
    },
    order: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  },
  matching: {
    compatibilityWeight: 35,
    distanceWeight: 20,
    availabilityWeight: 20,
    eligibilityWeight: 10,
    verificationWeight: 5,
    reliabilityWeight: 5,
    responseRateWeight: 3,
    emergencyWeight: 2,
    maxSearchRadiusKm: 50,
    strictEligibility: true,
  },
  donorEligibility: {
    minimumDonationIntervalDays: 90,
    femaleMinimumDonationIntervalDays: 120,
    minimumAge: 18,
    maximumAge: 65,
    minimumWeightKg: 45,
    temporaryDeferralEnabled: true,
    requireVerification: false,
    requireAvailability: true,
  },
  bloodRequests: {
    requestEnabled: true,
    emergencyRequestEnabled: true,
    requirePhoneVerification: false,
    requireHospital: true,
    requireBloodGroup: true,
    requireUnits: true,
    minimumUnits: 1,
    maximumUnits: 10,
    requestExpiryHours: 48,
    autoMatchingEnabled: true,
    autoBroadcastEnabled: true,
  },
  emergency: {
    emergencyMode: false,
    emergencyPriority: 100,
    broadcastEnabled: true,
    broadcastRadiusKm: 30,
    repeatNotification: false,
    maxNotificationsPerRequest: 3,
    escalationEnabled: true,
    escalationAfterMinutes: 30,
    autoExpireAfterHours: 24,
  },
  notifications: {
    smsEnabled: false,
    emailEnabled: false,
    pushEnabled: true,
    whatsappEnabled: false,
    defaultLanguage: 'bn',
    smsProvider: 'mock',
    emailProvider: 'mock',
  },
  privacy: {
    publicDonorProfile: true,
    showBloodGroup: true,
    showDistrict: true,
    showUpazila: true,
    showAvailability: true,
    showEmergencyStatus: true,
    allowDirectContactDefault: true,
  },
  maintenance: {
    maintenanceMode: false,
    maintenanceMessage: 'সিস্টেম রক্ষণাবেক্ষণ চলছে। অনুগ্রহ করে কিছুক্ষণ পর চেষ্টা করুন।',
    allowedRoles: ['super_admin'],
  },
  security: {
    sessionTimeoutMinutes: 120,
    requireMfaForAdmin: false,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
  },
};

const CONFIG_STORAGE_PREFIX = 'roktobondon_sys_config_';

const memoryStore: Record<string, string> = {};
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
    } catch {
      // Fallback to memory
    }
    return memoryStore[key] || null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
        return;
      }
    } catch {
      // Fallback to memory
    }
    memoryStore[key] = value;
  },
  removeItem: (key: string): void => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
        return;
      }
    } catch {
      // Fallback to memory
    }
    delete memoryStore[key];
  },
};

/**
 * Validate configuration section values before persistence.
 */
export function validateConfigSection<K extends SystemConfigSection>(
  section: K,
  data: Partial<SystemConfig[K]>
): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'কনফিগারেশন ডেটা অকার্যকর।' };
  }

  if (section === 'matching') {
    const m = data as Partial<MatchingWeightsConfig>;
    if (m.maxSearchRadiusKm !== undefined && (m.maxSearchRadiusKm < 1 || m.maxSearchRadiusKm > 500)) {
      return { valid: false, error: 'সর্বোচ্চ সার্চ ব্যাসার্ধ ১ থেকে ৫০০ কিমি এর মধ্যে হতে হবে।' };
    }
  }

  if (section === 'donorEligibility') {
    const d = data as Partial<DonorEligibilityConfig>;
    if (d.minimumAge !== undefined && (d.minimumAge < 16 || d.minimumAge > 30)) {
      return { valid: false, error: 'ন্যূনতম বয়স ১৬ থেকে ৩০ বছরের মধ্যে হতে হবে।' };
    }
    if (d.maximumAge !== undefined && (d.maximumAge < 50 || d.maximumAge > 80)) {
      return { valid: false, error: 'সর্বোচ্চ বয়স ৫০ থেকে ৮০ বছরের মধ্যে হতে হবে।' };
    }
    if (d.minimumWeightKg !== undefined && (d.minimumWeightKg < 35 || d.minimumWeightKg > 100)) {
      return { valid: false, error: 'ন্যূনতম ওজন ৩৫ থেকে ১০০ কেজির মধ্যে হতে হবে।' };
    }
  }

  if (section === 'bloodRequests') {
    const b = data as Partial<BloodRequestsConfig>;
    if (b.minimumUnits !== undefined && b.minimumUnits < 1) {
      return { valid: false, error: 'ন্যূনতম রক্তের পরিমাণ কমপক্ষে ১ ব্যাগ হতে হবে।' };
    }
    if (b.maximumUnits !== undefined && b.maximumUnits > 20) {
      return { valid: false, error: 'সর্বোচ্চ রক্তের পরিমাণ ২০ ব্যাগের বেশি হতে পারবে না।' };
    }
  }

  return { valid: true };
}

import { supabase, isSupabaseConfigured } from '../supabase/config';

/**
 * Get configuration section with guaranteed fallback to safe defaults.
 * Loading never crashes the application.
 */
export async function getConfig<K extends SystemConfigSection>(
  section: K
): Promise<SystemConfig[K]> {
  try {
    const key = `${CONFIG_STORAGE_PREFIX}${section}`;
    const saved = safeStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_SYSTEM_CONFIG[section], ...parsed };
    }
  } catch (err) {
    console.warn(`[ConfigService] Error reading config for ${section}, using default:`, err);
  }
  return DEFAULT_SYSTEM_CONFIG[section];
}

/**
 * Get the full system configuration object with all sections resolved.
 * Fetches from Supabase system_config table when available, falling back to local cache & defaults.
 */
export async function getAllConfig(): Promise<SystemConfig> {
  const sections: SystemConfigSection[] = [
    'organization',
    'branding',
    'website',
    'seo',
    'gamification',
    'pwa',
    'bloodSystem',
    'matching',
    'donorEligibility',
    'bloodRequests',
    'emergency',
    'notifications',
    'privacy',
    'maintenance',
    'security',
  ];

  let resolvedConfig: SystemConfig = { ...DEFAULT_SYSTEM_CONFIG };

  // First load from local storage cache
  for (const section of sections) {
    const local = await getConfig(section);
    if (local) {
      (resolvedConfig as any)[section] = local;
    }
  }

  // Then fetch authoritative version from Supabase if online
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('config')
        .eq('id', 'default')
        .maybeSingle();

      if (!error && data && data.config) {
        resolvedConfig = { ...resolvedConfig, ...data.config };
        // Sync back to local storage
        for (const section of sections) {
          if (resolvedConfig[section]) {
            safeStorage.setItem(
              `${CONFIG_STORAGE_PREFIX}${section}`,
              JSON.stringify(resolvedConfig[section])
            );
          }
        }
      }
    } catch (err) {
      console.warn('[ConfigService] Supabase config fetch error, using local storage:', err);
    }
  }

  return resolvedConfig;
}

/**
 * Update a configuration section.
 * Enforces authentication, authorization, validation, persistence (Supabase + localStorage), and audit trail creation.
 */
export async function updateConfig<K extends SystemConfigSection>(
  section: K,
  updates: Partial<SystemConfig[K]>,
  actor: { id: string; name: string; role: string }
): Promise<{ success: boolean; data: SystemConfig[K]; error?: string }> {
  // 1. Authorization check: ordinary users cannot write configuration
  const isAuthorized = actor.role === 'super_admin' || actor.role === 'admin';
  if (!isAuthorized) {
    console.error(`[ConfigService] Unauthorized write attempt on ${section} by user ${actor.id} (${actor.role})`);
    return {
      success: false,
      data: DEFAULT_SYSTEM_CONFIG[section],
      error: 'অননুমোদিত চেষ্টা: সিস্টেম কনফিগারেশন পরিবর্তনের অনুমতি শুধুমাত্র এডমিনদের জন্য সংরক্ষিত।',
    };
  }

  // 2. Validation check
  const validation = validateConfigSection(section, updates);
  if (!validation.valid) {
    return {
      success: false,
      data: DEFAULT_SYSTEM_CONFIG[section],
      error: validation.error,
    };
  }

  // 3. Merge with current config
  const current = await getConfig(section);
  const updated = { ...current, ...updates };

  // 4. Persist to safe local storage
  try {
    const key = `${CONFIG_STORAGE_PREFIX}${section}`;
    safeStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.error(`[ConfigService] Failed to persist config for ${section}:`, err);
  }

  // 5. Persist authoritative version to Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const fullConfig = await getAllConfig();
      fullConfig[section] = updated;

      const { error: dbError } = await supabase
        .from('system_config')
        .upsert({
          id: 'default',
          config: fullConfig,
          updated_at: new Date().toISOString(),
        });

      if (dbError) {
        console.error('[ConfigService] Supabase config update error:', dbError);
      }
    } catch (dbErr) {
      console.error('[ConfigService] Supabase config update exception:', dbErr);
    }
  }

  // 6. Create immutable audit entry
  try {
    await recordAuditLog(
      'UPDATE_CONFIG',
      'systemConfig',
      section,
      {
        section,
        updatedKeys: Object.keys(updates),
      },
      {
        id: actor.id,
        name: actor.name,
        role: actor.role as any,
      }
    );
  } catch (auditErr) {
    console.warn('[ConfigService] Audit logging notice:', auditErr);
  }

  return {
    success: true,
    data: updated,
  };
}

/**
 * Idempotent migration from legacy OrgConfig to Central SystemConfig.
 */
export async function migrateLegacySettings(): Promise<boolean> {
  try {
    const legacySaved = safeStorage.getItem('roktobondon_org_config');
    if (!legacySaved) return true;

    const legacy = JSON.parse(legacySaved);
    const orgConfig = await getConfig('organization');
    const brandingConfig = await getConfig('branding');
    const websiteConfig = await getConfig('website');

    // Migrate organization fields
    const migratedOrg: OrganizationSettingsConfig = {
      ...orgConfig,
      organizationName: legacy.name || orgConfig.organizationName,
      organizationNameBn: legacy.nameBn || orgConfig.organizationNameBn,
      sloganBn: legacy.sloganBn || orgConfig.sloganBn,
      phone: legacy.emergencyHotline || orgConfig.phone,
      emergencyPhone: legacy.emergencyHotline || orgConfig.emergencyPhone,
      email: legacy.email || orgConfig.email,
      address: legacy.address || orgConfig.address,
      facebookUrl: legacy.facebookUrl || orgConfig.facebookUrl,
    };

    // Migrate branding fields
    const migratedBranding: BrandingSettingsConfig = {
      ...brandingConfig,
      primaryColor: legacy.primaryColor || brandingConfig.primaryColor,
      headerSubtitleBn: legacy.headerSubtitleBn || brandingConfig.headerSubtitleBn,
      footerAboutBn: legacy.footerAboutBn || brandingConfig.footerAboutBn,
      footerSecurityBadgeBn: legacy.footerSecurityBadgeBn || brandingConfig.footerSecurityBadgeBn,
      footerTaglineBn: legacy.footerTaglineBn || brandingConfig.footerTaglineBn,
      footerCopyrightText: legacy.footerCopyrightText || brandingConfig.footerCopyrightText,
      coverageArea1Title: legacy.coverageArea1Title || brandingConfig.coverageArea1Title,
      coverageArea1Details: legacy.coverageArea1Details || brandingConfig.coverageArea1Details,
      coverageArea2Title: legacy.coverageArea2Title || brandingConfig.coverageArea2Title,
      coverageArea2Details: legacy.coverageArea2Details || brandingConfig.coverageArea2Details,
    };

    // Migrate website announcement
    const migratedWebsite: WebsiteSettingsConfig = {
      ...websiteConfig,
      showAnnouncement: legacy.showAnnouncement ?? websiteConfig.showAnnouncement,
      announcementText: legacy.announcementTextBn || websiteConfig.announcementText,
      announcementLink: legacy.announcementLink || websiteConfig.announcementLink,
      hotline: legacy.emergencyHotline || websiteConfig.hotline,
    };

    safeStorage.setItem(`${CONFIG_STORAGE_PREFIX}organization`, JSON.stringify(migratedOrg));
    safeStorage.setItem(`${CONFIG_STORAGE_PREFIX}branding`, JSON.stringify(migratedBranding));
    safeStorage.setItem(`${CONFIG_STORAGE_PREFIX}website`, JSON.stringify(migratedWebsite));

    return true;
  } catch (err) {
    console.error('[ConfigService] Legacy migration error:', err);
    return false;
  }
}
