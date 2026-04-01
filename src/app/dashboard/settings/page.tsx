"use client";

import { useEffect, useState } from "react";

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
}

export default function SettingsPage() {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    fetch("/api/tenants", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setTenant(res.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your organization settings.</p>
      </div>

      <div className="card p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Organization</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Name</label>
            <div className="text-gray-900 font-medium">{tenant?.name || "—"}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Slug</label>
            <div className="text-gray-900 font-mono text-sm">{tenant?.slug || "—"}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Plan</label>
            <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
              {tenant?.plan || "—"}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Created</label>
            <div className="text-gray-900">{tenant?.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : "—"}</div>
          </div>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Security</h2>
        <p className="text-sm text-gray-500">Authentication is handled via JWT tokens. Sessions expire after 24 hours.</p>
        <div className="flex items-center gap-3">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500"></span>
          <span className="text-sm text-gray-600">RBAC enforcement active (Admin / Manager / Viewer)</span>
        </div>
      </div>
    </div>
  );
}
