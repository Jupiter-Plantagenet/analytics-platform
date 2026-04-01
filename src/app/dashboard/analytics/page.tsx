"use client";

import { useEffect, useState } from "react";
import {
  RevenueChart,
  UserGrowthChart,
} from "@/components/DashboardChart";

interface RevenueData {
  month: string;
  revenue: number;
  target: number;
}

interface UserData {
  month: string;
  users: number;
  newUsers: number;
}

interface Activity {
  id: string;
  type: string;
  name: string;
  value: number;
  timestamp: string;
}

export default function AnalyticsPage() {
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [userData, setUserData] = useState<UserData[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    fetch("/api/analytics", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setRevenueData(res.data.revenueChart || []);
          setUserData(res.data.userGrowth || []);
          setActivities(res.data.recentActivity || []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading analytics...</div>
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
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h2>
          <RevenueChart data={revenueData} />
        </div>
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">User Growth</h2>
          <UserGrowthChart data={userData} />
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-3 font-medium">Event</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Value</th>
                <th className="pb-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="py-3 text-gray-900">{a.name}</td>
                  <td className="py-3">
                    <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {a.type}
                    </span>
                  </td>
                  <td className="py-3 text-gray-600">{a.value}</td>
                  <td className="py-3 text-gray-400">{new Date(a.timestamp).toLocaleDateString()}</td>
                </tr>
              ))}
              {activities.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-gray-400">No recent activity</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
