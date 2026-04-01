import { PrismaClient, Role, Plan, EventType, MetricCategory } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── Helpers ────────────────────────────────────────────────────────────────

function randomBetween(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function monthLabel(monthsAgo: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return d.toISOString().slice(0, 7); // "2025-03"
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ─── Seed Data ──────────────────────────────────────────────────────────────

async function main() {
  console.log("Seeding database...\n");

  // Clean existing data
  await prisma.analyticsEvent.deleteMany();
  await prisma.metric.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  const hashedPassword = await bcrypt.hash("demo-password-123", 12);

  // ── Tenants ─────────────────────────────────────────────────────────────

  const tenants = await Promise.all([
    prisma.tenant.create({
      data: {
        name: "Acme Corporation",
        slug: "acme-corp",
        plan: Plan.ENTERPRISE,
      },
    }),
    prisma.tenant.create({
      data: {
        name: "Startup Labs",
        slug: "startup-labs",
        plan: Plan.PROFESSIONAL,
      },
    }),
    prisma.tenant.create({
      data: {
        name: "Freelance Studio",
        slug: "freelance-studio",
        plan: Plan.STARTER,
      },
    }),
  ]);

  console.log(`Created ${tenants.length} tenants`);

  // ── Users ───────────────────────────────────────────────────────────────

  const usersData = tenants.flatMap((tenant) => [
    {
      email: `admin@${tenant.slug}.com`,
      hashedPassword,
      name: `${tenant.name} Admin`,
      role: Role.ADMIN,
      tenantId: tenant.id,
    },
    {
      email: `manager@${tenant.slug}.com`,
      hashedPassword,
      name: `${tenant.name} Manager`,
      role: Role.MANAGER,
      tenantId: tenant.id,
    },
    {
      email: `viewer@${tenant.slug}.com`,
      hashedPassword,
      name: `${tenant.name} Viewer`,
      role: Role.VIEWER,
      tenantId: tenant.id,
    },
  ]);

  const users = await Promise.all(
    usersData.map((u) => prisma.user.create({ data: u }))
  );

  console.log(`Created ${users.length} users`);

  // ── Metrics (12 months per tenant) ──────────────────────────────────────

  const metricTemplates: {
    name: string;
    category: MetricCategory;
    unit: string;
    baseValue: number;
    growthRate: number;
  }[] = [
    { name: "Monthly Revenue", category: MetricCategory.REVENUE, unit: "USD", baseValue: 50000, growthRate: 1.08 },
    { name: "Monthly Recurring Revenue", category: MetricCategory.REVENUE, unit: "USD", baseValue: 35000, growthRate: 1.06 },
    { name: "Active Users", category: MetricCategory.USERS, unit: "users", baseValue: 1200, growthRate: 1.12 },
    { name: "New Signups", category: MetricCategory.USERS, unit: "users", baseValue: 150, growthRate: 1.10 },
    { name: "Avg Session Duration", category: MetricCategory.ENGAGEMENT, unit: "minutes", baseValue: 4.5, growthRate: 1.02 },
    { name: "Page Views", category: MetricCategory.ENGAGEMENT, unit: "views", baseValue: 45000, growthRate: 1.09 },
    { name: "API Latency P95", category: MetricCategory.PERFORMANCE, unit: "ms", baseValue: 250, growthRate: 0.97 },
    { name: "Conversion Rate", category: MetricCategory.CONVERSION, unit: "%", baseValue: 3.2, growthRate: 1.03 },
  ];

  let metricsCount = 0;

  for (const tenant of tenants) {
    const scale = tenant.plan === Plan.ENTERPRISE ? 1 : tenant.plan === Plan.PROFESSIONAL ? 0.5 : 0.2;

    for (let monthOffset = 11; monthOffset >= 0; monthOffset--) {
      const period = monthLabel(monthOffset);

      for (const template of metricTemplates) {
        const growthMultiplier = Math.pow(template.growthRate, 12 - monthOffset);
        const noise = randomBetween(0.9, 1.1);
        const value = Math.round(template.baseValue * scale * growthMultiplier * noise * 100) / 100;

        await prisma.metric.create({
          data: {
            name: template.name,
            category: template.category,
            value,
            unit: template.unit,
            period,
            tenantId: tenant.id,
          },
        });
        metricsCount++;
      }
    }
  }

  console.log(`Created ${metricsCount} metric records`);

  // ── Analytics Events (last 30 days per tenant) ──────────────────────────

  const eventTemplates: { type: EventType; name: string; valueRange: [number, number] }[] = [
    { type: EventType.PAGE_VIEW, name: "Homepage viewed", valueRange: [1, 1] },
    { type: EventType.PAGE_VIEW, name: "Dashboard viewed", valueRange: [1, 1] },
    { type: EventType.PAGE_VIEW, name: "Pricing page viewed", valueRange: [1, 1] },
    { type: EventType.CLICK, name: "CTA button clicked", valueRange: [1, 1] },
    { type: EventType.CLICK, name: "Feature tour started", valueRange: [1, 1] },
    { type: EventType.SIGNUP, name: "New user registered", valueRange: [1, 1] },
    { type: EventType.CONVERSION, name: "Trial to paid conversion", valueRange: [29, 99] },
    { type: EventType.PURCHASE, name: "Subscription purchased", valueRange: [49, 499] },
    { type: EventType.PURCHASE, name: "Add-on purchased", valueRange: [9, 49] },
    { type: EventType.API_CALL, name: "REST API request", valueRange: [50, 350] },
    { type: EventType.ERROR, name: "Payment processing error", valueRange: [1, 1] },
    { type: EventType.CUSTOM, name: "Report exported", valueRange: [1, 10] },
  ];

  let eventsCount = 0;

  for (const tenant of tenants) {
    const dailyEvents = tenant.plan === Plan.ENTERPRISE ? 25 : tenant.plan === Plan.PROFESSIONAL ? 15 : 8;

    for (let day = 29; day >= 0; day--) {
      const count = Math.floor(dailyEvents * randomBetween(0.7, 1.3));
      for (let i = 0; i < count; i++) {
        const template = eventTemplates[Math.floor(Math.random() * eventTemplates.length)];
        const timestamp = daysAgo(day);
        timestamp.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

        await prisma.analyticsEvent.create({
          data: {
            type: template.type,
            name: template.name,
            value: randomBetween(template.valueRange[0], template.valueRange[1]),
            timestamp,
            tenantId: tenant.id,
            metadata: {
              source: ["web", "mobile", "api"][Math.floor(Math.random() * 3)],
              region: ["us-east", "us-west", "eu-west", "ap-south"][Math.floor(Math.random() * 4)],
            },
          },
        });
        eventsCount++;
      }
    }
  }

  console.log(`Created ${eventsCount} analytics events`);
  console.log("\nSeed complete!");
  console.log("\nDemo credentials (same password for all users):");
  console.log("  Password: demo-password-123");
  console.log("  Tenants:  acme-corp | startup-labs | freelance-studio");
  console.log("  Roles:    admin@<slug>.com | manager@<slug>.com | viewer@<slug>.com");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
