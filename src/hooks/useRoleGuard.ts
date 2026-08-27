import { useMemo, useCallback } from 'react';
import { UserRole } from '../types/pharmacy';

export type AppTabType = 
  | 'clerk'
  | 'pharmacist'
  | 'cashier'
  | 'owner'
  | 'pos'
  | 'inventory'
  | 'nhis'
  | 'ddr'
  | 'audit';

export type NormalizedRole = 'CLERK' | 'PHARMACIST' | 'CASHIER' | 'OWNER';

export type ActionPermission =
  | 'STAGE_ORDER'
  | 'LOOKUP_INVENTORY'
  | 'READ_SHELF_LOCATION'
  | 'APPROVE_CLINICAL'
  | 'VERIFY_DOCTOR_MDC'
  | 'LOG_DDR'
  | 'HOLD_REJECT_ORDER'
  | 'OVERRIDE_DRUG_INTERACTION'
  | 'PROCESS_PAYMENT'
  | 'EXECUTE_MOMO_STK'
  | 'SPLIT_BILLING'
  | 'GENERATE_EVAT'
  | 'PRINT_FISCAL_RECEIPT'
  | 'APPROVE_PURCHASE_ORDER'
  | 'REJECT_PURCHASE_ORDER'
  | 'EXECUTE_PAYROLL'
  | 'BULK_MOMO_DISBURSAL'
  | 'VIEW_FINANCIAL_AUDIT'
  | 'VIEW_EXECUTIVE_HUB'
  | 'ACCESS_DDR_REGISTER'
  | 'MANAGE_SYSTEM_SETTINGS'
  | 'RESET_DEMO_DATA';

/**
 * Normalizes varied case and enum representations of UserRole into canonical NormalizedRole
 */
export function normalizeUserRole(role?: UserRole | string | null): NormalizedRole {
  if (!role) return 'CLERK';
  const r = role.toUpperCase().trim();
  if (r.includes('CLERK') || r === 'COUNTER_CLERK') return 'CLERK';
  if (r.includes('PHARMACIST') || r === 'SUPERINTENDENT_PHARMACIST') return 'PHARMACIST';
  if (r.includes('CASHIER') || r === 'POS_CASHIER') return 'CASHIER';
  if (r.includes('OWNER') || r.includes('MD') || r.includes('EXECUTIVE') || r === 'ADMIN') return 'OWNER';
  return 'CLERK';
}

/**
 * Canonical Role-to-Permissions Access Control Matrix
 */
export const ROLE_PERMISSIONS_MAP: Record<NormalizedRole, readonly ActionPermission[]> = {
  CLERK: [
    'STAGE_ORDER',
    'LOOKUP_INVENTORY',
    'READ_SHELF_LOCATION'
  ],
  PHARMACIST: [
    'STAGE_ORDER',
    'LOOKUP_INVENTORY',
    'READ_SHELF_LOCATION',
    'APPROVE_CLINICAL',
    'VERIFY_DOCTOR_MDC',
    'LOG_DDR',
    'HOLD_REJECT_ORDER',
    'OVERRIDE_DRUG_INTERACTION',
    'ACCESS_DDR_REGISTER'
  ],
  CASHIER: [
    'STAGE_ORDER',
    'LOOKUP_INVENTORY',
    'READ_SHELF_LOCATION',
    'PROCESS_PAYMENT',
    'EXECUTE_MOMO_STK',
    'SPLIT_BILLING',
    'GENERATE_EVAT',
    'PRINT_FISCAL_RECEIPT'
  ],
  OWNER: [
    'STAGE_ORDER',
    'LOOKUP_INVENTORY',
    'READ_SHELF_LOCATION',
    'APPROVE_CLINICAL',
    'VERIFY_DOCTOR_MDC',
    'LOG_DDR',
    'HOLD_REJECT_ORDER',
    'OVERRIDE_DRUG_INTERACTION',
    'PROCESS_PAYMENT',
    'EXECUTE_MOMO_STK',
    'SPLIT_BILLING',
    'GENERATE_EVAT',
    'PRINT_FISCAL_RECEIPT',
    'APPROVE_PURCHASE_ORDER',
    'REJECT_PURCHASE_ORDER',
    'EXECUTE_PAYROLL',
    'BULK_MOMO_DISBURSAL',
    'VIEW_FINANCIAL_AUDIT',
    'VIEW_EXECUTIVE_HUB',
    'ACCESS_DDR_REGISTER',
    'MANAGE_SYSTEM_SETTINGS',
    'RESET_DEMO_DATA'
  ]
};

/**
 * Role-to-Tab Authorization Matrix
 */
export const ROLE_TAB_ACCESS_MAP: Record<NormalizedRole, readonly AppTabType[]> = {
  CLERK: ['clerk', 'pos', 'inventory', 'nhis'],
  PHARMACIST: ['clerk', 'pharmacist', 'pos', 'inventory', 'nhis', 'ddr'],
  CASHIER: ['clerk', 'cashier', 'pos', 'inventory', 'nhis'],
  OWNER: ['clerk', 'pharmacist', 'cashier', 'owner', 'pos', 'inventory', 'nhis', 'ddr', 'audit']
};

/**
 * Pure function: Checks if a role is permitted to perform a given action
 */
export function checkRolePermission(role: UserRole | string | undefined | null, action: ActionPermission): boolean {
  const normalized = normalizeUserRole(role);
  const permissions = ROLE_PERMISSIONS_MAP[normalized];
  return permissions.includes(action);
}

