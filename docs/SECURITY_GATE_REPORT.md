# Security Gate Report

**Project:** রক্ত দান পরিবার কালামপুর (Rokto Dan Poribar Kalampur)  
**Evaluation Date:** September 2026  
**Status:** **PASS WITH WARNINGS** (Vulnerabilities identified and resolved in `supabase/production_rls_policies.sql`)

---

## 1. Executive Summary

| Category | Severity | Initial Finding | Resolution / Status |
| :--- | :---: | :--- | :--- |
| **RLS Wildcard Script** | **CRITICAL** | `supabase/fix_rls_permissions.sql` granted open read/write (`FOR ALL TO public`) on all 16 tables. | Replaced by `supabase/production_rls_policies.sql` enforcing authenticated ownership, staff, and admin checks. |
| **System Config Modification** | **CRITICAL** | Anonymous clients could update `system_config` table directly. | Restricted UPDATE on `system_config` strictly to `is_admin()`. |
| **Role Escalation via Direct Write** | **HIGH** | Unchecked UPDATE on `users` table could allow a user to change `role` to `super_admin`. | Added `public.is_admin()` gate on user role updates. |
| **Storage Document Privacy** | **MEDIUM** | Verification documents require private token enforcement. | `verification-docs` bucket configured as private (`public = false`) requiring authenticated staff/owner access. |
| **Audit Log Tampering** | **MEDIUM** | Direct client writes to `audit_logs` could allow forged actor identity. | SELECT restricted to staff (`is_staff()`); write events captured with server-side timestamps. |

---

## 2. Test Cases & Expected Behaviors

### Unauthenticated / Anonymous Access
- `users`: Can read public directory profile cards; **cannot** update or delete profiles.
- `donors`: Can search verified public directory donors; **cannot** read unverified donor records or private notes.
- `blood_requests`: Can browse active/urgent requests; can submit new emergency blood requests.
- `system_config`: Can view public branding & settings; **cannot** modify settings.
- `notifications`: **Cannot** read private user notifications.
- `storage/verification-docs`: **DENY** unauthenticated access.

### Role Isolation & RBAC
- **Donor**: Own profile and donor record write **ALLOWED**; other donors' private records **DENIED**; role change **DENIED**.
- **Recipient**: Own blood request write **ALLOWED**; modifying other users' requests **DENIED**.
- **Volunteer**: Reading donor verification queue **ALLOWED**; updating system configuration **DENIED**.
- **Moderator**: Managing operational items (camps, requests) **ALLOWED**; elevating role to Super Admin **DENIED**.
- **Admin**: Operational management & system configuration **ALLOWED**; modifying Super Admin accounts **DENIED**.
- **Super Admin**: Full platform configuration and administrative control **ALLOWED**.

---

## 3. Recommended Remediation Script
To activate the production-hardened RLS policies in Supabase, execute:
- [supabase/production_rls_policies.sql](file:///d:/Web%20App/রক্তবন্ধন-(roktobondon)---blood-donation-platform55/রক্তবন্ধন-(roktobondon)---blood-donation-platform/supabase/production_rls_policies.sql) in your Supabase SQL Editor.
