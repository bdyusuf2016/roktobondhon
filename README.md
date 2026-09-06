# রক্তবন্ধন (RoktoBondhon) — Voluntary Blood Donation Platform

> ধামরাই, সাভার, মানিকগঞ্জ সহ বাংলাদেশের জরুরি রক্তের প্রয়োজনে রক্তদাতা অনুসন্ধান, রক্তের আবেদন ও স্বেচ্ছাসেবী সংগঠন ব্যবস্থাপনা প্ল্যাটফর্ম।

---

## 🌟 Overview & Architecture

**রক্তবন্ধন (RoktoBondhon)** is a full-featured voluntary blood donor platform built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS**, and **Supabase PostgreSQL** (Database, Row-Level Security, Storage).

### Core Architectural Features:
- **Cloud PostgreSQL (Supabase) as Single Source of Truth:** High-performance real-time relational database.
- **Strict Donor Privacy Partitioning:**
  - Public directory contains blood group, district, upazila, and availability for search without exposing private phone numbers or NID unless direct contact is authorized.
- **Role-based Access Control (RBAC):**
  - `super_admin`, `admin`, `moderator`, `volunteer`, `donor`, `recipient`.
- **Automated Human-Readable IDs:**
  - Blood Requests: `BD-2026-XXXXXX`
  - Donors: `DNR-[UPAZILA]-[NUMBER]` (e.g., `DNR-DHM-000101`)
- **Emergency Matching Algorithm:**
  - ABO / Rh compatibility weighting
  - Geographical proximity scoring (Dhaka, Dhamrai, Savar, Manikganj, etc.)
  - 24/7 emergency readiness badge
- **Digital Certificates & Badges:**
  - Printable verified certificate with badges, seal, and pocket ID cards.
- **Blood Camps & Drives:**
  - Community event notices and pre-registration for donors.
- **AI Health Eligibility Screener:**
  - Interactive health criteria checking powered by Google Gemini AI.
- **Financial Transparency:**
  - Transparent tracking for voluntary contributions (bKash, Nagad, Rocket, Bank) and approved disbursements.

---

## ⚙️ Environment Configuration

Create a `.env` file in the project root based on `.env.example`:

```env
# Demo / Local Sandbox Toggle
# Set to "false" in production to enforce live Supabase PostgreSQL
VITE_DEMO_MODE="false"

# Base path for GitHub Pages or custom domain
VITE_BASE_PATH="/roktobondhon/"

# Supabase Web Client Configuration (Supabase Dashboard > Project Settings > API)
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key-here"

# Gemini AI API Key (Optional)
GEMINI_API_KEY="your-gemini-api-key"
```

---

## 🚀 Getting Started

### 1. Installation
```bash
npm install
```

### 2. Run Local Development
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.

### 3. Type Checking & Production Build
```bash
# Check TypeScript types
npm run lint

# Build production bundle
npm run build
```

---

## 🗄️ Supabase Database Setup & Seeding

1. **Deploy Schema:** Copy the contents of `supabase/schema.sql` and run it in the **SQL Editor** of your Supabase Dashboard.
2. **Seed Initial Data:**
   ```bash
   npm run seed
   ```
   This will populate your Supabase database with demo donors, hospitals, blood camps, and system users.

---

## 🚢 GitHub Actions Deployment

The repository includes `.github/workflows/deploy.yml` which automatically builds and deploys to GitHub Pages upon pushing to `main`.