/**
 * Pure function: Checks if a role can view a specific app tab
 */
export function checkTabAccess(role: UserRole | string | undefined | null, tab: AppTabType): boolean {
  const normalized = normalizeUserRole(role);
  const allowedTabs = ROLE_TAB_ACCESS_MAP[normalized];
  return allowedTabs.includes(tab);
}

/**
 * Pure function: Human-friendly title of user role
 */
export function getRoleTitle(role: UserRole | string | undefined | null): string {
  const normalized = normalizeUserRole(role);
  switch (normalized) {
    case 'CLERK':
      return 'Counter Sales Assistant (Read-Only Inventory & Staging)';
    case 'PHARMACIST':
      return 'Superintendent Pharmacist (Clinical & Insurance Governance)';
    case 'CASHIER':
      return 'POS Cashier (Billing Split, MoMo & GRA E-VAT Fiscalization)';
    case 'OWNER':
      return 'Executive MD & Pharmacy Owner (Executive Authority & Payroll)';
  }
}

/**
 * Hook: useRoleGuard
 * 
 * Provides reactive role checks, fine-grained action permission guards,
 * and high-security state mutation protection across components.
 */
export function useRoleGuard(currentUserRole: UserRole | string = 'Clerk') {
  const normalizedRole = useMemo<NormalizedRole>(() => {
    return normalizeUserRole(currentUserRole);
  }, [currentUserRole]);

  const isClerk = normalizedRole === 'CLERK';
  const isPharmacist = normalizedRole === 'PHARMACIST';
  const isCashier = normalizedRole === 'CASHIER';
  const isOwner = normalizedRole === 'OWNER';

  /**
   * Check if current role matches any of target roles
   */
  const hasRole = useCallback((targetRoles: UserRole | UserRole[] | string | string[]): boolean => {
    const targets = Array.isArray(targetRoles) ? targetRoles : [targetRoles];
    const normalizedTargets = targets.map(normalizeUserRole);
    return normalizedTargets.includes(normalizedRole);
  }, [normalizedRole]);

  /**
   * Check if current role has permission for an action
   */
  const hasPermission = useCallback((action: ActionPermission): boolean => {
    return checkRolePermission(normalizedRole, action);
  }, [normalizedRole]);

  /**
   * Check if current role has access to an App Tab
   */
  const canAccessTab = useCallback((tab: AppTabType): boolean => {
    return checkTabAccess(normalizedRole, tab);
  }, [normalizedRole]);

  /**
   * Returns human-readable refusal reason if unauthorized
   */
  const getUnauthorizedMessage = useCallback((action: ActionPermission): string => {
    switch (action) {
      case 'APPROVE_CLINICAL':
      case 'VERIFY_DOCTOR_MDC':
      case 'LOG_DDR':
        return `Security Policy Violation: Clinical validation & Class A controlled substance clearance require Superintendent Pharmacist credentials. Current role '${normalizedRole}' is restricted.`;
      case 'PROCESS_PAYMENT':
      case 'EXECUTE_MOMO_STK':
      case 'GENERATE_EVAT':
        return `Security Policy Violation: Payment execution, MoMo STK push, and GRA E-VAT fiscal stamping are restricted to POS Cashier. Current role '${normalizedRole}' cannot execute financial tenders.`;
      case 'APPROVE_PURCHASE_ORDER':
      case 'EXECUTE_PAYROLL':
      case 'BULK_MOMO_DISBURSAL':
      case 'VIEW_EXECUTIVE_HUB':
        return `Security Policy Violation: High-value purchase orders and statutory payroll disbursals require Executive Owner authorization. Current role '${normalizedRole}' is unauthorized.`;
      case 'STAGE_ORDER':
        return `Security Policy Violation: Order staging is unavailable for role '${normalizedRole}'.`;
      default:
        return `Security Policy Violation: Action '${action}' is not permitted for user role '${normalizedRole}'.`;
    }
  }, [normalizedRole]);

  /**
   * Evaluates if action is allowed, and returns structured result
   */
  const guardAction = useCallback((action: ActionPermission, customDescription?: string): { allowed: boolean; reason?: string } => {
    const allowed = hasPermission(action);
    if (!allowed) {
      return {
        allowed: false,
        reason: customDescription || getUnauthorizedMessage(action)
      };
    }
    return { allowed: true };
  }, [hasPermission, getUnauthorizedMessage]);

  /**
   * Safe State Mutation Executor:
   * Wraps any state-modifying function, executing it ONLY if the role has permission.
   * If unauthorized, aborts execution and optionally triggers alert or callback.
   */
  const verifyAction = useCallback(<T>(
    action: ActionPermission,
    executable: () => T,
    onUnauthorized?: (reason: string) => void
  ): T | null => {
    const { allowed, reason } = guardAction(action);
    if (!allowed) {
      const message = reason || getUnauthorizedMessage(action);
      if (onUnauthorized) {
        onUnauthorized(message);
      } else {
        alert(message);
      }
      return null;
    }
    return executable();
  }, [guardAction, getUnauthorizedMessage]);

  return {
    currentUserRole,
    normalizedRole,
    isClerk,
    isPharmacist,
    isCashier,
    isOwner,
    hasRole,
    hasPermission,
    canAccessTab,
    guardAction,
    verifyAction,
    getUnauthorizedMessage,
    roleTitle: getRoleTitle(normalizedRole)
  };
}
