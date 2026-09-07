import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { hasPermission, canManageRole, validateRoleAssignment } from '../services/permissionService';
import type { PermissionKey, UserRole, User } from '../types';

export function usePermission() {
  const { currentUser } = useAuth();
  const { permissionMatrix } = useData();

  const currentRole = currentUser?.role;

  const can = useMemo(() => {
    return (permission: PermissionKey): boolean => {
      return hasPermission(currentRole, permission, permissionMatrix);
    };
  }, [currentRole, permissionMatrix]);

  const canManage = useMemo(() => {
    return (targetUser: User | UserRole): boolean => {
      const targetRole = typeof targetUser === 'string' ? targetUser : targetUser.role;
      return canManageRole(currentRole, targetRole);
    };
  }, [currentRole]);

  return {
    currentUser,
    currentRole,
    can,
    canManage,
    validateRoleAssignment: (currentRoleTarget: UserRole, newRoleTarget: UserRole) =>
      validateRoleAssignment(currentRole, currentRoleTarget, newRoleTarget),
    isSuperAdmin: currentRole === 'super_admin',
    isAdmin: currentRole === 'admin' || currentRole === 'super_admin',
    isModerator: currentRole === 'moderator' || currentRole === 'admin' || currentRole === 'super_admin',
    isVolunteer: currentRole === 'volunteer' || currentRole === 'moderator' || currentRole === 'admin' || currentRole === 'super_admin',
  };
}
