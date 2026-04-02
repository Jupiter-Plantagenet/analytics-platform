"use client";

import { useEffect, useState } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    fetch("/api/users", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setUsers(res.data);
        } else {
          setError(res.error || "Failed to load users");
        }
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-gray-500">Loading users...</div>
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

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      ADMIN: "bg-red-100 text-red-700",
      MANAGER: "bg-amber-100 text-amber-700",
      VIEWER: "bg-green-100 text-green-700",
    };
    return colors[role] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 mt-1">{users.length} team members in your organization.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {["ADMIN", "MANAGER", "VIEWER"].map((role) => {
          const count = users.filter((u) => u.role === role).length;
          return (
            <div key={role} className="bg-white rounded-lg border p-4">
              <div className="text-sm text-gray-500">{role}s</div>
              <div className="text-2xl font-bold text-gray-900">{count}</div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-gray-500">
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Email</th>
              <th className="px-6 py-3 font-medium">Role</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Last Login</th>
              <th className="px-6 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{u.name}</td>
                <td className="px-6 py-4 text-gray-600">{u.email}</td>
                <td className="px-6 py-4">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadge(u.role)}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 text-xs ${u.isActive ? "text-green-600" : "text-gray-400"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${u.isActive ? "bg-green-500" : "bg-gray-300"}`}></span>
                    {u.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-400 text-xs">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Never"}
                </td>
                <td className="px-6 py-4 text-gray-400 text-xs">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
