# Supabase RLS Current State Audit

**Project:** রক্ত দান পরিবার কালামপুর (Rokto Dan Poribar Kalampur)  
**Repository:** [https://github.com/bdyusuf2016/roktobondhon](https://github.com/bdyusuf2016/roktobondhon)  
**Date:** September 2026  
**Auditor:** Automated Antigravity Security Inspection

---

## 1. Table-by-Table RLS Matrix

The following matrix documents the exact effective database access granted by `supabase/fix_rls_permissions.sql` and the baseline `supabase/schema.sql`:

| Table | RLS Enabled | SELECT anon | SELECT auth | INSERT anon | INSERT auth | UPDATE anon | UPDATE auth | DELETE anon | DELETE auth |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `users` | YES | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW |
| `branches` | YES | ALLOW (Public) | ALLOW | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW |
| `donors` | YES | ⚠️ PERMISSIVE (All columns) | ALLOW | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW |
| `blood_requests` | YES | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW |
| `donor_requests` | YES | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW |
| `donations` | YES | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW |
| `hospitals` | YES | ALLOW (Directory) | ALLOW | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW |
| `blood_camps` | YES | ALLOW (Public) | ALLOW | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW |
| `camp_registrations` | YES | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW |
| `fund_donations` | YES | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW |
| `fund_disbursements` | YES | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW |
| `payment_methods` | YES | ALLOW (Public) | ALLOW | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW |
| `notifications` | YES | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW |
| `audit_logs` | YES | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW |
| `verification_logs` | YES | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW |
| `system_config` | YES | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW | ⚠️ PERMISSIVE | ALLOW |

---

## 2. Storage Buckets Access Matrix

| Bucket Name | Public Flag | SELECT anon | SELECT auth | INSERT anon | INSERT auth | UPDATE auth | DELETE auth | Security Assessment |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `avatars` | `true` | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW (Owner) | ALLOW (Owner/Admin) | Public access acceptable for profile avatars. |
| `verification-docs` | `false` | ⛔ DENY | ALLOW (Owner/Staff) | ⛔ DENY | ALLOW (Owner) | ⛔ DENY | ALLOW (Staff/Admin) | **SECURE**: Private bucket requiring signed URLs or auth tokens. |
| `assets` | `true` | ALLOW | ALLOW | ⛔ DENY | ALLOW (Admin) | ALLOW (Admin) | ALLOW (Admin) | Public access acceptable for static logos/icons. |

---

## 3. Vulnerability Findings & Root Cause

1. **`supabase/fix_rls_permissions.sql` Wildcard Exposure (CRITICAL)**:
   - Contains: `CREATE POLICY "Allow public all on %I" ON public.%I FOR ALL TO public USING (true) WITH CHECK (true);`
   - **Impact**: Any client holding the public `anon` API key can execute unauthenticated read/write/delete operations against sensitive tables (`users`, `system_config`, `audit_logs`, `donors`, `fund_donations`).
2. **`system_config` Unrestricted Update (CRITICAL)**:
   - Unauthenticated actors could modify global site settings, maintenance mode, and permission mappings.
3. **Audit Log Fabrication Risk (HIGH)**:
   - Client-side inserts to `audit_logs` are currently unrestricted; actors can forge verification or role audit trails.
4. **Field-Level Sensitivity Exposure (HIGH)**:
   - Donor records contain sensitive fields (`phone`, `exact_address`, `nid_or_id_number`, `admin_notes`) directly queryable if full row SELECT is permitted.

---

## 4. Production Target Access Control Specification

```
┌─────────────────────────────────────────────────────────────┐
│                      ROLE HIERARCHY                         │
│                                                             │
│  [PUBLIC / ANON]                                            │
│    ├── SELECT: verified public donors (safe fields)        │
│    ├── SELECT: active blood requests                        │
│    ├── SELECT: hospitals, blood camps, public config        │
│    └── INSERT: public blood request, fund donation          │
│                                                             │
│  [AUTHENTICATED USER / DONOR / RECIPIENT]                   │
│    ├── ALL ON: own user profile, own donor record           │
│    ├── ALL ON: own created blood requests                   │
│    └── SELECT: own notifications, own donation history      │
│                                                             │
│  [VOLUNTEER]                                                │
│    ├── SELECT: donor verification queue                     │
│    └── UPDATE: verify blood requests, add hospital entry    │
│                                                             │
│  [MODERATOR / ADMIN]                                        │
│    ├── MANAGE: donors, requests, blood camps, disbursements │
│    ├── VIEW: audit logs, verification logs                  │
│    └── UPDATE: standard system_config domains               │
│                                                             │
│  [SUPER ADMIN]                                              │
│    ├── ALL PRIVILEGES on all tables                         │
│    └── MANAGE: roles matrix, security config, restore       │
└─────────────────────────────────────────────────────────────┘
```
