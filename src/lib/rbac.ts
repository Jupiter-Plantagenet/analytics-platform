import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, AuthorizationError } from "./auth";
import type { UserRole, Permission, RolePermissions, JWTPayload } from "@/types";

// ─── Role-Permission Matrix ─────────────────────────────────────────────────

const ROLE_PERMISSIONS: RolePermissions = {
  ADMIN: [
    "analytics:read",
    "analytics:write",
    "analytics:delete",
    "users:read",
    "users:write",
    "users:delete",
    "tenants:read",
    "tenants:write",
    "tenants:delete",
    "metrics:read",
    "metrics:write",
    "metrics:export",
  ],
  MANAGER: [
    "analytics:read",
    "analytics:write",
    "users:read",
    "users:write",
    "tenants:read",
    "metrics:read",
    "metrics:write",
    "metrics:export",
  ],
  VIEWER: [
    "analytics:read",
    "tenants:read",
    "metrics:read",
  ],
};

// ─── Permission Checks ──────────────────────────────────────────────────────

/**
 * Check whether a role has a specific permission.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Check whether a role has ALL of the given permissions.
 */
export function hasAllPermissions(
  role: UserRole,
  permissions: Permission[]
): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Check whether a role has ANY of the given permissions.
 */
export function hasAnyPermission(
  role: UserRole,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Return all permissions granted to a role.
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return (ROLE_PERMISSIONS[role] || []) as Permission[];
}

// ─── Tenant Isolation ───────────────────────────────────────────────────────

/**
 * Verify that the authenticated user belongs to the requested tenant.
 * This is the core of multi-tenant data isolation.
 */
export function assertTenantAccess(
  user: JWTPayload,
  requestedTenantId: string
): void {
  if (user.tenantId !== requestedTenantId) {
    throw new AuthorizationError(
      "Access denied: you do not belong to this tenant"
    );
  }
}

// ─── Route Handler Middleware ────────────────────────────────────────────────

interface AuthContext {
  user: JWTPayload;
}

type AuthenticatedHandler = (
  request: NextRequest,
  context: AuthContext
) => Promise<NextResponse> | NextResponse;

/**
 * Higher-order function that wraps an API route handler with authentication
 * and permission checks. Returns 401/403 responses automatically when
 * the caller lacks credentials or permissions.
 *
 * Usage:
 *   export const GET = withAuth(
 *     async (request, { user }) => {
 *       return NextResponse.json({ data: "secret stuff" });
 *     },
 *     { permissions: ["analytics:read"] }
 *   );
 */
export function withAuth(
  handler: AuthenticatedHandler,
  options: {
    permissions?: Permission[];
    requireAll?: boolean; // default true
  } = {}
) {
  const { permissions = [], requireAll = true } = options;

  return async (request: NextRequest): Promise<NextResponse> => {
    // 1. Authenticate
    const user = authenticateRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // 2. Authorise
    if (permissions.length > 0) {
      const authorised = requireAll
        ? hasAllPermissions(user.role, permissions)
        : hasAnyPermission(user.role, permissions);

      if (!authorised) {
        return NextResponse.json(
          {
            success: false,
            error: "Insufficient permissions",
            required: permissions,
            role: user.role,
          },
          { status: 403 }
        );
      }
    }

    // 3. Delegate to the actual handler
    try {
      return await handler(request, { user });
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: error.statusCode }
        );
      }
      throw error; // let Next.js handle unexpected errors
    }
  };
}

/**
 * Validate that the requested tenantId in a query/body matches the
 * authenticated user's tenant. Returns the tenantId when valid.
 */
export function validateTenantParam(
  user: JWTPayload,
  tenantId: string | null | undefined
): string {
  const effectiveTenantId = tenantId || user.tenantId;
  assertTenantAccess(user, effectiveTenantId);
  return effectiveTenantId;
}
