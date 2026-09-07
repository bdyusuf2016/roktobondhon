# Donor Privacy & Data Protection Audit
**Platform:** রক্ত দান পরিবার কালামপুর (Rokto Dan Poribar Kalampur)  
**Classification:** PII (Personally Identifiable Information) & Health Data Protection

---

## 1. Data Classification

| Classification Tier | Attributes | Access Level | Protection Mechanism |
|:---|:---|:---|:---|
| **Public-Safe** | Full Name, Photo, Blood Group, District, Upazila, Area, Availability, Total Donations, Badges | Public | Available via public directory query |
| **Privacy-Controlled** | Phone Number, Gender, Age | Semi-Public / Opt-In | Governed by `donor.privacy.showPhone`, `showGender`, `showAge` |
| **Private & Sensitive** | Email, Exact Street Address, Emergency Contact, Date of Birth | Private (Owner & Staff) | Excluded from public queries |
| **Highly Confidential** | National ID (NID), Verification Documents, Clinical Notes | Restricted (Admin / Moderator) | Private storage bucket & explicit column exclusion |

---

## 2. Server-Side Protection & Query Sanitization

1. **`searchDonorsPublic()` Query**:
   Explicitly queries only public-safe columns (`PUBLIC_DONOR_COLUMNS`), completely omitting `nid_or_id_number`, `exact_address`, `emergency_contact`, and `admin_notes` from database response payloads.

2. **Privacy Masking**:
   ```typescript
   phone: donor.privacy.showPhone ? donor.phone : ''
   ```
   If a donor has disabled public phone visibility, their phone number is masked before display.
