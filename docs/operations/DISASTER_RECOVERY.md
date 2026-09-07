# PRODUCTION DISASTER RECOVERY PLAN & INCIDENT RUNBOOK
**Platform:** রক্ত দান পরিবার কালামপুর (Rokto Dan Poribar Kalampur)  
**Target Coverage:** কালামপুর, ধামরাই, সাভার, মানিকগঞ্জ, ঢাকা  
**Target Infrastructure:** Supabase PostgreSQL, GitHub Pages Static Hosting  

---

## 1. Incident Classification & Response Triage

| Incident Level | Criteria | Immediate Containment Action | Notification Window |
| :--- | :--- | :--- | :--- |
| **SEV-1 (Critical)** | Database inaccessible, unauthorized role escalation, data loss | Lock public endpoints, initiate point-in-time restore | < 15 minutes |
| **SEV-2 (High)** | Storage bucket failure, SMS/Notification delay, partial UI fault | Re-route to offline mode / fallback contact numbers | < 1 hour |
| **SEV-3 (Medium)** | Non-blocking UI defect, styling discrepancy | Hotfix deployment via standard CI/CD pipeline | < 12 hours |

---

## 2. Standard Disaster Recovery Runbooks

### Scenario A: Supabase Database Outage
1. **Detection:** Client reports connection timeouts; `isSupabaseConfigured` errors in console.
2. **Containment:** System automatically engages client-side offline buffer / PWA fallback banner.
3. **Recovery:** Inspect [Supabase Status](https://status.supabase.com/); verify PostgreSQL connection pool health. If unrecoverable, initiate project failover to backup instance using `supabase/schema.sql` and `supabase/fix_rls_permissions.sql`.

### Scenario B: Accidental Data Modification or Corruption
1. **Detection:** Audit log inspection flags unintended batch mutations or status shifts.
2. **Containment:** Administrator temporarily disables non-admin writes or restricts affected table.
3. **Recovery:** Revert affected records using latest snapshot from Admin Backup Center or Supabase Point-in-Time recovery.

### Scenario C: GitHub Pages Deployment Failure
1. **Detection:** GitHub Actions workflow fails on build or deploy job.
2. **Containment:** Previous successful release remains live and served on CDN.
3. **Recovery:** Run `npm run build` and `npm run lint` locally to diagnose build errors; push hotfix commit to `main`.

### Scenario D: Compromised Administrator Account
1. **Detection:** Unauthorized role elevation or anomalous system configuration modification.
2. **Containment:** Super Admin immediately modifies compromised account status to `suspended` and revokes sessions via Supabase Auth.
3. **Recovery:** Rotate administrator passwords, audit recent `audit_logs` entries, and revert unauthorized actions.

### Scenario E: Leaked Public Client Secret
1. **Detection:** Public repository scanner or audit alert.
2. **Containment:** Note that `VITE_SUPABASE_ANON_KEY` is a publishable client key protected by RLS. If a private service key or provider key was leaked, immediately rotate the key in Supabase Dashboard > Project Settings > API.
3. **Recovery:** Update GitHub Secrets with rotated keys and trigger fresh deployment.

---

## 3. Post-Incident Review Protocol
Following every SEV-1 or SEV-2 incident:
1. Conduct root cause analysis (RCA).
2. Update regression test suites (`scripts/runMasterRegressionSuite.ts` or `scripts/testSecurityPenetration.ts`) to prevent recurrence.
3. Document post-mortem in `/docs/operations/` and archive remediation logs.
