import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import type { JWTPayload, AuthTokens } from "@/types";

// ─── Configuration ──────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET || "fallback-dev-secret";
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || "24h";
const SALT_ROUNDS = 12;

// ─── Password Utilities ─────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// ─── JWT Utilities ──────────────────────────────────────────────────────────

export function generateToken(payload: JWTPayload): AuthTokens {
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRATION as jwt.SignOptions["expiresIn"],
    issuer: "analytics-platform",
    audience: "analytics-platform-api",
  });

  const decoded = jwt.decode(accessToken) as jwt.JwtPayload;
  const expiresAt = (decoded.exp || 0) * 1000; // convert to ms

  return { accessToken, expiresAt };
}

export function verifyToken(token: string): JWTPayload {
  const decoded = jwt.verify(token, JWT_SECRET, {
    issuer: "analytics-platform",
    audience: "analytics-platform-api",
  });
  return decoded as JWTPayload;
}

// ─── Request Helpers ────────────────────────────────────────────────────────

/**
 * Extract the Bearer token from an incoming request's Authorization header.
 */
export function extractTokenFromRequest(
  request: NextRequest
): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Authenticate a request and return the decoded JWT payload.
 * Returns null if the token is missing or invalid.
 */
export function authenticateRequest(
  request: NextRequest
): JWTPayload | null {
  const token = extractTokenFromRequest(request);
  if (!token) return null;

  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

/**
 * Require authentication -- throws a descriptive error when the request
 * is unauthenticated so the caller can return an appropriate HTTP response.
 */
export function requireAuth(request: NextRequest): JWTPayload {
  const payload = authenticateRequest(request);
  if (!payload) {
    throw new AuthenticationError("Valid authentication token required");
  }
  return payload;
}

// ─── Errors ─────────────────────────────────────────────────────────────────

export class AuthenticationError extends Error {
  public readonly statusCode = 401;
  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  public readonly statusCode = 403;
  constructor(message = "Insufficient permissions") {
    super(message);
    this.name = "AuthorizationError";
  }
}
