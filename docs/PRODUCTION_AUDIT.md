# 📋 PRODUCTION AUDIT REPORT — ROKTOBONDHON PLATFORM
**Document Version:** 1.0.0  
**Audit Date:** 2026-09-07  
**Scope:** Complete Codebase, Backend, Demo Data, Security & Architecture Audit  
**Target Repository:** `https://github.com/bdyusuf2016/roktobondhon`  
**Live Site:** `https://bdyusuf2016.github.io/roktobondhon/`

---

## 1. 🏗️ Current Architecture Overview

- **Frontend Core:** React 19, TypeScript ~5.8, Vite 6.2, TailwindCSS v4.
- **Routing & SPA Handling:** React Router DOM v7 (`HashRouter` fallback compatible with `public/404.html` GitHub Pages redirect script).
- **State Management & Contexts:**
  - `AuthContext.tsx`: Manages authentication state, user session, phone/email login, and demo-role switching.
  - `DataContext.tsx`: Central state hub for donors, blood requests, donor matching requests, donations, hospitals, branches, payment methods, fund disbursements, users, notifications, and audit logging.
  - `SystemConfigContext.tsx`: Central runtime configuration provider connected to `configService.ts`.
  - `OrgConfigContext.tsx`: Organization and branding dynamic adapter.
  - `DialogContext.tsx`: Accessible custom modals, confirmation alerts, and prompt dialogs.
- **Backend Infrastructure:**
  - **Database:** Supabase PostgreSQL (16 core tables).
  - **Auth:** Supabase GoTrue Auth (Email/Password, Phone OTP, Google OAuth) + custom users table sync.
  - **Storage:** Supabase Storage (`avatars`, `verification-docs`, `assets`).

---

## 2. 🗄️ Supabase Tables & Schema Analysis

The current Supabase schema defines 16 core PostgreSQL tables:

| # | Table Name | Purpose | Current Primary Key | Foreign Keys / References |
|---|---|---|---|---|
| 1 | `users` | User accounts, profiles, roles, and status | `id` (TEXT) | Maps to Supabase Auth UID |
| 2 | `branches` | Regional organizational chapters/branches | `id` (TEXT) | `org-roktobondon` |
| 3 | `donors` | Complete donor directory & profile | `id` (TEXT) | `user_id` -> users(id) |
| 4 | `blood_requests` | Patient blood requisitions & emergency requests | `id` (TEXT) | `user_id` -> users(id) |
| 5 | `donor_requests` | Automated matching invitations to donors | `id` (TEXT) | `blood_request_id`, `donor_id` |
| 6 | `donations` | Historical donation records & verifications | `id` (TEXT) | `donor_id` -> donors(id) |
| 7 | `hospitals` | Hospital & blood bank directory | `id` (TEXT) | None |
| 8 | `blood_camps` | Blood donation drives & events | `id` (TEXT) | None |
| 9 | `camp_registrations` | Donor registrations for camps | `id` (TEXT) | `camp_id` -> blood_camps(id) |
| 10 | `fund_donations` | Financial contributions & status | `id` (TEXT) | None |
| 11 | `fund_disbursements` | Financial expenditures & vouchers | `id` (TEXT) | None |
| 12 | `payment_methods` | Mobile banking & bank payment configs | `id` (TEXT) | None |
| 13 | `notifications` | In-app user notifications & alerts | `id` (TEXT) | `user_id` |
| 14 | `audit_logs` | Immutable audit trail of administrative actions | `id` (TEXT) | None |
| 15 | `verification_logs` | Donor verification history & audit | `id` (TEXT) | `donor_id` -> donors(id) |
| 16 | `system_config` | Dynamic JSON configuration store | `id` (TEXT) | `id = 'default'` |

---

## 3. 🔍 Firebase References & Legacy Dependencies

- **Source Code (`src/`):** **ZERO active Firebase imports or runtime dependencies.** All active services (`authService.ts`, `donorService.ts`, `hospitalService.ts`, `fundService.ts`, `userService.ts`, `bloodRequestService.ts`) use `@supabase/supabase-js`.
- **Legacy Artifacts Identified:**
  - `firestore.rules` and `storage.rules` in root directory (obsolete legacy rules files).
  - Obsolete method names with `*InFirestore` suffix in `src/services/` (e.g. `getHospitalsFromFirestore`, `recordDonationInFirestore`) which internally call `supabase.from(...)`.
  - `package-lock.json` and `bun.lock` contain transitive firebase entries from prior setup.

---

## 4. 🧪 Demo Data Sources & Mock Data Audit

The codebase currently contains the following demo/seed data sources:

