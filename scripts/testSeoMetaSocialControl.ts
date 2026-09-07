/**
 * Automated Verification Script for Phase 15 — SEO, Meta & Social Sharing Control
 */
import { DEFAULT_SYSTEM_CONFIG } from '../src/services/configService';
import {
  generateStructuredData,
  generateCrisisShareText,
  generateSocialShareUrl,
} from '../src/services/seoService';
import type { BloodRequest } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
}

async function runTests() {
  console.log('🧪 Starting Phase 15 SEO, Meta & Social Sharing Control Automated Tests...\n');

  // Test 1: SEO Configuration Schema & Defaults
  console.log('✓ Test 1: SEO Configuration Schema & Defaults:');
  const seo = DEFAULT_SYSTEM_CONFIG.seo;
  assert(Boolean(seo.siteTitleBn), 'Bangla site title must be defined');
  assert(Boolean(seo.metaDescriptionBn), 'Bangla meta description must be defined');
  assert(Boolean(seo.ogImageUrl), 'OpenGraph preview image URL must be configured');
  assert(seo.robotsIndex === true, 'Robots index should be enabled by default');
  assert(seo.socialShareButtons.whatsapp === true, 'WhatsApp share should be enabled');
  assert(seo.socialShareButtons.facebook === true, 'Facebook share should be enabled');
  console.log(`  Site Title (BN): "${seo.siteTitleBn}"`);
  console.log(`  Canonical URL: "${seo.canonicalUrl}"`);
  console.log(`  Twitter Card: "${seo.twitterCardType}"`);

  // Test 2: Schema.org JSON-LD Structured Data Generation
  console.log('\n✓ Test 2: Schema.org JSON-LD Generation:');
  const structuredData = generateStructuredData(seo, DEFAULT_SYSTEM_CONFIG.organization);
  assert(structuredData['@context'] === 'https://schema.org', 'Context must be schema.org');
  assert(
    Array.isArray(structuredData['@type']) &&
      structuredData['@type'].includes('EmergencyService'),
    'Structured data must include EmergencyService'
  );
  assert(
    Array.isArray(structuredData['@type']) &&
      structuredData['@type'].includes('MedicalOrganization'),
    'Structured data must include MedicalOrganization'
  );
  assert(structuredData.areaServed.length >= 3, 'Must declare covered coverage zones');
  console.log(`  JSON-LD Types: ${JSON.stringify(structuredData['@type'])}`);
  console.log(`  Org Name: ${structuredData.name}, Areas: ${structuredData.areaServed.map((a: any) => a.name).join(', ')}`);

  // Test 3: Urgent Crisis Blood Request Message Generator
  console.log('\n✓ Test 3: Urgent Crisis Message Generator:');
  const mockRequest: BloodRequest = {
    id: 'req-999',
    requestId: 'REQ-DHM-00999',
    userId: 'usr-patient-1',
    patientName: 'সালমা বেগম',
    bloodGroup: 'B+',
    requiredUnits: 2,
    hospital: 'ধামরাই উপজেলা স্বাস্থ্য কমপ্লেক্স',
    district: 'ঢাকা',
    upazila: 'ধামরাই',
    area: 'কালামপুর',
    requiredDate: '2026-09-07',
    requiredTime: '14:00',
    emergencyLevel: 'CRITICAL',
    status: 'verified',
    contactNumber: '01711223344',
    contactPerson: 'মো: রফিক',
    relationship: 'ভাই',
    division: 'Dhaka',
    organizationId: 'org-roktobondon',
    verification: { isVerified: true },
    createdAt: '2026-09-06T00:00:00Z',
  };

  const shareUrl = 'https://bdyusuf2016.github.io/roktobondhon/request/req-999';
  const crisisText = generateCrisisShareText(seo.crisisShareTemplateBn, mockRequest, shareUrl);

  assert(crisisText.includes('সালমা বেগম'), 'Message must contain patient name');
  assert(crisisText.includes('B+'), 'Message must contain blood group');
  assert(crisisText.includes('2 ব্যাগ'), 'Message must contain required units');
  assert(crisisText.includes('ধামরাই উপজেলা স্বাস্থ্য কমপ্লেক্স'), 'Message must contain hospital name');
  assert(crisisText.includes(shareUrl), 'Message must contain share link');
  console.log(`  Generated Crisis Message Preview:`);
  console.log(`  ${crisisText.split('\n').join('\n  ')}`);

  // Test 4: Social Share URL Generation for Multi-Channel Broadcast
  console.log('\n✓ Test 4: Social Share URL Generation:');
  const whatsappUrl = generateSocialShareUrl('whatsapp', crisisText, shareUrl);
  const facebookUrl = generateSocialShareUrl('facebook', crisisText, shareUrl);
  const telegramUrl = generateSocialShareUrl('telegram', crisisText, shareUrl);
  const twitterUrl = generateSocialShareUrl('twitter', crisisText, shareUrl);

  assert(whatsappUrl.startsWith('https://api.whatsapp.com/send?text='), 'WhatsApp share URL is correct');
  assert(facebookUrl.startsWith('https://www.facebook.com/sharer/sharer.php?'), 'Facebook share URL is correct');
  assert(telegramUrl.startsWith('https://t.me/share/url?'), 'Telegram share URL is correct');
  assert(twitterUrl.startsWith('https://twitter.com/intent/tweet?text='), 'Twitter share URL is correct');

  console.log(`  WhatsApp Link: ${whatsappUrl.slice(0, 60)}...`);
  console.log(`  Facebook Link: ${facebookUrl.slice(0, 60)}...`);
  console.log(`  Telegram Link: ${telegramUrl.slice(0, 60)}...`);

  console.log('\n🎉 ALL Phase 15 SEO, Meta & Social Sharing Control Tests Passed Successfully!\n');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
