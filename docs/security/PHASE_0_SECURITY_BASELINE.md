# ROKTOBONDHON — PHASE 0 PRODUCTION SECURITY BASELINE

**Document Version:** 1.0.0 (FROZEN BASELINE)  
**Status:** 🟢 FROZEN & VERIFIED  
**Date:** September 14, 2026  
**Target Environment:** Production Supabase (`https://yxwqgpcjzcxpdmpltzqo.supabase.co`)  
**Production Domain:** `https://roktodanporibar.com/`

---

## 1. Executive Summary

Phase 0 (Security Hardening) and Phase 0.7 (Authenticated QA) are completed and frozen. All critical security gates have passed live verification. Unauthenticated public access to sensitive donor PII, requester patient details, and audit logs has been eliminated. The P2 hospital authorization vulnerability discovered in Phase 0.7 has been remediated and verified live.

---

## 2. Current Database & Migration State

* **Migration Source:** `supabase/migrations/20260914_phase0_security_hardening.sql` (synchronized with applied REVISED PART A + P2 hospital remediation).
* **Execution Status on Production:** Applied and committed. PostgREST schema cache reloaded (`NOTIFY pgrst, 'reload schema'`).
* **Trigger Status:**
  - `public.users`: `trg_protect_user_roles` active on `BEFORE INSERT OR UPDATE`. Forcibly overrides non-admin role mutations to `'donor'` and prevents privilege escalation.
  - `public.donors`: `trg_protect_donor_verification` active on `BEFORE UPDATE`. Blocks self-verification.
  - `public.fund_donations`: `trg_protect_fund_donations` active on `BEFORE UPDATE`. Blocks non-admin verification.
  - `auth.users`: `public.handle_new_user()` hook functions with strict `SECURITY DEFINER SET search_path = public, pg_temp` and ignores client-supplied roles, forcing safe default `'donor'`.

---

## 3. Active Row-Level Security (RLS) Policy Baseline

| Table | Policy Name | Action | Scope / Expression | Security Boundary |
| :--- | :--- | :--- | :--- | :--- |
| `public.users` | `Users view self or staff view all` | SELECT | `auth.uid()::text = id OR public.is_staff()` | Anonymous & cross-user reads completely blocked (0 rows). |
| `public.users` | `Admins and service_role insert users` | INSERT | `public.is_admin() OR current_user IN ('postgres', 'service_role')` | Self-signup cannot directly create records in `users`. |
| `public.users` | `Users update self or admin update` | UPDATE | `auth.uid()::text = id OR public.is_admin()` | Users can only update their own non-privileged profile data. |
| `public.users` | `Admins delete users` | DELETE | `public.is_admin()` | Administrative deletion only. |
| `public.donors` | `Donors view self or staff view all` | SELECT | `auth.uid()::text = user_id OR public.is_staff()` | Raw donor table (with phone, NID, address) restricted to owner & staff. |
| `public.donors` | `Donors insert own profile` | INSERT | `auth.uid()::text = user_id OR public.is_staff() OR current_user IN ('postgres', 'service_role')` | Strict binding to authenticated user ID. |
| `public.donors` | `Donors update own profile` | UPDATE | `auth.uid()::text = user_id OR public.is_staff()` | Donor self-updates restricted to own row. |
| `public.donors` | `Admins delete donors` | DELETE | `public.is_admin()` | Administrative deletion only. |
| `public.blood_requests` | `Authorized view on blood requests` | SELECT | `auth.uid()::text = user_id OR public.is_staff() OR EXISTS (...)` | Raw patient details restricted to requester, staff, or accepted match donor. |
| `public.blood_requests` | `Public create blood requests` | INSERT | `user_id = COALESCE(auth.uid()::text, user_id) OR current_user IN ('postgres', 'service_role')` | Emergency blood requests submittable by community. |
| `public.blood_requests` | `Requesters and staff update blood requests` | UPDATE | `user_id = auth.uid()::text OR public.is_staff()` | Requester/staff only. |
| `public.blood_requests` | `Admins delete blood requests` | DELETE | `public.is_admin()` | Administrative deletion only. |
| `public.audit_logs` | `Staff view audit trail` | SELECT | `public.is_staff()` | Public cannot view administrative audit logs. |
| `public.audit_logs` | `Service role insert audit logs` | INSERT | `current_user IN ('postgres', 'service_role')` | Direct client INSERT hard-blocked; writes route via `record_audit_log` RPC. |
| `public.audit_logs` | `Block update audit logs` | UPDATE | `false` | Immutable audit trail. |
| `public.audit_logs` | `Block delete audit logs` | DELETE | `false` | Immutable audit trail. |
| `public.donations` | `Donors view own donations or staff view all` | SELECT | `donor_user_id = auth.uid()::text OR public.is_staff()` | Personal donation history isolated to donor & staff. |
| `public.donations` | `Staff insert donations` | INSERT | `public.is_staff()` | Staff verification only. |
| `public.donations` | `Admins update donations` / `delete` | UPDATE/DELETE| `public.is_admin()` | Administrative governance. |
| `public.hospitals` | `Public view verified hospitals` | SELECT | `verification_status = 'verified' OR public.is_staff()` | Public only sees verified hospitals. |
| `public.hospitals` | `Community submit unverified hospitals` | INSERT | `verification_status = 'unverified' OR public.is_staff()` | Community submissions quarantined as `unverified`. |
| `public.hospitals` | `Staff update hospitals` | UPDATE | `public.is_staff()` WITH CHECK `public.is_staff()` | Staff only (legacy permissive policy dropped). |
| `public.hospitals` | `Admins delete hospitals` | DELETE | `public.is_admin()` | Administrative deletion only. |

