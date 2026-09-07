/**
 * Test script verifying Central Configuration Security & Validation
 */
import {
  getConfig,
  updateConfig,
  validateConfigSection,
  DEFAULT_SYSTEM_CONFIG,
} from '../src/services/configService';

async function runConfigSecurityTests() {
  console.log('--- Starting Central Configuration Security & Reliability Tests ---');

  // Test 1: Safe Defaults
  console.log('\n[Test 1] Verifying Safe Defaults...');
  const orgConfig = await getConfig('organization');
  if (orgConfig.organizationName && orgConfig.phone) {
    console.log('✓ Safe defaults loaded successfully without errors.');
  } else {
    throw new Error('Failed to load safe defaults.');
  }

  // Test 2: Unauthorized Write Rejection
  console.log('\n[Test 2] Testing Unauthorized Write Rejection...');
  const unauthorizedActor = {
    id: 'user-donor-99',
    name: 'Rahim Donor',
    role: 'donor',
  };
  const unauthResult = await updateConfig(
    'matching',
    { maxSearchRadiusKm: 100 },
    unauthorizedActor
  );
  if (!unauthResult.success && unauthResult.error?.includes('অননুমোদিত চেষ্টা')) {
    console.log('✓ Unauthorized write successfully blocked by authorization guard.');
  } else {
    throw new Error('Security Breach: Unauthorized write was not blocked!');
  }

  // Test 3: Authorized Write with Validation
  console.log('\n[Test 3] Testing Authorized Admin Write...');
  const adminActor = {
    id: 'usr-adm-001',
    name: 'Main Admin',
    role: 'admin',
  };
  const authResult = await updateConfig(
    'organization',
    { shortName: 'রক্ত দান পরিবার কালামপুর টেস্ট' },
    adminActor
  );
  if (authResult.success && authResult.data.shortName === 'রক্ত দান পরিবার কালামপুর টেস্ট') {
    console.log('✓ Authorized write succeeded and updated configuration state.');
  } else {
    throw new Error('Failed to update config with authorized admin.');
  }

  // Test 4: Validation Bounds Check
  console.log('\n[Test 4] Testing Validation Bounds...');
  const invalidMatching = validateConfigSection('matching', { maxSearchRadiusKm: 9999 });
  if (!invalidMatching.valid) {
    console.log('✓ Out-of-bounds radius rejected:', invalidMatching.error);
  } else {
    throw new Error('Validation failed to catch out-of-bounds radius.');
  }

  const invalidAge = validateConfigSection('donorEligibility', { minimumAge: 10 });
  if (!invalidAge.valid) {
    console.log('✓ Invalid donor age rejected:', invalidAge.error);
  } else {
    throw new Error('Validation failed to catch invalid donor age.');
  }

  console.log('\n🎉 ALL CONFIGURATION SECURITY & INTEGRITY TESTS PASSED!');
}

runConfigSecurityTests().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
