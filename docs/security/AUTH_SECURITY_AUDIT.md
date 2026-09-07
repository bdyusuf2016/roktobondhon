# Authentication & Session Management Security Audit
**Platform:** রক্ত দান পরিবার কালামপুর (Rokto Dan Poribar Kalampur)  
**Provider:** Supabase Auth (GoTrue) + PostgreSQL Database Sync

---

## 1. Authentication Lifecycle & Session Handling

- **Identity Provider:** Supabase Auth handles password hashing (bcrypt), token issuance, and JWT validation.
- **Session Tokens:** Public client JWT contains user UID and expiry. The client uses standard `@supabase/supabase-js` memory / local storage tokens with auto-refresh.
- **User Account Lifecycle:**
  1. `signUp(email, password, metadata)` creates user in `auth.users`.
  2. Database trigger `public.handle_new_user()` creates associated record in `public.users` with default role `'donor'` and status `'active'`.
  3. Role escalation to `'admin'` or `'moderator'` cannot be performed by the registrant; it requires an existing administrator.
- **Password Reset:** Implemented via `resetPasswordForEmail()` in `authService.ts` generating cryptographic reset tokens.
- **Logout Cleanup:** `signOut()` invalidates local session tokens and resets client application state.
