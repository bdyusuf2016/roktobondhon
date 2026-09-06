# RoktoBondhon — Production Deployment Checklist

Use this checklist prior to launching the platform live on GitHub Pages or custom domain with Supabase.

---

## 1. Supabase Project Configuration
- [ ] Create or select Supabase Project in [Supabase Dashboard](https://supabase.com/).
- [ ] **SQL Schema**:
  - [ ] Open **SQL Editor** in Supabase.
  - [ ] Run `supabase/schema.sql` to initialize all PostgreSQL tables, indexes, and RLS policies.
- [ ] **Storage Buckets**:
  - [ ] Verify `avatars`, `verification-docs`, and `assets` buckets exist in Storage.

---

## 2. Environment Variables & Demo Mode
- [ ] Set `VITE_DEMO_MODE=false` in your production environment (or `.env`).
- [ ] Provide `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` or GitHub Actions Repository Secrets.
- [ ] Ensure `.env` is listed in `.gitignore` and never committed to source control.

---

## 3. Cloud Database Seeding
- [ ] Run the cloud database seed script:
  ```bash
  npm run seed
  ```
- [ ] Verify in Supabase Table Editor that tables are populated:
  - `donors`
  - `blood_requests`
  - `hospitals`
  - `blood_camps`
  - `payment_methods`
  - `users`

---

## 4. Build & CI/CD Validation
- [ ] Run type check: `npm run lint` (must pass with 0 errors).
- [ ] Run production build: `npm run build` (must pass with 0 errors).
- [ ] Push to `main` branch and verify that GitHub Actions (`.github/workflows/deploy.yml`) builds and deploys successfully.
