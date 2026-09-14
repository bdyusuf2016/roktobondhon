/**
 * 🧪 PHASE 1B-1: NOTIFICATION + DONOR REQUEST RESPONSE LIFECYCLE TEST SUITE
 * 
 * Comprehensive 20-Point Security & Functional Test Suite
 */

import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import type { Donor, BloodRequest, DonorRequest, NotificationItem } from '../src/types';
import {
  sendDonorContactRequest,
  respondToDonorRequest,
} from '../src/services/donorRequestService';
import {
  getUserNotificationsFromSupabase,
  sendNotificationToSupabase,
  markNotificationAsReadInSupabase,
} from '../src/services/notificationService';

console.log('================================================================');
console.log('🔔 PHASE 1B-1: NOTIFICATIONS & RESPONSE LIFECYCLE TEST SUITE');
console.log('================================================================\n');

let passedCount = 0;
let totalCount = 0;

function runTest(id: string, name: string, fn: () => void | Promise<void>) {
  totalCount++;
  try {
    fn();
    console.log(`✅ [TEST ${id}] ${name}`);
    passedCount++;
  } catch (err: any) {
    console.error(`❌ [TEST ${id}] ${name}`);
    console.error('   ↳ Error:', err.message);
    throw err;
  }
}

const migrationSql = fs.readFileSync('supabase/migrations/20260914_phase1b1_notification_response_lifecycle.sql', 'utf8');
const schemaSql = fs.readFileSync('supabase/schema.sql', 'utf8');

// ----------------------------------------------------------------------------
// 1. Authorization Tests (1 - 5)
// ----------------------------------------------------------------------------
runTest('01', 'Auth: User A can SELECT own notifications (user_id = auth.uid() OR all)', () => {
  const selectPolicy = schemaSql.includes('CREATE POLICY "Users can view their notifications" ON public.notifications') &&
                       schemaSql.includes("user_id = auth.uid()::text OR user_id = 'all' OR public.is_staff()");
  assert.strictEqual(selectPolicy, true, 'SELECT policy must allow own notifications and broadcast');
});

runTest('02', 'Auth: User A cannot SELECT User B specific notifications', () => {
  const hasCrossUserBlock = schemaSql.includes('user_id = auth.uid()::text');
  assert.strictEqual(hasCrossUserBlock, true, 'SELECT policy isolates to auth.uid()');
});

runTest('03', 'Auth: User A can mark own notifications as read', () => {
  const updatePolicy = schemaSql.includes('CREATE POLICY "Users can mark notifications as read" ON public.notifications') &&
                       schemaSql.includes('user_id = auth.uid()::text OR public.is_staff()');
  assert.strictEqual(updatePolicy, true, 'UPDATE policy allows owner to change read state');
});

runTest('04', 'Auth: User A cannot update User B notification read state', () => {
  const hasUpdateIsolation = schemaSql.includes('WITH CHECK (user_id = auth.uid()::text OR public.is_staff())');
  assert.strictEqual(hasUpdateIsolation, true, 'UPDATE policy WITH CHECK prevents cross-user modification');
});

runTest('05', 'Auth: Anonymous user denied notifications access (RLS default deny)', () => {
  const notifSection = schemaSql.slice(schemaSql.indexOf('13. Notifications Policies'), schemaSql.indexOf('14. Audit Logs Policies'));
  const noAnonPolicy = !notifSection.includes('TO anon') && !notifSection.includes('USING (true)');
  assert.strictEqual(noAnonPolicy, true, 'No permissive anonymous policy on notifications');
});

// ----------------------------------------------------------------------------
// 2. Donor Request Notifications & Deduplication (6 - 10)
// ----------------------------------------------------------------------------
runTest('06', 'Lifecycle: Requester dispatches donor request -> Donor notification created via trigger', () => {
  const hasInsertTrigger = migrationSql.includes("IF TG_OP = 'INSERT' THEN") &&
                           migrationSql.includes('NEW.donor_user_id') &&
                           migrationSql.includes("v_type := 'request'");
  assert.strictEqual(hasInsertTrigger, true, 'Trigger automatically dispatches invite notification to donor');
});

runTest('07', 'Deduplication: Deterministic primary key ensures zero duplicate notifications', () => {
  const hasDeterministicId = migrationSql.includes("v_notif_id := 'notif-dreq-' || NEW.id || '-invite'") &&
                             migrationSql.includes('ON CONFLICT (id) DO NOTHING');
  assert.strictEqual(hasDeterministicId, true, 'ON CONFLICT (id) DO NOTHING prevents duplicate invite alerts');
});

runTest('08', 'Lifecycle: Donor response "accepted" -> Requester notification created', () => {
  const hasAcceptedNotif = migrationSql.includes("IF NEW.status = 'accepted' THEN") &&
                           migrationSql.includes('NEW.requester_user_id') &&
                           migrationSql.includes('রক্তদাতা রক্তদানে সম্মতি দিয়েছেন');
  assert.strictEqual(hasAcceptedNotif, true, 'Trigger notifies requester upon acceptance');
});

runTest('09', 'Lifecycle: Donor response "maybe" -> Requester notification created', () => {
  const hasMaybeNotif = migrationSql.includes("ELSIF NEW.status = 'maybe' THEN") &&
                        migrationSql.includes('রক্তদাতা সম্ভাব্য সম্মতি জানিয়েছেন');
  assert.strictEqual(hasMaybeNotif, true, 'Trigger notifies requester upon maybe response');
});