1. **`src/data/seedData.ts`**:
   - `INITIAL_DEMO_USERS` (10 demo users with preconfigured roles: super_admin, admin, moderator, volunteer, donor, recipient).
   - `generateSeedDonors()` (Generates 100 mock donors using sample Bangla names, blood groups, and locations).
   - `generateSeedRequests()` (Generates mock blood requests).
   - `generateSeedDonations()` (Generates mock donation history).
   - `SEED_FUND_DONATIONS` & `SEED_FUND_DISBURSEMENTS` (Mock financial transactions).
   - `DEFAULT_PAYMENT_METHODS` (Sample bKash, Nagad, Rocket demo numbers).
   - `SEED_BLOOD_CAMPS` (Sample blood camp campaigns).
2. **`src/data/hospitalsData.ts`**:
   - Contains 30+ real & structured hospital entries for Dhamrai, Kalampur, Savar, and Manikganj.
3. **`DataContext.tsx` Fallback Logic**:
   - In demo mode (`isDemoMode = true`), fallback to `generateSeedDonors()` and `generateSeedRequests()` when database returns empty array.
4. **`AuthContext.tsx` Fallback Logic**:
   - In demo mode, defaults to `INITIAL_DEMO_USERS[0]` (`super_admin`).

---

## 5. 🔐 Authentication & Role Flow

- **Authentication Channels:**
  - Direct Phone/Email + Password via Supabase Auth.
  - Phone OTP authentication via Supabase GoTrue Phone Provider.
  - Google OAuth (`signInWithOAuth({ provider: 'google' })`).
- **Role Hierarchy:**
  1. `super_admin`: Unlimited access to all modules, settings, backup, role matrix, and audits.
  2. `admin`: Full operational management, user management, settings, and backups (cannot alter super_admin privileges).
  3. `moderator`: Operational management for donors, blood requests, hospital verification.
  4. `volunteer`: View public donors, manage requests, record verified donations.
  5. `donor`: Access own profile, donor dashboard, history, and certificates.
  6. `recipient`: Create and manage own blood requisitions.
- **Permission Matrix (`src/services/permissions.ts`):**
  - Defines 13 granular permissions (`manage_donors`, `manage_requests`, `record_donation`, `manage_hospitals`, `manage_funds`, `manage_disbursements`, `manage_payment_methods`, `manage_branches`, `manage_users`, `manage_roles_matrix`, `manage_settings`, `manage_backup`, `view_audit_logs`).

---

## 6. 🛡️ PostgreSQL Row Level Security (RLS) & Storage Policies

- **Current RLS State:**
  - RLS enabled on all 16 tables.
  - `supabase/fix_rls_permissions.sql` provides unified policies allowing client operations with anon key while full Supabase Auth token integration is phased in.
- **Storage Buckets:**
  - `avatars` (Public): Profile and coordinator photos.
  - `verification-docs` (Private): NID, medical certificates, donor verification documents.
  - `assets` (Public): Organization logos, banners, and campaign graphics.

---

## 7. ⚙️ Central Settings & Admin Control Center

- **Centralized Service (`src/services/configService.ts`):**
  - Stores 15 configuration domains (`organization`, `branding`, `website`, `seo`, `gamification`, `pwa`, `bloodSystem`, `matching`, `donorEligibility`, `bloodRequests`, `emergency`, `notifications`, `privacy`, `maintenance`, `security`).
  - Read strategy: Checks Supabase `system_config` table (with cached localStorage fallback).
  - Write strategy: Validates input, verifies admin authorization, writes to Supabase `system_config` table, and writes to `audit_logs`.
- **Admin Control Center Components (`src/components/admin/`):**
  - Modularized into 12 dedicated tabs (`AdminDashboardTab`, `AdminDonorsTab`, `AdminRequestsTab`, `AdminHospitalsTab`, `AdminBranchesTab`, `AdminUsersTab`, `AdminFundsTab`, `AdminCampsTab`, `AdminNotificationsTab`, `AdminSettingsTab`, `AdminBackupTab`, `AdminAuditTab`).

---

## 8. ⚠️ Migration & Production Risks

1. **Demo Data Runtime Leakage:** Fallback arrays in `DataContext.tsx` must be cleanly separated so production mode renders proper empty states (`কোনো তথ্য পাওয়া যায়নি`) instead of synthetic records.
2. **Donor Privacy Separation:** Private donor attributes (phone number, NID, exact address) must be separated into a distinct `donor_private` table or restricted via column-level security/RLS.
3. **Hard-coded Business Constants:** Operational constants (blood compatibility weights, search radius, interval days) must be driven strictly by the active `system_config` record.
4. **Privilege Escalation:** Profile update endpoints must never allow direct client-side mutation of user roles or verification flags without server-side validation or privileged functions.

---

## 9. 🚦 Phase 1 Verification Status

- **Code Inspection:** Completed.
- **Lint Check:** Completed (`tsc --noEmit` passed with 0 errors).
- **Build Check:** Completed (`vite build` succeeded with code 0).
