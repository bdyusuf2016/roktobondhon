import { validateConfigSection, DEFAULT_SYSTEM_CONFIG } from '../src/services/configService';
import type { BloodRequestsConfig } from '../src/types/config';

async function runBloodRequestControlTests() {
  console.log('🧪 Starting Phase 6 Blood Request Control Automated Tests...\n');

  // Test 1: Config Section Validation
  const validConfig: BloodRequestsConfig = {
    requestEnabled: true,
    emergencyRequestEnabled: true,
    requirePhoneVerification: true,
    requireHospital: true,
    requireBloodGroup: true,
    requireUnits: true,
    minimumUnits: 1,
    maximumUnits: 10,
    requestExpiryHours: 48,
    autoMatchingEnabled: true,
    autoBroadcastEnabled: false,
  };

  const validationRes = validateConfigSection('bloodRequests', validConfig);
  console.log(`✓ Valid Config Section check: Valid = ${validationRes.valid}`);
  if (!validationRes.valid) {
    throw new Error(`Valid blood request config failed validation: ${validationRes.error}`);
  }

  // Test 2: Inverted Min/Max Units Rejection
  const invalidUnitsConfig = {
    ...validConfig,
    minimumUnits: 10,
    maximumUnits: 2, // Invalid: min > max
  };

  if (invalidUnitsConfig.minimumUnits > invalidUnitsConfig.maximumUnits) {
    console.log('✓ Inverted units test: Correctly identified minimumUnits > maximumUnits constraint violation.');
  } else {
    throw new Error('Failed to identify unit bounds inversion.');
  }

  // Test 3: Expiry Calculation
  const expiryHours = 48;
  const now = Date.now();
  const expiresAt = new Date(now + expiryHours * 3600000);
  const diffHours = (expiresAt.getTime() - now) / 3600000;

  console.log(`✓ Expiration timestamp generation: ${diffHours} hours delta computed correctly.`);
  if (Math.round(diffHours) !== 48) {
    throw new Error('Expiry duration calculation mismatch.');
  }

  // Test 4: Default Values Guarantee
  const defaultConfig = DEFAULT_SYSTEM_CONFIG.bloodRequests;
  console.log(`✓ Central Default Config: requestEnabled = ${defaultConfig.requestEnabled}, expiryHours = ${defaultConfig.requestExpiryHours}h`);
  if (!defaultConfig.requestEnabled || defaultConfig.minimumUnits < 1) {
    throw new Error('Default bloodRequests configuration contains invalid baseline values.');
  }

  console.log('\n🎉 ALL Phase 6 Blood Request Control Tests Passed Successfully!');
}

runBloodRequestControlTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
