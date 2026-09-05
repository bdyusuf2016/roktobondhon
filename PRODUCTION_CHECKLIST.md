# RoktoBondhon — Production Deployment Checklist

Use this checklist prior to launching the platform live on GitHub Pages or custom domain with Firebase.

---

## 1. Firebase Project Configuration
- [ ] Create or select Firebase Project in [Firebase Console](https://console.firebase.google.com/).
- [ ] **Authentication Providers**:
  - [ ] Enable **Phone Authentication** (under *Authentication* > *Sign-in method*).
  - [ ] Enable **Google Sign-In** (under *Authentication* > *Sign-in method*).
  - [ ] Enable **Email/Password** (under *Authentication* > *Sign-in method*).
  - [ ] Add your production domains (e.g. `your-username.github.io` or custom domain) to **Authorized Domains**.
- [ ] **Cloud Firestore**:
  - [ ] Initialize Firestore in **Production Mode**.
  - [ ] Deploy security rules: `firebase deploy --only firestore:rules`.
  - [ ] Deploy composite indexes: `firebase deploy --only firestore:indexes`.
- [ ] **Cloud Storage**:
  - [ ] Initialize Storage bucket.
  - [ ] Deploy storage rules: `firebase deploy --only storage`.

---

## 2. Environment Variables & Demo Mode
- [ ] Set `VITE_DEMO_MODE=false` in your production environment.
- [ ] Provide all `VITE_FIREBASE_*` environment keys in `.env` (or GitHub Actions Repository Secrets).
- [ ] Ensure `.env` is listed in `.gitignore` and never committed to source control.

---

## 3. Cloud Database Seeding
- [ ] Run the cloud database seed script:
  ```bash
  npm run seed
  ```
- [ ] Verify in Firestore console that collections are created:
  - `donorPublic` & `donorPrivate`
  - `bloodRequests`
  - `hospitals`
  - `branches` & `locations`
  - `paymentMethods` & `donationCauses`
  - `users`

---

## 4. Super Admin Promotion
- [ ] Log in with your production phone or Google account.
- [ ] In the Firebase Console under `users/{your-uid}`, set `role: "super_admin"`.
- [ ] Create a document in `admins/{your-uid}` to grant super administrator privileges.

---

## 5. Build & CI/CD Validation
- [ ] Run type check: `npm run lint` (must pass with 0 errors).
- [ ] Run production build: `npm run build` (must pass with 0 errors).
- [ ] Push to `main` branch and verify that GitHub Actions (`.github/workflows/deploy.yml`) builds and deploys successfully.
