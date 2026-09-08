import type { SeoSettingsConfig } from '../types/config';
import type { BloodRequest } from '../types';

/**
 * Helper to get or create a meta tag
 */
function setMetaTag(attributeName: 'name' | 'property', attributeValue: string, content: string) {
  if (typeof document === 'undefined') return;
  let element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attributeName, attributeValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

/**
 * Helper to get or create a link tag
 */
function setLinkTag(rel: string, href: string) {
  if (typeof document === 'undefined') return;
  let element = document.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

/**
 * Generates valid Schema.org Organization and Emergency Service JSON-LD
 */
export function generateStructuredData(config: SeoSettingsConfig, orgConfig?: any) {
  const orgName = orgConfig?.organizationName || 'রক্ত দান পরিবার কালামপুর';
  const orgPhone = orgConfig?.phone || '+8801700000000';
  const orgEmail = orgConfig?.email || 'help@roktodanporibar.com';
  const orgWebsite = config.canonicalUrl || 'https://roktodanporibar.com/';

  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'EmergencyService', 'MedicalOrganization'],
    name: orgName,
    alternateName: 'রক্ত দান পরিবার কালামপুর রক্তদান সংগঠন',
    url: orgWebsite,
    logo: orgConfig?.branding?.logoUrl || `${orgWebsite}logo.png`,
    description: config.metaDescriptionBn || config.metaDescription,
    telephone: orgPhone,
    email: orgEmail,
    areaServed: [
      { '@type': 'Place', name: 'Dhamrai, Dhaka' },
      { '@type': 'Place', name: 'Savar, Dhaka' },
      { '@type': 'Place', name: 'Manikganj' },
      { '@type': 'Country', name: 'Bangladesh' },
    ],
    knowsAbout: [
      'Blood Donation',
      'Emergency Blood Supply',
      'Voluntary Blood Donors',
      'Platelet Donation',
    ],
  };
}

/**
 * Applies current SEO metadata dynamically to the document head
 */
export function applySeoTags(
  config: SeoSettingsConfig,
  dynamic?: {
    title?: string;
    description?: string;
    ogImage?: string;
    canonicalUrl?: string;
    bloodRequest?: BloodRequest;
  }
) {
  if (typeof document === 'undefined') return;

  const pageTitle = dynamic?.title
    ? `${dynamic.title} | ${config.siteTitleBn || config.siteTitle}`
    : config.siteTitleBn || config.siteTitle;

  const pageDescription = dynamic?.description || config.metaDescriptionBn || config.metaDescription;
  const canonicalBase = (config.canonicalUrl || 'https://roktodanporibar.com').replace(/\/$/, '');
  let canonical = dynamic?.canonicalUrl || config.canonicalUrl || 'https://roktodanporibar.com/';
  if (canonical && !canonical.startsWith('http://') && !canonical.startsWith('https://')) {
    canonical = `${canonicalBase}${canonical.startsWith('/') ? '' : '/'}${canonical}`;
  } else if (canonical && (canonical.includes('github.io') || canonical.includes('localhost'))) {
    try {
      const parsed = new URL(canonical);
      const cleanPath = parsed.pathname.replace(/^\/roktobondhon/, '') || '/';
      canonical = `${canonicalBase}${cleanPath}${parsed.search}${parsed.hash}`;
    } catch {
      canonical = `${canonicalBase}/`;
    }
  }

  let ogImage = dynamic?.ogImage || config.ogImageUrl || `${canonicalBase}/logo.png`;
  if (ogImage && !ogImage.startsWith('http://') && !ogImage.startsWith('https://')) {
    ogImage = `${canonicalBase}${ogImage.startsWith('/') ? '' : '/'}${ogImage}`;
  }
  const ogTitle = dynamic?.title ? `${dynamic.title} — রক্ত দান পরিবার কালামপুর` : config.ogTitle || pageTitle;

  // Title
  document.title = pageTitle;

  // Standard Meta Tags
  setMetaTag('name', 'description', pageDescription);
  setMetaTag('name', 'keywords', config.metaKeywords);
  setMetaTag('name', 'robots', config.robotsIndex ? 'index, follow' : 'noindex, nofollow');

  // Google Site Verification
  if (config.googleSiteVerification) {
    setMetaTag('name', 'google-site-verification', config.googleSiteVerification);
  }

  // Canonical Link
  if (canonical) {
    setLinkTag('canonical', canonical);
  }

  // Open Graph / Facebook
  setMetaTag('property', 'og:type', 'website');
  setMetaTag('property', 'og:title', ogTitle);
  setMetaTag('property', 'og:description', config.ogDescription || pageDescription);
  if (ogImage) setMetaTag('property', 'og:image', ogImage);
  if (canonical) setMetaTag('property', 'og:url', canonical);
  setMetaTag('property', 'og:site_name', 'রক্ত দান পরিবার কালামপুর');
  setMetaTag('property', 'og:locale', 'bn_BD');

  // Twitter Card
  setMetaTag('name', 'twitter:card', config.twitterCardType || 'summary_large_image');
  setMetaTag('name', 'twitter:title', ogTitle);
  setMetaTag('name', 'twitter:description', pageDescription);
  if (ogImage) setMetaTag('name', 'twitter:image', ogImage);
  if (config.twitterHandle) setMetaTag('name', 'twitter:site', config.twitterHandle);

  // Schema.org Structured Data
  const jsonLdScriptId = 'roktobondon-schema-jsonld';
  let scriptElement = document.getElementById(jsonLdScriptId) as HTMLScriptElement | null;

  if (config.structuredDataEnabled) {
    if (!scriptElement) {
      scriptElement = document.createElement('script');
      scriptElement.id = jsonLdScriptId;
      scriptElement.type = 'application/ld+json';
      document.head.appendChild(scriptElement);
    }
    const structuredData = generateStructuredData(config);
    scriptElement.textContent = JSON.stringify(structuredData);
  } else if (scriptElement) {
    scriptElement.remove();
  }
}

/**
 * Format message template for urgent blood request crisis broadcast
 */
export function generateCrisisShareText(
  template: string,
  request: BloodRequest,
  shareUrl: string
): string {
  let msg = template || '🚨 জরুরি রক্তের প্রয়োজন! 🚨\nরোগী: {patientName}\nরক্তের গ্রুপ: {bloodGroup}\nহাসপাতাল: {hospitalName}\n{shareUrl}';

  const replacements: Record<string, string> = {
    '{patientName}': request.patientName || 'মুমূর্ষু রোগী',
    '{bloodGroup}': request.bloodGroup,
    '{requiredUnits}': String(request.requiredUnits || 1),
    '{hospitalName}': request.hospital || 'স্থানীয় হাসপাতাল',
    '{district}': request.district || 'ঢাকা',
    '{contactPhone}': request.contactNumber || 'হটলাইনে যোগাযোগ করুন',
    '{shareUrl}': shareUrl,
  };

  for (const [placeholder, val] of Object.entries(replacements)) {
    msg = msg.split(placeholder).join(val);
  }

  return msg;
}

/**
 * Generates direct sharing links for social channels
 */
export function generateSocialShareUrl(
  channel: 'whatsapp' | 'facebook' | 'telegram' | 'twitter',
  shareText: string,
  shareUrl: string
): string {
  switch (channel) {
    case 'whatsapp':
      return `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
    case 'telegram':
      return `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    case 'twitter':
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    default:
      return shareUrl;
  }
}
