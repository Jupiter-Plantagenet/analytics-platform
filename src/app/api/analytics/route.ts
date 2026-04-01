import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import type {
  ApiResponse,
  DashboardData,
  MetricCard,
  RevenueChartData,
  UserGrowthData,
  ActivityEntry,
} from "@/types";

// ─── GET /api/analytics ─────────────────────────────────────────────────────
// Returns the full dashboard payload for the authenticated user's tenant.

export const GET = withAuth(
  async (request: NextRequest, { user }) => {
    const tenantId = user.tenantId;

    const [overview, revenueChart, userGrowth, recentActivity] =
      await Promise.all([
        buildOverview(tenantId),
        buildRevenueChart(tenantId),
        buildUserGrowthChart(tenantId),
        buildRecentActivity(tenantId),
      ]);

    const data: DashboardData = {
      overview,
      revenueChart,
      userGrowth,
      recentActivity,
    };

    return NextResponse.json<ApiResponse<DashboardData>>({
      success: true,
      data,
    });
  },
  { permissions: ["analytics:read"] }
);

// ─── POST /api/analytics ────────────────────────────────────────────────────
// Record a new analytics event (requires write permission).

export const POST = withAuth(
  async (request: NextRequest, { user }) => {
    const body = await request.json();

    const event = await prisma.analyticsEvent.create({
      data: {
        type: body.type,
        name: body.name,
        value: body.value ?? 0,
        metadata: body.metadata ?? {},
        tenantId: user.tenantId,
      },
    });

    return NextResponse.json<ApiResponse>(
      { success: true, data: event, message: "Event recorded" },
      { status: 201 }
    );
  },
  { permissions: ["analytics:write"] }
);

// ─── Data Builders ──────────────────────────────────────────────────────────

async function buildOverview(tenantId: string) {
  const currentPeriod = new Date().toISOString().slice(0, 7);
  const prevDate = new Date();
  prevDate.setMonth(prevDate.getMonth() - 1);
  const previousPeriod = prevDate.toISOString().slice(0, 7);

  async function getMetricCard(
    name: string,
    unit: string,
    category: MetricCard["category"]
  ): Promise<MetricCard> {
    const [current, previous] = await Promise.all([
      prisma.metric.findUnique({
        where: { tenantId_name_period: { tenantId, name, period: currentPeriod } },
      }),
      prisma.metric.findUnique({
        where: { tenantId_name_period: { tenantId, name, period: previousPeriod } },
      }),
    ]);

    const currentValue = current?.value ?? 0;
    const previousValue = previous?.value ?? 0;
    const change =
      previousValue === 0 ? 0 : ((currentValue - previousValue) / previousValue) * 100;

    return {
      name,
      value: currentValue,
      unit,
      change: Math.round(change * 10) / 10,
      trend: change > 1 ? "up" : change < -1 ? "down" : "flat",
      category,
    };
  }

  const [totalRevenue, activeUsers, conversionRate, avgSessionDuration] =
    await Promise.all([
      getMetricCard("Monthly Revenue", "USD", "REVENUE"),
      getMetricCard("Active Users", "users", "USERS"),
      getMetricCard("Conversion Rate", "%", "CONVERSION"),
      getMetricCard("Avg Session Duration", "minutes", "ENGAGEMENT"),
    ]);

  return { totalRevenue, activeUsers, conversionRate, avgSessionDuration };
}

async function buildRevenueChart(tenantId: string): Promise<RevenueChartData[]> {
  const metrics = await prisma.metric.findMany({
    where: { tenantId, name: "Monthly Revenue" },
    orderBy: { period: "asc" },
    take: 12,
  });

  return metrics.map((m) => ({
    month: m.period,
    revenue: m.value,
    target: m.value * 1.1, // 10% above actual as a simple target line
  }));
}

async function buildUserGrowthChart(tenantId: string): Promise<UserGrowthData[]> {
  const [signups, activeUsers] = await Promise.all([
    prisma.metric.findMany({
      where: { tenantId, name: "New Signups" },
      orderBy: { period: "asc" },
      take: 12,
    }),
    prisma.metric.findMany({
      where: { tenantId, name: "Active Users" },
      orderBy: { period: "asc" },
      take: 12,
    }),
  ]);

  const activeMap = new Map(activeUsers.map((m) => [m.period, m.value]));

  return signups.map((m) => ({
    month: m.period,
    newUsers: Math.round(m.value),
    totalUsers: Math.round(activeMap.get(m.period) ?? 0),
  }));
}

async function buildRecentActivity(tenantId: string): Promise<ActivityEntry[]> {
  const events = await prisma.analyticsEvent.findMany({
    where: { tenantId },
    orderBy: { timestamp: "desc" },
    take: 20,
  });

  return events.map((e) => ({
    id: e.id,
    type: e.type,
    name: e.name,
    value: e.value,
    timestamp: e.timestamp.toISOString(),
    metadata: e.metadata as Record<string, unknown> | undefined,
  }));
}
