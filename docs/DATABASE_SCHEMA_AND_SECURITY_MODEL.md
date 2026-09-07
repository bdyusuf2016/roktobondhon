# RoktoBondhon — Database Schema & Security Architecture
## Supabase PostgreSQL Schema, RLS Rules & Privacy Architecture

This document specifies the authoritative database structure and security enforcement layers for **রক্তবন্ধন (RoktoBondhon)**.

---

## 1. Tables Overview

| Table Name | Primary Function | RLS Status | Privacy Tier |
|---|---|:---:|---|
| `donors` | Public donor registry (name, blood group, district, availability) | Enforced | Public / Anonymized |
| `donor_private` | Sensitive donor data (exact phone, NID, medical history) | Enforced | Strict Private (Self & Admin Only) |
| `blood_requests` | Active and past blood requests with hospital and contact | Enforced | Public / Protected |
| `hospitals` | Hospital directory with district, upazila, hotline | Enforced | Public Read, Admin Write |
| `blood_camps` | Donation camps, dates, venues, targets, status | Enforced | Public Read, Admin Write |
| `fund_donations` | Financial donations ledger with bKash/Nagad trxID | Enforced | User Self / Admin Write |
| `system_config` | Central configuration key-value storage | Enforced | Public Read, Admin Write |
| `audit_logs` | Immutable audit trail with actor ID, IP, diff snapshot | Enforced | Append-Only, SuperAdmin Read |
| `notifications` | Notification alerts across push, SMS, in-app | Enforced | User Private |

---

## 2. Row Level Security (RLS) Policy Specifications

### 2.1 `donor_private` Isolation Rule
```sql
-- Only the donor themselves or authorized administrators can read private details
CREATE POLICY "donor_private_select_policy" ON "donor_private"
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('superadmin', 'admin')
    )
  );
```

### 2.2 `audit_logs` Immutability Guarantee
```sql
-- Audit logs can NEVER be updated or deleted by any user or administrator
CREATE POLICY "audit_logs_insert_only" ON "audit_logs"
  FOR INSERT WITH CHECK (true);

-- No UPDATE or DELETE policy exists on audit_logs table (guaranteed immutable)
```

---

## 3. Sandboxing & Local Simulation Resilience

The platform features a zero-crash sandbox fallback. In environments where remote Supabase credentials are not provided:
1. `supabase/config.ts` detects lack of credentials and seamlessly switches to the reactive Local Storage & In-Memory engine.
2. All 15 configuration sections automatically fall back to hardcoded production defaults.
3. System Health tab signals `Sandbox Preview` mode without breaking any frontend components or forms.
