# রক্তবন্ধন (RoktoBondhon) — Voluntary Blood Donation Platform

> ধামরাই, সাভার, মানিকগঞ্জ সহ বাংলাদেশের জরুরি রক্তের প্রয়োজনে রক্তদাতা অনুসন্ধান, রক্তের আবেদন ও স্বেচ্ছাসেবী সংগঠন ব্যবস্থাপনা প্ল্যাটফর্ম।

---

## 🌟 Overview & Architecture

**রক্তবন্ধন (RoktoBondhon)** is a full-featured voluntary blood donor platform built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS**, and **Firebase** (Authentication, Cloud Firestore, Cloud Storage).

### Core Architectural Features:
- **Zero Local Storage as Primary Database:** Cloud Firestore is the real-time single source of truth for all production operations.
- **Strict Donor Privacy Partitioning:**
  - `donorPublic/{donorId}`: Searchable by blood group, district, upazila, and availability. Does not expose phone numbers, NID, or private details.
  - `donorPrivate/{donorId}`: Protected under strict Firestore security rules; accessible only by the verified donor or authorized volunteers/admins.
- **Production Authentication:**
  - Firebase Phone OTP with automated invisible reCAPTCHA verifier.
  - Google Sign-In & Email/Password Authentication.
  - Role-based Access Control (RBAC): `super_admin`, `admin`, `moderator`, `volunteer`, `donor`, `recipient`.
- **Automated Human-Readable IDs:**
  - Blood Requests: `BD-2026-XXXXXX`
  - Donors: `DNR-[UPAZILA]-[NUMBER]` (e.g., `DNR-DHM-000101`)
- **Emergency Matching Algorithm:**
  - ABO / Rh compatibility weighting
  - Geographical proximity scoring (Dhaka, Dhamrai, Savar, Manikganj, etc.)
  - 24/7 emergency readiness badge
- **Financial Transparency:**
  - Transparent tracking for voluntary contributions (bKash, Nagad, Rocket, Bank) and approved disbursements.
- **GitHub Pages SPA Ready:**
  - Custom SPA 404 redirect handler and dynamic `basename` support.

---

## ⚙️ Environment Configuration

Create a `.env` file in the project root based on `.env.example`:

```env
# Demo / Local Sandbox Toggle
# In production, set to false to enforce real Firebase OTP and live Firestore
VITE_DEMO_MODE=false

# Base path for GitHub Pages or custom domain
VITE_BASE_PATH=/

# Firebase Web Client Configuration (Firebase Console > Project Settings)
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project-id.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-messaging-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"
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

## 🗄️ Firestore Database & Security Rules

### 1. Deploy Security Rules & Composite Indexes
Install the Firebase CLI if you haven't already:
```bash
npm install -g firebase-tools
firebase login
firebase use your-project-id
```

Deploy the rules and indexes:
```bash
firebase deploy --only firestore:rules,storage,firestore:indexes
```

### 2. Seed Initial Cloud Database
To seed the Firestore database with initial location data, hospitals, branches, payment methods, and partitioned demo donors:
```bash
npm run seed
```

---

## 🔒 Security & Privacy Model

| Collection | Read Permission | Write Permission |
| :--- | :--- | :--- |
| `donorPublic` | Public (`true`) | Authenticated Owner / Volunteer |
| `donorPrivate` | Owner / Volunteers / Admins | Owner / Volunteers / Admins |
| `bloodRequests` | Public (`true`) | Requester / Volunteers / Admins |
| `donorRequests` | Requester & Target Donor | Requester & Target Donor |
| `donations` | Donor & Staff | Volunteers / Admins |
| `auditLogs` | Admins only | System / Authenticated (Append-only) |
| `verificationLogs` | Volunteers / Admins | Volunteers / Admins (Append-only) |

---

## 🚢 GitHub Actions Deployment

The repository includes `.github/workflows/deploy.yml` which automatically builds and deploys to GitHub Pages upon pushing to `main`.

Ensure you configure the following GitHub Repository Secrets:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_DEMO_MODE` (`false` for production)
