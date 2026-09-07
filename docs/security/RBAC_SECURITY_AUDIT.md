# Role-Based Access Control (RBAC) & Privilege Escalation Audit
**Platform:** রক্ত দান পরিবার কালামপুর (Rokto Dan Poribar Kalampur)  
**Security Boundary:** Multi-Layered (PostgreSQL Triggers + Server-Side RLS + TypeScript Authority)

---

## 1. Role Hierarchy Definition

The platform defines a strict 5-tier role hierarchy:
1. `super_admin` — Root system owner; full administrative and security authority.
2. `admin` — Organization administrator; manages staff, locations, finances, settings.
3. `moderator` — Regional coordinator; verifies donors, manages requests and blood camps.
4. `volunteer` — Field agent; records donations, monitors blood requests.
5. `donor` / `recipient` — End-users; public search, blood requests, profile management.

---

## 2. Privilege Escalation Prevention Architecture

### Server-Side Trigger Enforcement:
```sql
CREATE OR REPLACE FUNCTION public.protect_user_roles()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role) OR (NEW.status IS DISTINCT FROM OLD.status) OR (NEW.organization_id IS DISTINCT FROM OLD.organization_id) THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Unauthorized: Only administrators can modify user role, status, or organization.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
```

### Authority Matrix:
- **`validateRoleAssignment(currentRole, targetRole, newRole)`**:
  - `donor` attempting to change role -> ❌ **BLOCKED**
  - `volunteer` attempting to change role -> ❌ **BLOCKED**
  - `moderator` attempting to promote to `admin` / `super_admin` -> ❌ **BLOCKED**
  - `admin` attempting to promote to `super_admin` -> ❌ **BLOCKED** (SuperAdmin only)