---

## 4. Public Safe Views Baseline

1. **`public.donors_public_search`**:
   - Filter: `WHERE d.verification_status = 'verified'`
   - Masked: Completely omits `phone`, `nid_or_id_number`, `exact_address`, `emergency_contact_phone`, `admin_notes`, `email`.
   - Exposed: `id`, `donor_id`, `full_name`, `photo_url`, `blood_group`, `division`, `district`, `upazila`, `area`, `location_label`, `availability`, `emergency_available`, `last_donation_date`, `total_donations`, `verification_status`, `organization_id`, `branch_id`, `gender`, `created_at`.
2. **`public.blood_requests_public`**:
   - Filter: `WHERE r.status IN ('active', 'verified', 'matched', 'fulfilled')`
   - Masked: Completely omits `patient_name`, `contact_person`, `contact_number`, `relationship`, `notes`.
   - Exposed: `id`, `request_id`, `blood_group`, `required_units`, `required_date`, `required_time`, `hospital`, `division`, `district`, `upazila`, `area`, `emergency_level`, `status`, `is_verified`, `verified_at`, `organization_id`, `expires_at`, `created_at`.

---

## 5. Storage Security Policies Baseline

1. **`avatars` (Public Bucket):**
   - SELECT: Public read (`bucket_id = 'avatars'`).
   - INSERT: Authenticated users only, restricted to folder matching user UID (`(storage.foldername(name))[1] = auth.uid()::text OR public.is_staff()`).
2. **`assets` (Public Bucket):**
   - SELECT: Public read.
   - INSERT: Staff only (`public.is_staff()`).
3. **`verification-docs` (Strict Private Bucket):**
   - SELECT / INSERT: Restricted to owner folder matching authenticated donor ID/UID or authorized staff (`public.is_staff()`).
   - Anonymous access: Hard-denied (0 access).
   - DELETE: Administrative only (`public.is_admin()`).

---

## 6. Security Test Results & Telemetry Verification

* **Live Security Probe (`testLiveSecurityChecks.ts`):** 🟢 **7/7 PASSED**
  - Raw `users` read: DENIED (0 rows)
  - Raw `donors` read: DENIED (0 rows)
  - Raw `blood_requests` read: DENIED (0 rows)
  - Direct `audit_logs` INSERT: DENIED (42501 RLS error)
  - `donors_public_search` view: AVAILABLE (Zero PII leaks)
  - `blood_requests_public` view: AVAILABLE (Zero Patient PII leaks)
  - Private `verification-docs` storage: DENIED
* **Phase 0 Static Verifier (`verifyPhase0Hardening.ts`):** 🟢 **7/7 PASSED**
* **Security Penetration Suite (`testSecurityPenetration.ts`):** 🟢 **16/16 PASSED**
* **Phase 0.7 Authenticated QA (`testPhase07MultiRoleQA.ts`):** 🟢 **18 PASSED \| 0 FAILED \| 4 NOT TESTED**
* **Hospital P2 Authorization Bug:** 🟢 **CLOSED** (0 rows modified by donor).

---

## 7. Known Security Limitations & Deferred Items

1. **Authenticated Staff-Role QA (`volunteer/moderator/admin/super_admin = NOT TESTED`):**
   - The live permissions for `volunteer`, `moderator`, `admin`, and `super_admin` have been verified at the code/policy level, but live end-to-end testing with actual staff JWT tokens was not executed (`volunteer/moderator/admin/super_admin = NOT TESTED`) because real staff credentials are not stored in the repository environment.
   - *Recommendation:* Perform role-specific validation during staging/administrative onboarding.
2. **Legacy `on_auth_user_created` Trigger:**
   - The trigger remains registered in `auth.users` because dropping triggers on `auth.users` requires `supabase_auth_admin` privileges.
   - *Mitigation:* It executes `public.handle_new_user()` which strictly ignores metadata roles and forces `'donor'`. It is completely neutralized.

---

## 8. Protected Baseline Files & Phase 1 Change Policy

* `supabase/schema.sql` is **not completely immutable**: application feature schema updates (e.g., new tables, columns, indexes for Phase 1) are permitted, but **security-sensitive Phase 0 sections (RLS policies, role triggers, public safe views, and auth hooks) must not be changed in Phase 1 without separate review**.
* Migration record: `supabase/migrations/20260914_phase0_security_hardening.sql` (Frozen baseline record).
* Service layer security boundaries (preserve public view routing & folder checks):
  - `src/services/donorService.ts`
  - `src/services/bloodRequestService.ts`
  - `src/services/storageService.ts`
* Permanent security test suite (preserve for regression checks):
  - `scripts/testSecurityPenetration.ts`
  - `scripts/testLiveSecurityChecks.ts`
  - `scripts/verifyPhase0Hardening.ts`
  - `scripts/testPhase07MultiRoleQA.ts`
