"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { RevenueChartData, UserGrowthData } from "@/types";

// ─── Revenue Chart ──────────────────────────────────────────────────────────

interface RevenueChartProps {
  data: RevenueChartData[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        Revenue Over Time
      </h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              stroke="#9ca3af"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="#9ca3af"
              tickFormatter={(value: number) =>
                `$${(value / 1000).toFixed(0)}k`
              }
            />
            <Tooltip
              formatter={(value: number) => [
                `$${value.toLocaleString()}`,
                undefined,
              ]}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#4f46e5"
              strokeWidth={2}
              dot={{ fill: "#4f46e5", r: 4 }}
              activeDot={{ r: 6 }}
              name="Revenue"
            />
            <Line
              type="monotone"
              dataKey="target"
              stroke="#e5e7eb"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Target"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── User Growth Chart ──────────────────────────────────────────────────────

interface UserGrowthChartProps {
  data: UserGrowthData[];
}

export function UserGrowthChart({ data }: UserGrowthChartProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">User Growth</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              stroke="#9ca3af"
            />
            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            />
            <Legend />
            <Bar
              dataKey="newUsers"
              fill="#818cf8"
              radius={[4, 4, 0, 0]}
              name="New Users"
            />
            <Bar
              dataKey="totalUsers"
              fill="#4f46e5"
              radius={[4, 4, 0, 0]}
              name="Total Active"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Metric Card ────────────────────────────────────────────────────────────

interface MetricCardProps {
  name: string;
  value: number;
  unit: string;
  change: number;
  trend: "up" | "down" | "flat";
}

export function MetricCardDisplay({
  name,
  value,
  unit,
  change,
  trend,
}: MetricCardProps) {
  const trendColor =
    trend === "up"
      ? "text-emerald-600 bg-emerald-50"
      : trend === "down"
        ? "text-red-600 bg-red-50"
        : "text-gray-600 bg-gray-50";

  const trendArrow = trend === "up" ? "\u2191" : trend === "down" ? "\u2193" : "\u2192";

  const formattedValue =
    unit === "USD"
      ? `$${value.toLocaleString()}`
      : unit === "%"
        ? `${value.toFixed(1)}%`
        : value.toLocaleString();

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <p className="text-sm font-medium text-gray-500">{name}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-3xl font-bold text-gray-900">{formattedValue}</p>
        {unit !== "USD" && unit !== "%" && (
          <span className="text-sm text-gray-400">{unit}</span>
        )}
      </div>
      <div className="mt-3">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${trendColor}`}
        >
          {trendArrow} {Math.abs(change).toFixed(1)}%
        </span>
        <span className="ml-2 text-xs text-gray-400">vs last month</span>
      </div>
    </div>
  );
}
