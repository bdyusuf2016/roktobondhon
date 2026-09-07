# Demo Data Audit & Cleanup Documentation

**Project:** রক্ত দান পরিবার কালামপুর (Rokto Dan Poribar Kalampur)  
**Date:** September 2026  
**Status:** **REMOVED FROM RUNTIME & ISOLATED**

---

## 1. Source Classification Matrix

| File / Symbol | Classification | Action Taken | Rationale |
| :--- | :---: | :--- | :--- |
| `generateSeedDonors()` in `seedData.ts` | **DEMO / TEST FIXTURE** | Removed runtime fallback in `DataContext.tsx`. Isolated to dev/test fixtures. | Production application must only display real Supabase donors. |
| `generateSeedRequests()` in `seedData.ts` | **DEMO / TEST FIXTURE** | Removed runtime fallback in `DataContext.tsx`. Isolated to dev/test fixtures. | Production application must only display real Supabase blood requests. |
| `generateSeedDonations()` in `seedData.ts` | **DEMO / TEST FIXTURE** | Removed runtime fallback in `DataContext.tsx`. Isolated to dev/test fixtures. | Production application must only display real verified donations. |
| `INITIAL_DEMO_USERS` in `seedData.ts` | **DEMO / TEST FIXTURE** | Auto-login fallback removed from `AuthContext.tsx`. Users must authenticate via Supabase. | Production security requires real authentication. |
| `SEED_FUND_DONATIONS` in `seedData.ts` | **DEMO / TEST FIXTURE** | Removed runtime fallback in `DataContext.tsx`. | Real financial transactions only. |
| `SEED_FUND_DISBURSEMENTS` in `seedData.ts` | **DEMO / TEST FIXTURE** | Removed runtime fallback in `DataContext.tsx`. | Real disbursements only. |
| `DEFAULT_PAYMENT_METHODS` in `seedData.ts` | **DEMO / STATIC** | Runtime uses `payment_methods` Supabase table. Empty state shown when none exist. | Avoids displaying unconfigured payment channels. |
| `SEED_BLOOD_CAMPS` in `seedData.ts` | **DEMO / TEST FIXTURE** | Removed runtime fallback in `DataContext.tsx`. | Real blood drives only. |
| `DEFAULT_ROLE_PERMISSIONS` in `seedData.ts` | **REAL STATIC DATA** | **Retained** in codebase. | Canonical RBAC default permission structure. |
| `PERMISSION_DEFINITIONS` in `seedData.ts` | **REAL STATIC DATA** | **Retained** in codebase. | System-wide permission key labels and descriptions. |
| `HOSPITALS_DATA` in `hospitalsData.ts` | **REAL STATIC DATA** | Seeded to Supabase `hospitals` table. Live queries read from database. | Genuine hospital directory for Dhamrai, Savar, Manikganj, and Dhaka. |

---

## 2. Empty State Verification

All pages and data lists implement Bangla empty states when no records exist in the Supabase database:
- **Donors Directory**: "কোনো রক্তদাতা পাওয়া যায়নি।"
- **Blood Requests**: "বর্তমানে কোনো সক্রিয় রক্তের অনুরোধ নেই।"
- **Hospitals Directory**: "কোনো হাসপাতালের তথ্য পাওয়া যায়নি।"
- **Donations History**: "এখনও কোনো রক্তদানের রেকর্ড নেই।"
- **Notifications**: "কোনো নতুন বিজ্ঞপ্তি নেই।"
- **Fund Donors / Disbursements**: "কোনো আর্থিক লেনদেন পাওয়া যায়নি।"
- **Blood Camps**: "বর্তমানে কোনো রক্তদান ক্যাম্প নির্ধারিত নেই।"

---

## 3. Database Cleanup Script
A safe idempotent script for pruning synthetic demo records in PostgreSQL is available at:
- [supabase/scripts/cleanup-demo-data.sql](file:///d:/Web%20App/রক্তবন্ধন-(roktobondon)---blood-donation-platform55/রক্তবন্ধন-(roktobondon)---blood-donation-platform/supabase/scripts/cleanup-demo-data.sql)
