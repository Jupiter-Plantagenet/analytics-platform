import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getPermissionsForRole,
  assertTenantAccess,
  validateTenantParam,
} from "@/lib/rbac";
import { AuthorizationError } from "@/lib/auth";
import type { JWTPayload, Permission, UserRole } from "@/types";

// ─── Fixtures ───────────────────────────────────────────────────────────────

process.env.JWT_SECRET = "test-secret-key-256-bits-long-enough";

const adminUser: JWTPayload = {
  userId: "u-admin",
  email: "admin@acme-corp.com",
  name: "Admin User",
  role: "ADMIN",
  tenantId: "tenant-001",
  tenantSlug: "acme-corp",
};

const managerUser: JWTPayload = {
  userId: "u-manager",
  email: "manager@acme-corp.com",
  name: "Manager User",
  role: "MANAGER",
  tenantId: "tenant-001",
  tenantSlug: "acme-corp",
};

const viewerUser: JWTPayload = {
  userId: "u-viewer",
  email: "viewer@acme-corp.com",
  name: "Viewer User",
  role: "VIEWER",
  tenantId: "tenant-001",
  tenantSlug: "acme-corp",
};

// ─── hasPermission ──────────────────────────────────────────────────────────

describe("hasPermission", () => {
  test("ADMIN has all permissions", () => {
    const allPermissions: Permission[] = [
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
    ];

    for (const perm of allPermissions) {
      expect(hasPermission("ADMIN", perm)).toBe(true);
    }
  });

  test("MANAGER has read/write but not delete", () => {
    expect(hasPermission("MANAGER", "analytics:read")).toBe(true);
    expect(hasPermission("MANAGER", "analytics:write")).toBe(true);
    expect(hasPermission("MANAGER", "analytics:delete")).toBe(false);
    expect(hasPermission("MANAGER", "users:read")).toBe(true);
    expect(hasPermission("MANAGER", "users:write")).toBe(true);
    expect(hasPermission("MANAGER", "users:delete")).toBe(false);
    expect(hasPermission("MANAGER", "metrics:export")).toBe(true);
  });

  test("VIEWER has only read permissions", () => {
    expect(hasPermission("VIEWER", "analytics:read")).toBe(true);
    expect(hasPermission("VIEWER", "tenants:read")).toBe(true);
    expect(hasPermission("VIEWER", "metrics:read")).toBe(true);
    expect(hasPermission("VIEWER", "analytics:write")).toBe(false);
    expect(hasPermission("VIEWER", "users:read")).toBe(false);
    expect(hasPermission("VIEWER", "tenants:write")).toBe(false);
    expect(hasPermission("VIEWER", "metrics:export")).toBe(false);
  });

  test("unknown role has no permissions", () => {
    expect(hasPermission("UNKNOWN" as UserRole, "analytics:read")).toBe(false);
  });
});

// ─── hasAllPermissions ──────────────────────────────────────────────────────

describe("hasAllPermissions", () => {
  test("returns true when role has all requested permissions", () => {
    expect(
      hasAllPermissions("ADMIN", ["analytics:read", "analytics:write", "analytics:delete"])
    ).toBe(true);
  });

  test("returns false when role lacks any requested permission", () => {
    expect(
      hasAllPermissions("VIEWER", ["analytics:read", "analytics:write"])
    ).toBe(false);
  });

  test("returns true for empty permission list", () => {
    expect(hasAllPermissions("VIEWER", [])).toBe(true);
  });
});

// ─── hasAnyPermission ───────────────────────────────────────────────────────

describe("hasAnyPermission", () => {
  test("returns true when role has at least one permission", () => {
    expect(
      hasAnyPermission("VIEWER", ["analytics:write", "analytics:read"])
    ).toBe(true);
  });

  test("returns false when role has none of the permissions", () => {
    expect(
      hasAnyPermission("VIEWER", ["analytics:write", "users:delete"])
    ).toBe(false);
  });

  test("returns false for empty permission list", () => {
    expect(hasAnyPermission("ADMIN", [])).toBe(false);
  });
});

// ─── getPermissionsForRole ──────────────────────────────────────────────────

describe("getPermissionsForRole", () => {
  test("returns correct permission count per role", () => {
    expect(getPermissionsForRole("ADMIN").length).toBe(12);
    expect(getPermissionsForRole("MANAGER").length).toBe(8);
    expect(getPermissionsForRole("VIEWER").length).toBe(3);
  });

  test("MANAGER permissions are a subset of ADMIN permissions", () => {
    const adminPerms = new Set(getPermissionsForRole("ADMIN"));
    const managerPerms = getPermissionsForRole("MANAGER");
    for (const perm of managerPerms) {
      expect(adminPerms.has(perm)).toBe(true);
    }
  });

  test("VIEWER permissions are a subset of MANAGER permissions", () => {
    const managerPerms = new Set(getPermissionsForRole("MANAGER"));
    const viewerPerms = getPermissionsForRole("VIEWER");
    for (const perm of viewerPerms) {
      expect(managerPerms.has(perm)).toBe(true);
    }
  });
});

// ─── Tenant Isolation ───────────────────────────────────────────────────────

describe("assertTenantAccess", () => {
  test("does not throw when tenantId matches", () => {
    expect(() =>
      assertTenantAccess(adminUser, "tenant-001")
    ).not.toThrow();
  });

  test("throws AuthorizationError for mismatched tenant", () => {
    expect(() =>
      assertTenantAccess(adminUser, "tenant-999")
    ).toThrow(AuthorizationError);
  });

  test("error message mentions tenant access", () => {
    expect(() =>
      assertTenantAccess(adminUser, "other-tenant")
    ).toThrow("Access denied: you do not belong to this tenant");
  });
});

// ─── validateTenantParam ────────────────────────────────────────────────────

describe("validateTenantParam", () => {
  test("returns user tenantId when param is null", () => {
    const result = validateTenantParam(adminUser, null);
    expect(result).toBe("tenant-001");
  });

  test("returns user tenantId when param is undefined", () => {
    const result = validateTenantParam(adminUser, undefined);
    expect(result).toBe("tenant-001");
  });

  test("returns tenantId when param matches user tenant", () => {
    const result = validateTenantParam(adminUser, "tenant-001");
    expect(result).toBe("tenant-001");
  });

  test("throws when param does not match user tenant", () => {
    expect(() =>
      validateTenantParam(viewerUser, "tenant-other")
    ).toThrow(AuthorizationError);
  });
});

// ─── Role Hierarchy ─────────────────────────────────────────────────────────

describe("Role hierarchy is enforced", () => {
  const writePermissions: Permission[] = [
    "analytics:write",
    "users:write",
    "tenants:write",
    "metrics:write",
  ];

  const deletePermissions: Permission[] = [
    "analytics:delete",
    "users:delete",
    "tenants:delete",
  ];

  test("VIEWER cannot write anything", () => {
    for (const perm of writePermissions) {
      expect(hasPermission("VIEWER", perm)).toBe(false);
    }
  });

  test("MANAGER cannot delete anything", () => {
    for (const perm of deletePermissions) {
      expect(hasPermission("MANAGER", perm)).toBe(false);
    }
  });

  test("ADMIN can delete everything", () => {
    for (const perm of deletePermissions) {
      expect(hasPermission("ADMIN", perm)).toBe(true);
    }
  });
});
