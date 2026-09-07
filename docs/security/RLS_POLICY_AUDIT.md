# Row-Level Security (RLS) Policy Audit & Negative Testing
**Platform:** রক্ত দান পরিবার কালামপুর (Rokto Dan Poribar Kalampur)  
**Database:** Supabase PostgreSQL 15+  
**Audit Scope:** All 16 production tables and helper functions

---

## 1. Helper Functions Security

```sql
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
      AND role IN ('super_admin', 'admin', 'moderator', 'volunteer')
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
      AND role IN ('super_admin', 'admin')
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
```

---

## 2. Negative Testing Matrix

| Actor | Target Table | Action | Test Scenario | Expected Outcome | RLS Defense Mechanism |
|:---|:---|:---|:---|:---:|:---|
| **Anonymous** | `users` | `UPDATE` | Attempt to modify arbitrary user profile | ❌ **DENIED** | `USING (auth.uid()::text = id)` evaluates to false |
| **Anonymous** | `donors` | `UPDATE` | Attempt to verify donor status | ❌ **DENIED** | `auth.uid() IS NULL` |
| **Anonymous** | `audit_logs` | `SELECT` | Attempt to read security audit trails | ❌ **DENIED** | `USING (public.is_staff())` requires authenticated staff |
| **Anonymous** | `fund_disbursements` | `INSERT` | Attempt to disburse organization funds | ❌ **DENIED** | `WITH CHECK (public.is_admin())` requires admin |
| **Donor** | `users` | `UPDATE` | Self-escalate `role` to `'super_admin'` | ❌ **DENIED** | Trigger `protect_user_roles()` raises exception |
| **Donor A** | `donors` | `UPDATE` | Modify Donor B's contact or location | ❌ **DENIED** | `USING (auth.uid()::text = user_id)` isolates ownership |
| **Donor A** | `notifications` | `SELECT` | Read Donor B's private inbox messages | ❌ **DENIED** | `USING (user_id = auth.uid()::text)` isolates notifications |
| **Volunteer** | `fund_donations` | `UPDATE` | Mark money donation as `'verified'` | ❌ **DENIED** | Trigger `protect_fund_donation_verification()` requires admin |
| **Volunteer** | `system_config` | `UPDATE` | Change system maintenance or matching rules | ❌ **DENIED** | `WITH CHECK (public.is_admin())` denies volunteer |
| **Moderator** | `users` | `DELETE` | Delete super_admin account | ❌ **DENIED** | `USING (public.is_admin())` and application RBAC rules |
| **Any User** | `audit_logs` | `DELETE` | Delete or tamper with audit trail logs | ❌ **DENIED** | `USING (false)` makes table strictly append-only |
