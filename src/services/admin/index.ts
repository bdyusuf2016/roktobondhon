/**
 * Admin Service Module
 * Exports centralized administrative utilities and constants.
 */

export const ADMIN_MODULES = [
  'overview',
  'donors',
  'requests',
  'donations',
  'camps',
  'hospitals',
  'funds',
  'users',
  'branches',
  'backup',
  'audit',
  'settings',
] as const;

export type AdminModuleType = typeof ADMIN_MODULES[number];
