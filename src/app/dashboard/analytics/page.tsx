"use client";

import { useEffect, useState } from "react";
import {
  RevenueChart,
  UserGrowthChart,
} from "@/components/DashboardChart";
import type { RevenueChartData, UserGrowthData, ActivityEntry } from "@/types";

export default function AnalyticsPage() {
  const [revenueData, setRevenueData] = useState<RevenueChartData[]>([]);
  const [userData, setUserData] = useState<UserGrowthData[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    fetch("/api/analytics", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setRevenueData(res.data.revenueChart || []);
          setUserData(res.data.userGrowth || []);
          setActivities(res.data.recentActivity || []);
        } else {
          setError(res.error || "Failed to load analytics");
        }
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">Detailed revenue and user growth metrics.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend (12 months)</h2>
          {revenueData.length > 0 ? (
            <RevenueChart data={revenueData} />
          ) : (
            <p className="text-gray-400 text-sm">No revenue data available.</p>
          )}
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">User Growth (12 months)</h2>
          {userData.length > 0 ? (
            <UserGrowthChart data={userData} />
          ) : (
            <p className="text-gray-400 text-sm">No user data available.</p>
          )}
        </div>
      </div>

      {/* Summary stats */}
      {revenueData.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-500">Total Revenue (12mo)</div>
            <div className="text-xl font-bold text-gray-900">
              ${revenueData.reduce((s, d) => s + d.revenue, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-500">Avg Monthly Revenue</div>
            <div className="text-xl font-bold text-gray-900">
              ${(revenueData.reduce((s, d) => s + d.revenue, 0) / revenueData.length).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-500">Total New Users (12mo)</div>
            <div className="text-xl font-bold text-gray-900">
              {userData.reduce((s, d) => s + d.newUsers, 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-500">Current Active Users</div>
            <div className="text-xl font-bold text-gray-900">
              {userData.length > 0 ? userData[userData.length - 1].totalUsers.toLocaleString() : "—"}
            </div>
          </div>
        </div>
      )}

      {/* Activity table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity ({activities.length} events)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-3 font-medium">Event</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Value</th>
                <th className="pb-3 font-medium">Source</th>
                <th className="pb-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a) => {
                const meta = a.metadata as Record<string, string> | undefined;
                return (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 text-gray-900">{a.name}</td>
                    <td className="py-3">
                      <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {a.type.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 text-gray-600">{a.value}</td>
                    <td className="py-3 text-gray-400 text-xs">{meta?.source || "—"}</td>
                    <td className="py-3 text-gray-400 text-xs">
                      {new Date(a.timestamp).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
              {activities.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-400">No recent activity</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
