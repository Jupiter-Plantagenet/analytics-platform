import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { withAuth, validateTenantParam } from "@/lib/rbac";
import type { ApiResponse, TenantInfo } from "@/types";

// ─── GET /api/tenants ───────────────────────────────────────────────────────
// Returns the current user's tenant details.

export const GET = withAuth(
  async (_request: NextRequest, { user }) => {
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            analyticsEvents: true,
            metrics: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Tenant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        ...tenant,
        userCount: tenant._count.users,
        eventCount: tenant._count.analyticsEvents,
        metricCount: tenant._count.metrics,
      },
    });
  },
  { permissions: ["tenants:read"] }
);

// ─── PUT /api/tenants ───────────────────────────────────────────────────────
// Update tenant settings (admin only).

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  plan: z.enum(["FREE", "STARTER", "PROFESSIONAL", "ENTERPRISE"]).optional(),
});

export const PUT = withAuth(
  async (request: NextRequest, { user }) => {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    // Only allow updates to own tenant
    validateTenantParam(user, user.tenantId);

    const updated = await prisma.tenant.update({
      where: { id: user.tenantId },
      data: parsed.data,
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        isActive: true,
      },
    });

    return NextResponse.json<ApiResponse<TenantInfo>>({
      success: true,
      data: updated,
      message: "Tenant updated successfully",
    });
  },
  { permissions: ["tenants:write"] }
);
