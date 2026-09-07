/**
 * Phase 18 & 19 Regression Test: PWA, Service Worker & System Health Diagnostic Verification
 */
import {
  enqueueOfflineAction,
  getSyncQueue,
  processSyncQueue,
  clearSyncQueue,
  validatePwaConfig,
} from '../src/services/pwaService';
import { getConfig } from '../src/services/configService';

async function runPwaAndSystemHealthTests() {
  console.log('--- Starting PWA, Offline Sync & System Health Diagnostics Regression Tests ---');

  // Test 1: PWA Config Retrieval & Validation
  console.log('\n[Test 1] Verifying PWA Configuration Integrity & Schema...');
  const pwaConfig = await getConfig('pwa');
  if (pwaConfig.appName && pwaConfig.themeColor && pwaConfig.cacheStrategy) {
    console.log(`✓ PWA Configuration valid: ${pwaConfig.appNameBn} (Theme: ${pwaConfig.themeColor})`);
  } else {
    throw new Error('PWA Config missing critical fields.');
  }

  const validation = validatePwaConfig(pwaConfig);
  if (validation.isValid) {
    console.log('✓ PWA Configuration schema validation passed.');
  } else {
    throw new Error(`PWA validation failed: ${validation.errors.join(', ')}`);
  }

  // Test 2: Offline Sync Queue Management
  console.log('\n[Test 2] Testing Offline Sync Queue Operations...');
  clearSyncQueue();
  let queue = getSyncQueue();
  if (queue.length !== 0) throw new Error('Queue clear failed.');

  const samplePayload = {
    patientName: 'টেস্ট রোগী',
    bloodGroup: 'B+',
    hospital: 'সাভার এনাম মেডিকেল',
  };

  const enqueued = enqueueOfflineAction(
    'CREATE_BLOOD_REQUEST',
    samplePayload,
    'নতুন রক্তের আবেদন: B+ (সাভার এনাম মেডিকেল)'
  );

  queue = getSyncQueue();
  if (queue.length === 1 && queue[0].id === enqueued.id && queue[0].actionType === 'CREATE_BLOOD_REQUEST') {
    console.log(`✓ Successfully enqueued offline item (${queue[0].id}): "${queue[0].summaryBn}"`);
  } else {
    throw new Error('Failed to enqueue offline item.');
  }

  // Test 3: Process Queue Execution
  console.log('\n[Test 3] Testing Queue Processor Resolution...');
  const processResult = await processSyncQueue(async (item) => {
    return !!item.payload.patientName;
  });
  console.log(`✓ Sync queue executed: Processed=${processResult.processed}, Failed=${processResult.failed}`);
  if (processResult.processed !== 1 || processResult.failed !== 0) {
    throw new Error('Sync queue processor returned incorrect result.');
  }

  const remainingQueue = getSyncQueue();
  if (remainingQueue.length === 0) {
    console.log('✓ Completed items cleanly pruned from persistent queue.');
  } else {
    throw new Error('Completed items were not pruned.');
  }

  console.log('\n🎉 ALL PWA & SYSTEM HEALTH REGRESSION TESTS PASSED!');
}

runPwaAndSystemHealthTests().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
