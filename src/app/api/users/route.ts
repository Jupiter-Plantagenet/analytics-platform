import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import type { ApiResponse } from "@/types";

export const GET = withAuth(
  async (_request: NextRequest, { user }) => {
    const users = await prisma.user.findMany({
      where: { tenantId: user.tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: users,
    });
  },
  { permissions: ["users:read"] }
);
