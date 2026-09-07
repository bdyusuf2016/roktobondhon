# Supabase Migration Plan for Roktobondon Platform

## Overview
This plan outlines the complete migration of the **রক্তবন্ধন (Roktobondon)** blood donation platform backend from Firebase / Firestore to **Supabase** (PostgreSQL database, Supabase Auth, Supabase Storage, and Realtime subscriptions).

---

## User Review Required

> [!IMPORTANT]
> **Supabase Project Credentials Required for Production:**
> After we implement the code and generate the SQL schema, you will need to:
> 1. Create a project at [supabase.com](https://supabase.com).
> 2. Copy the SQL script we generate (`supabase/schema.sql`) and paste it into the **Supabase SQL Editor** to create all tables and policies with one click.
> 3. Add your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to your `.env` file.
> 
> *The application will also maintain a seamless fallback/demo simulation mode so everything remains previewable locally even before you add Supabase keys.*

---

## Proposed Architecture & Changes

### 1. Database Schema (`supabase/schema.sql`)
PostgreSQL tables mapped from the current TypeScript data models:
- `users`: User profiles (id, full_name, email, phone, role, status, phone_verified, organization_id, branch_id, photo_url, created_at, updated_at).
- `donors`: Public & private donor records with privacy toggles (donor_id, user_id, full_name, blood_group, division, district, upazila, area, availability, emergency_available, total_donations, verification_status, phone, email, date_of_birth, gender, exact_address, emergency_contact, admin_notes, nid_number, privacy_json, verified_by, verified_at).
- `blood_requests`: Blood donation emergency requests (request_id, user_id, patient_name, blood_group, required_units, required_date, required_time, hospital, division, district, upazila, area, contact_person, contact_number, relationship, emergency_level, notes, status, is_verified, verified_by, verified_at, expires_at).
- `donor_requests`: Direct contact requests sent to matching donors.
- `donations`: Verified blood donation records with date and hospital details.
- `hospitals`: Directory of hospitals and blood banks.
- `fund_donations`: Crowdfunding/financial donations records.
- `fund_disbursements`: Expenditure vouchers.
- `payment_methods`: bKash, Nagad, Rocket, Bank account configurations.
- `donation_causes`: Fundraising cause campaigns.
- `notifications`: User and broadcast notifications.
- `audit_logs`: Immutable security audit trails.
- `verification_logs`: Donor verification history.

### 2. Client & SDK Setup
- Install `@supabase/supabase-js`.
- Create `src/supabase/config.ts` initializing the Supabase client with environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) and fallback demo mode detection.

### 3. Service Layer Refactoring
- [NEW] `src/supabase/config.ts`: Supabase client initialization.
- [MODIFY] `src/services/authService.ts`: Supabase Auth methods (`signInWithPassword`, `signUp`, `signInWithOtp`, `verifyOtp`, `signInWithOAuth` for Google, `signOut`, `onAuthStateChange`).
- [MODIFY] `src/services/userService.ts`: Query and mutate `users` table via Supabase client.
- [MODIFY] `src/services/donorService.ts`: Search, register, update, and verify donors in PostgreSQL.
- [MODIFY] `src/services/bloodRequestService.ts`: Create, update, list, and verify blood requests.
- [MODIFY] `src/services/donorRequestService.ts`: Send contact requests and record donor responses.
- [MODIFY] `src/services/donationService.ts`: Query and record completed donations.
- [MODIFY] `src/services/hospitalService.ts`: CRUD for hospitals table.
- [MODIFY] `src/services/fundService.ts`: Manage fund donations, disbursements, and payment methods.
- [MODIFY] `src/services/notificationService.ts`: Manage user and broadcast notifications.
- [MODIFY] `src/services/auditService.ts`: Record and fetch audit logs.
- [MODIFY] `src/services/storageService.ts`: Upload files to Supabase Storage buckets (`avatars`, `verification-docs`, `assets`).

### 4. Contexts & UI Pages Update
- [MODIFY] `src/contexts/AuthContext.tsx`: Update auth state listener and login/register methods to use Supabase Auth and User types.
- [MODIFY] `src/contexts/DataContext.tsx`: Sync data with Supabase tables and remove legacy Firestore listeners/batches.
- [MODIFY] `src/pages/LoginPage.tsx`: Update OTP/Email/Google handlers to work with Supabase.
- [MODIFY] `src/pages/AdminDashboardPage.tsx`: Adjust config imports and demo mode checks.
- [MODIFY] `.env.example` & `.env`: Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

---

## Verification Plan

### Automated Verification
- Run `npm run build` / `tsc --noEmit` to verify type safety and ensure no broken Firebase references remain.

### Manual Verification
- Test login with Email/Password and Demo mode.
- Test searching donors and filtering by blood group and location.
- Test creating a blood emergency request.
- Test Admin Dashboard data views and management tabs.
