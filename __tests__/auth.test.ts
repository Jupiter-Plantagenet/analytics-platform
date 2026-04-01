import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  authenticateRequest,
  requireAuth,
  AuthenticationError,
} from "@/lib/auth";
import type { JWTPayload } from "@/types";

// ─── Test Configuration ─────────────────────────────────────────────────────

// Override env vars for testing
process.env.JWT_SECRET = "test-secret-key-256-bits-long-enough";
process.env.JWT_EXPIRATION = "1h";

const mockPayload: JWTPayload = {
  userId: "user-001",
  email: "admin@acme-corp.com",
  name: "Acme Admin",
  role: "ADMIN",
  tenantId: "tenant-001",
  tenantSlug: "acme-corp",
};

// Helper to create a mock NextRequest
function createMockRequest(authHeader?: string) {
  return {
    headers: {
      get: (name: string) => {
        if (name === "authorization") return authHeader ?? null;
        return null;
      },
    },
  } as unknown as import("next/server").NextRequest;
}

// ─── Password Tests ─────────────────────────────────────────────────────────

describe("Password utilities", () => {
  test("hashPassword produces a bcrypt hash", async () => {
    const hash = await hashPassword("my-secure-password");
    expect(hash).toBeDefined();
    expect(hash).not.toBe("my-secure-password");
    expect(hash.startsWith("$2a$") || hash.startsWith("$2b$")).toBe(true);
  });

  test("verifyPassword returns true for matching password", async () => {
    const password = "correct-horse-battery-staple";
    const hash = await hashPassword(password);
    const result = await verifyPassword(password, hash);
    expect(result).toBe(true);
  });

  test("verifyPassword returns false for wrong password", async () => {
    const hash = await hashPassword("correct-password");
    const result = await verifyPassword("wrong-password", hash);
    expect(result).toBe(false);
  });

  test("hashPassword uses sufficient salt rounds", async () => {
    const hash = await hashPassword("test");
    // bcrypt hash format: $2a$<rounds>$...
    const rounds = parseInt(hash.split("$")[2], 10);
    expect(rounds).toBeGreaterThanOrEqual(10);
  });
});

// ─── JWT Tests ──────────────────────────────────────────────────────────────

describe("JWT utilities", () => {
  test("generateToken creates a valid JWT", () => {
    const { accessToken, expiresAt } = generateToken(mockPayload);

    expect(accessToken).toBeDefined();
    expect(typeof accessToken).toBe("string");
    expect(accessToken.split(".")).toHaveLength(3); // header.payload.signature
    expect(expiresAt).toBeGreaterThan(Date.now());
  });

  test("verifyToken decodes a valid token", () => {
    const { accessToken } = generateToken(mockPayload);
    const decoded = verifyToken(accessToken);

    expect(decoded.userId).toBe(mockPayload.userId);
    expect(decoded.email).toBe(mockPayload.email);
    expect(decoded.role).toBe(mockPayload.role);
    expect(decoded.tenantId).toBe(mockPayload.tenantId);
    expect(decoded.tenantSlug).toBe(mockPayload.tenantSlug);
  });

  test("verifyToken throws on expired token", () => {
    const expired = jwt.sign(mockPayload, process.env.JWT_SECRET!, {
      expiresIn: "-1s",
      issuer: "analytics-platform",
      audience: "analytics-platform-api",
    });

    expect(() => verifyToken(expired)).toThrow();
  });

  test("verifyToken throws on invalid signature", () => {
    const token = jwt.sign(mockPayload, "wrong-secret", {
      expiresIn: "1h",
      issuer: "analytics-platform",
      audience: "analytics-platform-api",
    });

    expect(() => verifyToken(token)).toThrow();
  });

  test("verifyToken throws on malformed token", () => {
    expect(() => verifyToken("not.a.valid-jwt")).toThrow();
  });

  test("token contains correct issuer and audience", () => {
    const { accessToken } = generateToken(mockPayload);
    const decoded = jwt.decode(accessToken) as jwt.JwtPayload;

    expect(decoded.iss).toBe("analytics-platform");
    expect(decoded.aud).toBe("analytics-platform-api");
  });
});

// ─── Request Authentication Tests ───────────────────────────────────────────

describe("authenticateRequest", () => {
  test("returns payload for valid Bearer token", () => {
    const { accessToken } = generateToken(mockPayload);
    const request = createMockRequest(`Bearer ${accessToken}`);
    const result = authenticateRequest(request);

    expect(result).not.toBeNull();
    expect(result!.userId).toBe(mockPayload.userId);
    expect(result!.tenantId).toBe(mockPayload.tenantId);
  });

  test("returns null when no Authorization header", () => {
    const request = createMockRequest();
    expect(authenticateRequest(request)).toBeNull();
  });

  test("returns null for non-Bearer auth scheme", () => {
    const request = createMockRequest("Basic dXNlcjpwYXNz");
    expect(authenticateRequest(request)).toBeNull();
  });

  test("returns null for invalid token", () => {
    const request = createMockRequest("Bearer invalid-token");
    expect(authenticateRequest(request)).toBeNull();
  });
});

// ─── requireAuth Tests ──────────────────────────────────────────────────────

describe("requireAuth", () => {
  test("returns payload for authenticated request", () => {
    const { accessToken } = generateToken(mockPayload);
    const request = createMockRequest(`Bearer ${accessToken}`);
    const result = requireAuth(request);

    expect(result.userId).toBe(mockPayload.userId);
  });

  test("throws AuthenticationError for unauthenticated request", () => {
    const request = createMockRequest();

    expect(() => requireAuth(request)).toThrow(AuthenticationError);
    expect(() => requireAuth(request)).toThrow("Valid authentication token required");
  });

  test("AuthenticationError has statusCode 401", () => {
    const err = new AuthenticationError();
    expect(err.statusCode).toBe(401);
    expect(err.name).toBe("AuthenticationError");
  });
});
