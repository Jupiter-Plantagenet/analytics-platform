"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TenantSelector from "@/components/TenantSelector";
import type { UserRole } from "@/types";

interface UserInfo {
  name: string;
  email: string;
  role: UserRole;
  tenantId: string;
  tenantSlug: string;
}

// Demo tenants for the selector (in production, fetched from API)
const DEMO_TENANTS = [
  { id: "demo-1", name: "Acme Corporation", slug: "acme-corp", plan: "ENTERPRISE" },
  { id: "demo-2", name: "Startup Labs", slug: "startup-labs", plan: "PROFESSIONAL" },
  { id: "demo-3", name: "Freelance Studio", slug: "freelance-studio", plan: "STARTER" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    // Decode JWT payload (no verification needed client-side -- the
    // server re-verifies on every API call)
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setUser({
        name: payload.name,
        email: payload.email,
        role: payload.role,
        tenantId: payload.tenantId,
        tenantSlug: payload.tenantSlug,
      });
    } catch {
      localStorage.removeItem("token");
      router.push("/");
    }
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("tokenExpiry");
    router.push("/");
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
          <TenantSelector
            tenants={DEMO_TENANTS}
            currentTenantId={DEMO_TENANTS.find((t) => t.slug === user.tenantSlug)?.id ?? DEMO_TENANTS[0].id}
            onSelect={(id) => {
              const tenant = DEMO_TENANTS.find((t) => t.id === id);
              if (tenant) {
                // In production this would re-authenticate with the new tenant
                console.log("Switched to tenant:", tenant.slug);
              }
            }}
          />

          <div className="flex items-center gap-4">
            {/* Role badge */}
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              {user.role}
            </span>

            {/* User info */}
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label="Sign out"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                />
              </svg>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
