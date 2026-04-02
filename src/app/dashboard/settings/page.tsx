"use client";

import { useEffect, useState } from "react";

interface TenantData {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
  userCount: number;
  eventCount: number;
  metricCount: number;
}

export default function SettingsPage() {
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("userRole") || "";
    setUserRole(role);

    if (!token) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    fetch("/api/tenants", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setTenant(res.data);
        } else {
          setError(res.error || "Failed to load settings");
        }
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-gray-500">Loading settings...</div>
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

  const planColors: Record<string, string> = {
    FREE: "bg-gray-100 text-gray-700",
    STARTER: "bg-blue-100 text-blue-700",
    PROFESSIONAL: "bg-purple-100 text-purple-700",
    ENTERPRISE: "bg-amber-100 text-amber-800",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your organization settings.</p>
      </div>

      {/* Organization info */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Organization</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Name</label>
            <div className="text-gray-900 font-medium text-lg">{tenant?.name}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Slug</label>
            <code className="text-gray-900 bg-gray-100 px-2 py-1 rounded text-sm">{tenant?.slug}</code>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Plan</label>
            <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${planColors[tenant?.plan || "FREE"]}`}>
              {tenant?.plan}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Created</label>
            <div className="text-gray-900">{tenant?.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : "—"}</div>
          </div>
        </div>
      </div>

      {/* Usage stats */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage</h2>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="text-3xl font-bold text-gray-900">{tenant?.userCount ?? 0}</div>
            <div className="text-sm text-gray-500">Team Members</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900">{(tenant?.eventCount ?? 0).toLocaleString()}</div>
            <div className="text-sm text-gray-500">Analytics Events</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900">{tenant?.metricCount ?? 0}</div>
            <div className="text-sm text-gray-500">Tracked Metrics</div>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Security</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-green-500"></span>
            <span className="text-sm text-gray-600">JWT authentication active — sessions expire after 24 hours</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-green-500"></span>
            <span className="text-sm text-gray-600">RBAC enforcement enabled — your role: <strong>{userRole || "Unknown"}</strong></span>
          </div>
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-green-500"></span>
            <span className="text-sm text-gray-600">Tenant isolation — all data scoped to <strong>{tenant?.slug}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
