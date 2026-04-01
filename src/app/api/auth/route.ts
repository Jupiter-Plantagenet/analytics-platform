import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { hashPassword, verifyPassword, generateToken } from "@/lib/auth";
import type { JWTPayload, ApiResponse, AuthTokens } from "@/types";

// ─── Validation Schemas ─────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  tenantSlug: z.string().min(1, "Tenant slug is required"),
});

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  tenantSlug: z.string().min(1, "Tenant slug is required"),
});

// ─── POST /api/auth ─────────────────────────────────────────────────────────
// Handles both login and registration via an `action` field.

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<AuthTokens>>> {
  try {
    const body = await request.json();
    const action = body.action as string;

    if (action === "register") {
      return handleRegister(body);
    }
    return handleLogin(body);
  } catch (error) {
    console.error("[AUTH] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── Login Handler ──────────────────────────────────────────────────────────

async function handleLogin(
  body: unknown
): Promise<NextResponse<ApiResponse<AuthTokens>>> {
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const { email, password, tenantSlug } = parsed.data;

  // Find tenant
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });

  if (!tenant || !tenant.isActive) {
    return NextResponse.json(
      { success: false, error: "Tenant not found or inactive" },
      { status: 404 }
    );
  }

  // Find user within tenant
  const user = await prisma.user.findUnique({
    where: { email_tenantId: { email, tenantId: tenant.id } },
  });

  if (!user || !user.isActive) {
    return NextResponse.json(
      { success: false, error: "Invalid credentials" },
      { status: 401 }
    );
  }

  // Verify password
  const isValid = await verifyPassword(password, user.hashedPassword);
  if (!isValid) {
    return NextResponse.json(
      { success: false, error: "Invalid credentials" },
      { status: 401 }
    );
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Generate JWT
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
  };

  const tokens = generateToken(payload);

  return NextResponse.json({
    success: true,
    data: tokens,
    message: "Login successful",
  });
}

// ─── Register Handler ───────────────────────────────────────────────────────

async function handleRegister(
  body: unknown
): Promise<NextResponse<ApiResponse<AuthTokens>>> {
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const { email, password, name, tenantSlug } = parsed.data;

  // Find tenant
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });

  if (!tenant || !tenant.isActive) {
    return NextResponse.json(
      { success: false, error: "Tenant not found or inactive" },
      { status: 404 }
    );
  }

  // Check for existing user
  const existing = await prisma.user.findUnique({
    where: { email_tenantId: { email, tenantId: tenant.id } },
  });

  if (existing) {
    return NextResponse.json(
      { success: false, error: "Email already registered for this tenant" },
      { status: 409 }
    );
  }

  // Create user
  const hashedPassword = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      hashedPassword,
      name,
      role: "VIEWER", // new users default to VIEWER
      tenantId: tenant.id,
    },
  });

  // Generate JWT
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
  };

  const tokens = generateToken(payload);

  return NextResponse.json(
    {
      success: true,
      data: tokens,
      message: "Registration successful",
    },
    { status: 201 }
  );
}