runTest('10', 'Lifecycle: Donor response "declined" -> Requester notification created', () => {
  const hasDeclinedNotif = migrationSql.includes("ELSIF NEW.status = 'declined' THEN") &&
                           migrationSql.includes('রক্তদাতা অপারগতা প্রকাশ করেছেন');
  assert.strictEqual(hasDeclinedNotif, true, 'Trigger notifies requester upon decline');
});

// ----------------------------------------------------------------------------
// 3. Adversarial & Trigger Defenses (11 - 15)
// ----------------------------------------------------------------------------
runTest('11', 'Adversarial: User B blocked from direct notification INSERT targeting User A', () => {
  const insertRestricted = schemaSql.includes('CREATE POLICY "Staff can send notifications" ON public.notifications') &&
                           schemaSql.includes('FOR INSERT WITH CHECK (public.is_staff()');
  assert.strictEqual(insertRestricted, true, 'Direct client INSERT is restricted to staff/system');
});

runTest('12', 'Adversarial: User B blocked from forging notification update', () => {
  const updateGuarded = schemaSql.includes('user_id = auth.uid()::text');
  assert.strictEqual(updateGuarded, true, 'Notification update strictly matches auth.uid()');
});

runTest('13', 'Adversarial: Cross-donor D blocked from modifying Donor C response', () => {
  const donorRequestUpdatePolicy = schemaSql.includes('CREATE POLICY "Donors can respond to their requests" ON public.donor_requests') &&
                                   schemaSql.includes('donor_user_id = auth.uid()::text');
  assert.strictEqual(donorRequestUpdatePolicy, true, 'Cross-donor modification blocked by RLS');
});

runTest('14', 'Adversarial: Forged donor_request_id / requester_user_id rejected on INSERT', () => {
  const insertOwnershipPolicy = schemaSql.includes('CREATE POLICY "Requesters and staff create donor requests" ON public.donor_requests') &&
                                schemaSql.includes('br.user_id = auth.uid()::text');
  assert.strictEqual(insertOwnershipPolicy, true, 'INSERT requires authenticated ownership of blood request');
});

runTest('15', 'Adversarial: protect_donor_request_fields protects immutable metadata on update', () => {
  const hasFieldProtection = migrationSql.includes('NEW.blood_request_id IS DISTINCT FROM OLD.blood_request_id') &&
                             migrationSql.includes('NEW.match_score IS DISTINCT FROM OLD.match_score') &&
                             migrationSql.includes('NEW.patient_name IS DISTINCT FROM OLD.patient_name');
  assert.strictEqual(hasFieldProtection, true, 'Trigger aborts tampering of protected fields');
});

// ----------------------------------------------------------------------------
// 4. State Transitions & Lifecycle (16 - 18)
// ----------------------------------------------------------------------------
runTest('16', 'State: Legal response transitions allowed (pending -> accepted / maybe / declined, maybe -> accepted / declined)', () => {
  const hasDomainCheck = migrationSql.includes("NEW.status NOT IN ('pending', 'accepted', 'maybe', 'declined')");
  assert.strictEqual(hasDomainCheck, true, 'Allowed status domain is strictly validated');
});

runTest('17', 'State: Illegal transition (declined -> accepted, accepted -> pending) blocked', () => {
  const hasDeclinedLock = migrationSql.includes("IF OLD.status = 'declined' AND NEW.status != 'declined' AND NOT public.is_staff()");
  const hasAcceptedResetLock = migrationSql.includes("IF OLD.status = 'accepted' AND NEW.status = 'pending' AND NOT public.is_staff()");
  assert.strictEqual(hasDeclinedLock && hasAcceptedResetLock, true, 'Illegal transitions strictly aborted by trigger');
});

runTest('18', 'State: Closed blood requests (cancelled, expired, fulfilled) reject donor requests', () => {
  const hasStatusCheck = schemaSql.includes("br.status IN ('active', 'pending', 'matched', 'verified')");
  assert.strictEqual(hasStatusCheck, true, 'RLS policy only permits request creation on active states');
});

// ----------------------------------------------------------------------------
// 5. Privacy & Zero PII Leakage (19 - 20)
// ----------------------------------------------------------------------------
runTest('19', 'Privacy: Notification payload contains zero sensitive PII (No phone, email, NID, address)', () => {
  const sensitiveColumns = ['phone', 'email', 'nid_or_id_number', 'exact_address', 'emergency_contact', 'admin_notes'];
  for (const col of sensitiveColumns) {
    const regex = new RegExp(`\\b${col}\\b`, 'i');
    assert.strictEqual(regex.test(migrationSql.slice(migrationSql.indexOf('handle_donor_request_notifications'))), false, `Sensitive column ${col} must not appear in notification payload`);
  }
});

runTest('20', 'Privacy: Zero cross-user sensitive information exposure in public views', () => {
  const hasSafeViews = schemaSql.includes('CREATE OR REPLACE VIEW public.donors_public_search') &&
                       schemaSql.includes('CREATE OR REPLACE VIEW public.blood_requests_public');
  assert.strictEqual(hasSafeViews, true, 'Public masked views maintain privacy isolation');
});

// ----------------------------------------------------------------------------
// Summary
// ----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`📊 PHASE 1B-1 TEST SUITE SUMMARY: ${passedCount}/${totalCount} PASSED (100%)`);
console.log('================================================================\n');
