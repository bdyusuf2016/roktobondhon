# Supabase Storage Security & Private Bucket Governance
**Platform:** রক্ত দান পরিবার কালামপুর (Rokto Dan Poribar Kalampur)  
**Storage Architecture:** Supabase Storage with Row-Level Security (RLS) on `storage.objects`

---

## 1. Storage Bucket Matrix

| Bucket ID | Public Access | Purpose | Upload Policy | View / Download Policy | Delete Policy |
|:---|:---:|:---|:---|:---|:---|
| **`avatars`** | ✅ Public | Donor & User Profile Photos | Authenticated User | Public (`bucket_id = 'avatars'`) | Owner / Admin |
| **`assets`** | ✅ Public | Organization Logos & Banners | Staff Only (`is_staff()`) | Public (`bucket_id = 'assets'`) | Admin Only |
| **`verification-docs`** | 🚫 **PRIVATE** | NID, Medical & Identity Documents | Owner Donor / Staff | **Owner Donor / Staff ONLY** via Signed URLs | Admin Only |

---

## 2. Storage Policies Definition

```sql
-- Private Verification Documents
CREATE POLICY "Donors and staff can upload verification docs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'verification-docs' AND (
      (storage.foldername(name))[1] IN (
        SELECT donor_id FROM public.donors WHERE user_id = auth.uid()::text
        UNION
        SELECT id FROM public.donors WHERE user_id = auth.uid()::text
      )
      OR public.is_staff()
    )
  );

CREATE POLICY "Donors and staff can view verification docs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'verification-docs' AND (
      (storage.foldername(name))[1] IN (
        SELECT donor_id FROM public.donors WHERE user_id = auth.uid()::text
        UNION
        SELECT id FROM public.donors WHERE user_id = auth.uid()::text
      )
      OR public.is_staff()
    )
  );

CREATE POLICY "Admins can delete verification docs" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'verification-docs' AND public.is_admin()
  );
```

---

## 3. Signed URL Expiry
Private verification documents are never served over static public links. They require short-lived, cryptographically signed URLs generated via `getSignedUrlForDoc(storagePath, expiresInSeconds = 3600)`.
