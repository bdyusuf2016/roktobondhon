# Supabase PostgreSQL Database Security Matrix
**Platform:** রক্ত দান পরিবার কালামপুর (Rokto Dan Poribar Kalampur)  
**Database:** PostgreSQL 15+ with Row-Level Security (RLS)  
**Status:** 🟢 RLS Enabled & Hardened Across All 16 Core Tables

---

## Database Tables RLS Matrix

| # | Table Name | RLS Enabled | SELECT Policy | INSERT Policy | UPDATE Policy | DELETE Policy | Sensitive Columns / Protected Attributes |
|:--|:---|:---:|:---|:---|:---|:---|:---|
| 1 | `users` | ✅ Yes | Public read safe card profile | `auth.uid() = id` or `is_admin()` | `auth.uid() = id` or `is_admin()` (Protected via `protect_user_roles` trigger) | `is_admin()` | `role`, `status`, `organization_id` |
| 2 | `branches` | ✅ Yes | Active: Public; Inactive: `is_staff()` | `is_admin()` | `is_admin()` | `is_admin()` | `coordinator_phone`, coordinates |
| 3 | `donors` | ✅ Yes | Verified: Public; Unverified: Owner / `is_staff()` | `auth.uid() = user_id` or `is_staff()` | `auth.uid() = user_id` or `is_staff()` (Protected via `protect_donor_verification` trigger) | `is_admin()` | `phone`, `nid_or_id_number`, `exact_address`, `emergency_contact`, `admin_notes` |
| 4 | `blood_requests` | ✅ Yes | Active/Verified: Public; Expired: Owner / `is_staff()` | Public with validation check | `user_id = auth.uid()` or `is_staff()` | `is_admin()` | `contact_number`, `patient_name`, notes |
| 5 | `donor_requests` | ✅ Yes | Donor / Requester / `is_staff()` | Requester / `is_staff()` | Donor / `is_staff()` | None (Cascade with blood_request) | `match_score`, response status |
| 6 | `donations` | ✅ Yes | Public impact log | `is_staff()` | `is_admin()` | `is_admin()` | `units`, `verification_date`, `verified_by` |
| 7 | `hospitals` | ✅ Yes | Verified: Public; Unverified: `is_staff()` | Public submissions | `is_staff()` | `is_admin()` | `contact_number`, emergency numbers |
| 8 | `blood_camps` | ✅ Yes | Public | `is_staff()` | `is_staff()` | `is_admin()` | `coordinator_phone`, target units |
| 9 | `camp_registrations` | ✅ Yes | Owner (`user_id`) / `is_staff()` | Public registration | `is_staff()` | `is_admin()` | `phone`, registration details |
| 10 | `fund_donations` | ✅ Yes | Verified: Public; Pending: `is_staff()` | Public submissions | `is_admin()` (Protected via `protect_fund_donation_verification` trigger) | `is_admin()` | `amount`, `transaction_id`, `verified_by`, status |
| 11 | `fund_disbursements`| ✅ Yes | Public for financial transparency | `is_admin()` | `is_admin()` | `is_admin()` | `amount`, `recipient_name`, approval |
| 12 | `payment_methods` | ✅ Yes | Active: Public; Inactive: `is_admin()` | `is_admin()` | `is_admin()` | `is_admin()` | Merchant / Personal numbers |
| 13 | `notifications` | ✅ Yes | `user_id = auth.uid()` or `user_id = 'all'` or `is_staff()` | `is_staff()` | `user_id = auth.uid()` or `is_staff()` (Mark as read) | `is_staff()` | Personal notification payload |
| 14 | `audit_logs` | ✅ Yes | `is_staff()` | Public / System append | 🚫 BLOCKED (`USING (false)`) | 🚫 BLOCKED (`USING (false)`) | `actor_id`, `actor_role`, `action`, `metadata` |
| 15 | `verification_logs`| ✅ Yes | `is_staff()` | `is_staff()` | `is_admin()` | `is_admin()` | `verifier_id`, verification tokens |
| 16 | `system_config` | ✅ Yes | Public site parameters | `is_admin()` | `is_admin()` | `is_admin()` | JSON configuration |

---

## Security Definer Functions & Triggers

1. `is_staff()`: `SECURITY DEFINER SET search_path = public, pg_temp;` (Verifies caller role in `users` table)
2. `is_admin()`: `SECURITY DEFINER SET search_path = public, pg_temp;` (Verifies caller is `admin` or `super_admin`)
3. `protect_user_roles()`: Trigger `BEFORE UPDATE ON public.users` (Blocks non-admins from changing roles)
4. `protect_donor_verification()`: Trigger `BEFORE UPDATE ON public.donors` (Blocks non-staff from self-verifying)
5. `protect_fund_donation_verification()`: Trigger `BEFORE UPDATE ON public.fund_donations` (Blocks unauthorized verification of monetary donations)
