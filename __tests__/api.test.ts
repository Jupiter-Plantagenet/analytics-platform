/**
 * API Route Integration Tests
 *
 * These tests verify the auth and RBAC middleware that wraps API routes.
 * The Prisma client is mocked so no database is required.
 */

import { NextRequest } from "next/server";
import { generateToken } from "@/lib/auth";
import { withAuth } from "@/lib/rbac";
import type { JWTPayload } from "@/types";

// ─── Test Setup ─────────────────────────────────────────────────────────────

process.env.JWT_SECRET = "test-secret-key-256-bits-long-enough";

function makeUser(overrides: Partial<JWTPayload> = {}): JWTPayload {
  return {
    userId: "u-test",
    email: "test@acme-corp.com",
    name: "Test User",
    role: "VIEWER",
    tenantId: "tenant-001",
    tenantSlug: "acme-corp",
    ...overrides,
  };
}

function makeRequest(token?: string): NextRequest {
  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return new NextRequest("http://localhost:3000/api/test", {
    method: "GET",
    headers,
  });
}

// ─── withAuth Middleware Tests ───────────────────────────────────────────────

describe("withAuth middleware", () => {
  const successHandler = withAuth(
    async (_req, { user }) => {
      const { NextResponse } = await import("next/server");
      return NextResponse.json({ success: true, userId: user.userId });
    },
    { permissions: ["analytics:read"] }
  );

  test("returns 401 when no token provided", async () => {
    const request = makeRequest();
    const response = await successHandler(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error).toContain("Authentication required");
  });

  test("returns 401 for invalid token", async () => {
    const request = makeRequest("invalid-jwt-token");
    const response = await successHandler(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
  });

  test("returns 401 for expired token", async () => {
    const jwt = await import("jsonwebtoken");
    const expiredToken = jwt.default.sign(makeUser(), process.env.JWT_SECRET!, {
      expiresIn: "-1s",
      issuer: "analytics-platform",
      audience: "analytics-platform-api",
    });

    const request = makeRequest(expiredToken);
    const response = await successHandler(request);

    expect(response.status).toBe(401);
  });

  test("returns 200 for VIEWER with analytics:read", async () => {
    const user = makeUser({ role: "VIEWER" });
    const { accessToken } = generateToken(user);
    const request = makeRequest(accessToken);
    const response = await successHandler(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.userId).toBe(user.userId);
  });

  test("returns 200 for ADMIN with analytics:read", async () => {
    const user = makeUser({ role: "ADMIN" });
    const { accessToken } = generateToken(user);
    const request = makeRequest(accessToken);
    const response = await successHandler(request);

    expect(response.status).toBe(200);
  });

  test("returns 403 when role lacks required permission", async () => {
    const writeHandler = withAuth(
      async (_req, { user }) => {
        const { NextResponse } = await import("next/server");
        return NextResponse.json({ success: true, userId: user.userId });
      },
      { permissions: ["analytics:write"] }
    );

    const user = makeUser({ role: "VIEWER" });
    const { accessToken } = generateToken(user);
    const request = makeRequest(accessToken);
    const response = await writeHandler(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error).toContain("Insufficient permissions");
    expect(body.required).toEqual(["analytics:write"]);
  });

  test("returns 403 for MANAGER on delete operations", async () => {
    const deleteHandler = withAuth(
      async () => {
        const { NextResponse } = await import("next/server");
        return NextResponse.json({ success: true });
      },
      { permissions: ["analytics:delete"] }
    );

    const user = makeUser({ role: "MANAGER" });
    const { accessToken } = generateToken(user);
    const request = makeRequest(accessToken);
    const response = await deleteHandler(request);

    expect(response.status).toBe(403);
  });

  test("requireAll=true requires every permission", async () => {
    const multiPermHandler = withAuth(
      async () => {
        const { NextResponse } = await import("next/server");
        return NextResponse.json({ success: true });
      },
      { permissions: ["analytics:read", "analytics:write"], requireAll: true }
    );

    // VIEWER has read but not write
    const user = makeUser({ role: "VIEWER" });
    const { accessToken } = generateToken(user);
    const request = makeRequest(accessToken);
    const response = await multiPermHandler(request);

    expect(response.status).toBe(403);
  });

  test("requireAll=false allows any matching permission", async () => {
    const anyPermHandler = withAuth(
      async () => {
        const { NextResponse } = await import("next/server");
        return NextResponse.json({ success: true });
      },
      { permissions: ["analytics:read", "analytics:write"], requireAll: false }
    );

    // VIEWER has analytics:read
    const user = makeUser({ role: "VIEWER" });
    const { accessToken } = generateToken(user);
    const request = makeRequest(accessToken);
    const response = await anyPermHandler(request);

    expect(response.status).toBe(200);
  });

  test("handler with no permissions only requires authentication", async () => {
    const noPermHandler = withAuth(async () => {
      const { NextResponse } = await import("next/server");
      return NextResponse.json({ success: true });
    });

    const user = makeUser({ role: "VIEWER" });
    const { accessToken } = generateToken(user);
    const request = makeRequest(accessToken);
    const response = await noPermHandler(request);

    expect(response.status).toBe(200);
  });
});

// ─── Tenant Isolation in API Context ────────────────────────────────────────

describe("Tenant isolation in API routes", () => {
  test("user context contains correct tenantId", async () => {
    let capturedTenantId: string | null = null;

    const handler = withAuth(async (_req, { user }) => {
      capturedTenantId = user.tenantId;
      const { NextResponse } = await import("next/server");
      return NextResponse.json({ success: true });
    });

    const user = makeUser({ tenantId: "tenant-xyz" });
    const { accessToken } = generateToken(user);
    const request = makeRequest(accessToken);
    await handler(request);

    expect(capturedTenantId).toBe("tenant-xyz");
  });

  test("different users get different tenant contexts", async () => {
    const capturedIds: string[] = [];

    const handler = withAuth(async (_req, { user }) => {
      capturedIds.push(user.tenantId);
      const { NextResponse } = await import("next/server");
      return NextResponse.json({ success: true });
    });

    // User from tenant A
    const userA = makeUser({ tenantId: "tenant-A", email: "a@a.com" });
    const tokenA = generateToken(userA).accessToken;
    await handler(makeRequest(tokenA));

    // User from tenant B
    const userB = makeUser({ tenantId: "tenant-B", email: "b@b.com" });
    const tokenB = generateToken(userB).accessToken;
    await handler(makeRequest(tokenB));

    expect(capturedIds).toEqual(["tenant-A", "tenant-B"]);
  });
});

// ─── Response Format Tests ──────────────────────────────────────────────────

describe("API response format", () => {
  test("error responses include success=false and error message", async () => {
    const handler = withAuth(async () => {
      const { NextResponse } = await import("next/server");
      return NextResponse.json({ success: true });
    });

    const request = makeRequest(); // no token
    const response = await handler(request);
    const body = await response.json();

    expect(body).toHaveProperty("success", false);
    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
  });

  test("403 responses include the required permissions and user role", async () => {
    const handler = withAuth(
      async () => {
        const { NextResponse } = await import("next/server");
        return NextResponse.json({ success: true });
      },
      { permissions: ["tenants:delete"] }
    );

    const user = makeUser({ role: "VIEWER" });
    const { accessToken } = generateToken(user);
    const response = await handler(makeRequest(accessToken));
    const body = await response.json();

    expect(body.required).toEqual(["tenants:delete"]);
    expect(body.role).toBe("VIEWER");
  });
});
