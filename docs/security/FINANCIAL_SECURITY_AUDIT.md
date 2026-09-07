# Financial Donation & Disbursement Governance Security Audit
**Platform:** রক্ত দান পরিবার কালামপুর (Rokto Dan Poribar Kalampur)  
**Tables:** `public.fund_donations`, `public.fund_disbursements`, `public.payment_methods`

---

## 1. Financial Ledger Integrity

1. **Tamper-Resistant Verification**:
   Users can submit donation proofs (amount, method, transaction ID). However, the record is created with `status = 'pending'`. The `protect_fund_donation_verification()` database trigger strictly prohibits non-admins from changing the status to `'verified'` or forging `verified_by`.

2. **Authoritative Calculation**:
   Platform financial reserves are calculated dynamically from verified records:
   $$\text{Net Reserve} = \sum \text{Verified Fund Donations} - \sum \text{Fund Disbursements}$$
   Client-provided ledger totals are never trusted.

3. **Payment Methods Governance**:
   Only administrators can add, update, or remove accepted payment numbers (bKash/Nagad/Rocket).
