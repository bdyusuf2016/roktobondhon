# Security Remediation & Hardening Log
**Platform:** রক্ত দান পরিবার কালামপুর (Rokto Dan Poribar Kalampur)  
**Phase:** 28 — Independent Production Security & Penetration Audit

---

## Remediation Log

| Item ID | Vulnerability / Issue | Target File(s) | Fix Implemented | Verification Method |
|:---|:---|:---|:---|:---|
| **REM-01** | User vertical role escalation vulnerability | `supabase/production_rls_policies.sql`, `supabase/fix_rls_permissions.sql` | Added `protect_user_roles()` trigger blocking unauthorized role changes | `npm run test:security` (`SEC-02`, `SEC-03`) |
| **REM-02** | Missing search_path on `SECURITY DEFINER` functions | `supabase/production_rls_policies.sql`, `supabase/schema.sql` | Appended `SET search_path = public, pg_temp;` to all functions | Code Audit & SQL execution validation |
| **REM-03** | Sensitive donor fields returned in public directory query | `src/services/donorService.ts` | Explicitly selected `PUBLIC_DONOR_COLUMNS` omitting NID and exact address | `npm run test:security` (`SEC-05`) |
| **REM-04** | Missing private RLS policy on `verification-docs` storage bucket | `supabase/production_rls_policies.sql` | Created private upload/select policies scoped to owner donor and staff | Storage policy inspection |
| **REM-05** | Mutable audit trail vulnerability | `supabase/production_rls_policies.sql` | Added immutable `USING (false)` update and delete policies on `audit_logs` | Audit test validation |
| **REM-06** | Unauthorized fund donation verification | `supabase/production_rls_policies.sql` | Added `protect_fund_donation_verification()` trigger requiring admin | `npm run test:security` (`SEC-06`) |
| **REM-07** | Transitive `qs` / `body-parser` dependency advisory | `package.json` | Removed unused `express` & `@types/express` packages | `npm audit` (0 vulnerabilities) |
