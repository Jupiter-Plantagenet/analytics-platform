"use client";

import { useEffect, useState } from "react";
import {
  RevenueChart,
  UserGrowthChart,
  MetricCardDisplay,
} from "@/components/DashboardChart";
import RoleGuard from "@/components/RoleGuard";
import type {
  DashboardData,
  UserRole,
  RevenueChartData,
  UserGrowthData,
  MetricCard,
  ActivityEntry,
} from "@/types";

// ─── Mock Data (used when the API is unavailable) ───────────────────────────

function generateMockData(): DashboardData {
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    return d.toISOString().slice(0, 7);
  });

  const revenueChart: RevenueChartData[] = months.map((month, i) => ({
    month,
    revenue: 42000 + i * 3500 + Math.round(Math.random() * 5000),
    target: 45000 + i * 4000,
  }));

  const userGrowth: UserGrowthData[] = months.map((month, i) => ({
    month,
    newUsers: 120 + i * 15 + Math.round(Math.random() * 30),
    totalUsers: 1200 + i * 180 + Math.round(Math.random() * 50),
  }));

  const makeCard = (
    name: string,
    value: number,
    unit: string,
    change: number,
    category: MetricCard["category"]
  ): MetricCard => ({
    name,
    value,
    unit,
    change,
    trend: change > 1 ? "up" : change < -1 ? "down" : "flat",
    category,
  });

  const overview = {
    totalRevenue: makeCard("Total Revenue", 87450, "USD", 12.3, "REVENUE"),
    activeUsers: makeCard("Active Users", 3284, "users", 8.1, "USERS"),
    conversionRate: makeCard("Conversion Rate", 4.2, "%", 2.4, "CONVERSION"),
    avgSessionDuration: makeCard("Avg Session", 5.7, "minutes", -1.8, "ENGAGEMENT"),
  };

  const eventTypes: ActivityEntry["type"][] = [
    "PAGE_VIEW", "CLICK", "CONVERSION", "SIGNUP", "PURCHASE", "API_CALL",
  ];
  const eventNames = [
    "Dashboard viewed",
    "Upgrade CTA clicked",
    "Trial converted to paid",
    "New user registered",
    "Pro plan purchased",
    "REST API call",
  ];

  const recentActivity: ActivityEntry[] = Array.from({ length: 15 }, (_, i) => {
    const idx = i % eventTypes.length;
    return {
      id: `evt-${i}`,
      type: eventTypes[idx],
      name: eventNames[idx],
      value: Math.round(Math.random() * 500),
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
    };
  });

  return { overview, revenueChart, userGrowth, recentActivity };
}

// ─── Dashboard Page ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>("VIEWER");

  useEffect(() => {
    // Parse role from JWT
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUserRole(payload.role as UserRole);
      } catch {
        // fallback handled
      }
    }

    // Try API first, fall back to mock data
    async function loadData() {
      try {
        const res = await fetch("/api/analytics", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
          return;
        }
      } catch {
        // API unavailable -- use mock data
      }
      setData(generateMockData());
    }

    loadData().finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="mt-4 text-sm text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const { overview, revenueChart, userGrowth, recentActivity } = data;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Overview of your organisation&apos;s key metrics
          </p>
        </div>
        <RoleGuard role={userRole} requiredPermissions="metrics:export">
          <button className="btn-secondary">
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            Export Report
          </button>
        </RoleGuard>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCardDisplay {...overview.totalRevenue} />
        <MetricCardDisplay {...overview.activeUsers} />
        <MetricCardDisplay {...overview.conversionRate} />
        <MetricCardDisplay {...overview.avgSessionDuration} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <RevenueChart data={revenueChart} />
        <UserGrowthChart data={userGrowth} />
      </div>

      {/* Activity table */}
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Activity
          </h3>
          <span className="text-sm text-gray-500">
            Last {recentActivity.length} events
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-3 pr-4 font-medium text-gray-500">Event</th>
                <th className="pb-3 pr-4 font-medium text-gray-500">Type</th>
                <th className="pb-3 pr-4 font-medium text-gray-500">Value</th>
                <th className="pb-3 font-medium text-gray-500">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentActivity.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="py-3 pr-4 font-medium text-gray-900">
                    {event.name}
                  </td>
                  <td className="py-3 pr-4">
                    <EventTypeBadge type={event.type} />
                  </td>
                  <td className="py-3 pr-4 text-gray-600">
                    {event.value > 0 ? event.value.toLocaleString() : "--"}
                  </td>
                  <td className="py-3 text-gray-500">
                    {formatRelativeTime(event.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function EventTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    PAGE_VIEW: "bg-sky-50 text-sky-700",
    CLICK: "bg-violet-50 text-violet-700",
    CONVERSION: "bg-emerald-50 text-emerald-700",
    SIGNUP: "bg-teal-50 text-teal-700",
    PURCHASE: "bg-amber-50 text-amber-700",
    API_CALL: "bg-gray-100 text-gray-700",
    ERROR: "bg-red-50 text-red-700",
    CUSTOM: "bg-indigo-50 text-indigo-700",
  };

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
        colors[type] ?? colors.CUSTOM
      }`}
    >
      {type.replace("_", " ")}
    </span>
  );
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
