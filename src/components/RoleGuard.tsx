"use client";

import { type ReactNode } from "react";
import type { UserRole, Permission } from "@/types";

// Mirrors the server-side RBAC matrix so the client can gate UI elements
// without an extra network round-trip.
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
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
  VIEWER: ["analytics:read", "tenants:read", "metrics:read"],
};

function clientHasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

// ─── RoleGuard ──────────────────────────────────────────────────────────────

interface RoleGuardProps {
  /** The current user's role */
  role: UserRole;
  /** Permission(s) required to render children */
  requiredPermissions: Permission | Permission[];
  /** When true, ALL permissions must be present (default). When false, ANY. */
  requireAll?: boolean;
  /** Rendered when the user lacks permission (defaults to nothing) */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Client-side RBAC wrapper. Conditionally renders children based on the
 * current user's role and the required permission(s).
 *
 * Usage:
 *   <RoleGuard role={user.role} requiredPermissions="analytics:write">
 *     <DeleteButton />
 *   </RoleGuard>
 */
export default function RoleGuard({
  role,
  requiredPermissions,
  requireAll = true,
  fallback = null,
  children,
}: RoleGuardProps) {
  const permissions = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];

  const isAuthorised = requireAll
    ? permissions.every((p) => clientHasPermission(role, p))
    : permissions.some((p) => clientHasPermission(role, p));

  if (!isAuthorised) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// ─── Hook variant ───────────────────────────────────────────────────────────

export function useHasPermission(
  role: UserRole,
  permission: Permission
): boolean {
  return clientHasPermission(role, permission);
}
