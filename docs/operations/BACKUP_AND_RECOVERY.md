# PRODUCTION BACKUP & RECOVERY POLICY & RUNBOOK
**Platform:** রক্ত দান পরিবার কালামপুর (Rokto Dan Poribar Kalampur)  
**Target Backend:** Supabase PostgreSQL Database (`yxwqgpcjzcxpdmpltzqo.supabase.co`)  
**Scope:** Production Data Backup, Snapshot Export, and Point-In-Time Restoration  

---

## 1. Executive Summary

This runbook outlines the authoritative backup and disaster recovery architecture for the **রক্ত দান পরিবার কালামপুর (Rokto Dan Poribar Kalampur)** platform. The backup strategy employs dual-layer redundancy:
1. **Automated Database Backups (Supabase Managed):** Daily PostgreSQL WAL archives and snapshots.
2. **On-Demand Platform Snapshots (Application Layer):** Full JSON state exports generated via the Admin Control Center (`backupService.ts`) with CRC32 integrity checksums.

---

## 2. Backup Inventory & Scope

| Asset Category | Backup Mechanism | Frequency | Storage Location | Retention |
| :--- | :--- | :--- | :--- | :--- |
| **Core Relational DB** | Supabase Physical Backups | Daily / Continuous WAL | Supabase Infrastructure | 7–30 Days (Tier Dependent) |
| **Schema & RLS Policies** | Git Version Controlled SQL | On every release | `supabase/schema.sql`, `supabase/production_rls_policies.sql` | Permanent (Git History) |
| **Application Data State**| Admin Control Center JSON Export | Weekly / Pre-Migration | Encrypted local administrator archive | 90 Days |
| **Storage Assets (Avatars/Docs)** | Supabase Storage Backing Store | Continuous | Supabase S3-Compatible Buckets | Synchronized with DB |

---

## 3. Recovery Objectives

- **Recovery Point Objective (RPO):** < 24 hours (Automated Snapshots) / < 1 hour (Admin-Triggered Pre-Migration Snapshots).
- **Recovery Time Objective (RTO):** < 30 minutes for schema & configuration restorations; < 2 hours for full database reconstitution.

---

## 4. Restoration Procedures

### 4.1 Restoring via Supabase Managed Backups (Disaster Recovery)
1. Open the [Supabase Management Dashboard](https://supabase.com/dashboard/project/yxwqgpcjzcxpdmpltzqo).
2. Navigate to **Project Settings > Database > Backups**.
3. Select the desired restore point snapshot.
4. Confirm project restoration to restore database tables, triggers, and sequences.

### 4.2 Restoring from Application JSON Snapshots (Selective Recovery)
1. Log into the platform with an authenticated `super_admin` session.
2. Navigate to **Admin Control Center > System Backup / Data Portability**.
3. Upload the validated `.json` snapshot archive.
4. The system validates the payload checksum (`crc32-*`), version schema (`2.0.0`), and integrity.
5. Select **Selective Restore** or **Complete Re-sync** as required.

### 4.3 Clean Schema Reconstitution (Fresh Environment)
In the event of complete project recreation:
1. Initialize a clean Supabase project.
2. Execute [supabase/schema.sql](file:///d:/Web%20App/রক্তবন্ধন-(roktobondon)---blood-donation-platform55/রক্তবন্ধন-(roktobondon)---blood-donation-platform/supabase/schema.sql) in the SQL Editor.
3. Execute [supabase/fix_rls_permissions.sql](file:///d:/Web%20App/রক্তবন্ধন-(roktobondon)---blood-donation-platform55/রক্তবন্ধন-(roktobondon)---blood-donation-platform/supabase/fix_rls_permissions.sql) to apply triggers, helper functions (`is_staff`, `is_admin`, `is_super_admin`), and immutable audit locks.
4. Execute `npm run seed:real` to populate foundational locations, hospital directories, and system configurations.

---

## 5. Security & Verification

- Backups must **never** contain raw payment credentials or server secrets.
- Automated recovery validation is verified via `npm run test:dr`.
