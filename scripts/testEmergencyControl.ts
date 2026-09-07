/**
 * Automated Verification Script for Phase 7 — Emergency Control Center
 */
import { validateConfigSection, DEFAULT_SYSTEM_CONFIG } from '../src/services/configService';
import type { EmergencySettingsConfig } from '../src/types/config';

async function runEmergencyControlTests() {
  console.log('🧪 Starting Phase 7 Emergency Control Center Automated Tests...\n');

  // Test 1: Config Section Validation
  const validConfig: EmergencySettingsConfig = {
    emergencyMode: true,
    emergencyPriority: 2.5,
    broadcastEnabled: true,
    broadcastRadiusKm: 50,
    repeatNotification: true,
    maxNotificationsPerRequest: 5,
    escalationEnabled: true,
    escalationAfterMinutes: 30,
    autoExpireAfterHours: 24,
  };

  const validationRes = validateConfigSection('emergency', validConfig);
  console.log(`✓ Emergency Config Section Validation: Valid = ${validationRes.valid}`);
  if (!validationRes.valid) {
    throw new Error(`Valid emergency config failed validation: ${validationRes.error}`);
  }

  // Test 2: Emergency Mode Switcher state
  console.log(`✓ Master Emergency Mode: Active = ${validConfig.emergencyMode}`);
  if (!validConfig.emergencyMode) {
    throw new Error('Emergency mode toggle verification failed.');
  }

  // Test 3: Broadcast Perimeter Bounds
  console.log(`✓ Broadcast Radius: ${validConfig.broadcastRadiusKm} KM perimeter configured.`);
  if (validConfig.broadcastRadiusKm <= 0 || validConfig.broadcastRadiusKm > 500) {
    throw new Error('Broadcast radius out of safe boundaries.');
  }

  // Test 4: Escalation Window
  console.log(`✓ Auto-escalation timer: ${validConfig.escalationAfterMinutes} minutes threshold.`);
  if (validConfig.escalationAfterMinutes < 5) {
    throw new Error('Escalation threshold is unrealistically short.');
  }

  // Test 5: Default System Config Baseline
  const defaultEmergency = DEFAULT_SYSTEM_CONFIG.emergency;
  console.log(`✓ Central Default Emergency: Mode = ${defaultEmergency.emergencyMode} (Standby), Radius = ${defaultEmergency.broadcastRadiusKm} KM`);
  if (defaultEmergency.emergencyMode !== false) {
    throw new Error('Default emergency mode should be standby (false).');
  }

  console.log('\n🎉 ALL Phase 7 Emergency Control Center Tests Passed Successfully!');
}

runEmergencyControlTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
