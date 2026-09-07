# Production Data Hygiene & Cleanup Report
**Platform:** রক্ত দান পরিবার কালামপুর (Rokto Dan Poribar Kalampur)  
**Verification Scope:** Database Seed Purging, Real Directory Verification, and Demo Purge

---

## 1. Production Data Status

| Entity Category | Record Source | Production Treatment | Rationale |
|:---|:---|:---|:---|
| **Donors** | Live User Registrations | Clean / Real Only | Seed generators purged from production runtime; real registrations only |
| **Blood Requests** | Live Emergency Submissions | Clean / Real Only | No fake placeholder requests displayed |
| **Blood Camps** | Official Campaigns | Real Only | Scheduled real-world community events |
| **Hospitals & Facilities** | Curated Healthcare Directory | Retained | Real-world hospitals in Dhamrai, Savar, Manikganj, and Dhaka |
| **Branches & Coordinators**| Official Organization Chapters | Retained | Legitimate regional chapters (Dhamrai, Savar, Manikganj) |
| **Audit Logs** | System Operations | Retained | Immutable operational audit logs |

---

## 2. Idempotent Cleanup Scripts

The database cleanup script is located at:
`supabase/scripts/cleanup-demo-data.sql`

It safely purges any legacy demo records prefixed with `demo_` or test UUIDs without affecting authentic donor profiles or hospital directories.
