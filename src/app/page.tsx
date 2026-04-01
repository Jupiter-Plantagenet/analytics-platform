"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type AuthMode = "login" | "register";

export default function LandingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    email: "admin@acme-corp.com",
    password: "demo-password-123",
    name: "",
    tenantSlug: "acme-corp",
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload: Record<string, string> = {
        email: form.email,
        password: form.password,
        tenantSlug: form.tenantSlug,
        action: mode,
      };
      if (mode === "register") {
        payload.name = form.name;
      }

      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Authentication failed");
        return;
      }

      // Store token (in production, use httpOnly cookies instead)
      localStorage.setItem("token", data.data.accessToken);
      localStorage.setItem("tokenExpiry", String(data.data.expiresAt));
      router.push("/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel -- branding */}
      <div className="hidden w-1/2 bg-brand-600 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div>
          <h1 className="text-3xl font-bold text-white">AnalyticsPro</h1>
          <p className="mt-2 text-brand-200">
            Enterprise Multi-Tenant Analytics Platform
          </p>
        </div>

        <div className="space-y-8">
          <Feature
            title="Multi-Tenant Architecture"
            description="Complete data isolation between tenants with row-level security."
          />
          <Feature
            title="Role-Based Access Control"
            description="Granular permissions across Admin, Manager, and Viewer roles."
          />
          <Feature
            title="Real-Time Analytics"
            description="Interactive dashboards with revenue, user growth, and conversion metrics."
          />
        </div>

        <p className="text-sm text-brand-300">
          Built with Next.js 14, PostgreSQL, Prisma, and TypeScript.
        </p>
      </div>

      {/* Right panel -- auth form */}
      <div className="flex w-full items-center justify-center px-8 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <h1 className="text-2xl font-bold text-brand-600">AnalyticsPro</h1>
          </div>

          <h2 className="text-2xl font-bold text-gray-900">
            {mode === "login" ? "Sign in to your account" : "Create an account"}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {mode === "login" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  onClick={() => setMode("register")}
                  className="font-medium text-brand-600 hover:text-brand-500"
                >
                  Register
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="font-medium text-brand-600 hover:text-brand-500"
                >
                  Sign in
                </button>
              </>
            )}
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {/* Tenant */}
            <div>
              <label htmlFor="tenantSlug" className="block text-sm font-medium text-gray-700">
                Organisation
              </label>
              <select
                id="tenantSlug"
                value={form.tenantSlug}
                onChange={(e) => setForm({ ...form, tenantSlug: e.target.value })}
                className="input-field mt-1"
              >
                <option value="acme-corp">Acme Corporation</option>
                <option value="startup-labs">Startup Labs</option>
                <option value="freelance-studio">Freelance Studio</option>
              </select>
            </div>

            {/* Name (register only) */}
            {mode === "register" && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field mt-1"
                  placeholder="Jane Smith"
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field mt-1"
                placeholder="admin@acme-corp.com"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input-field mt-1"
                placeholder="********"
              />
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
            </button>
          </form>

          {/* Demo credentials hint */}
          <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Demo Credentials
            </p>
            <p className="mt-1 text-sm text-gray-600">
              <span className="font-medium">Password:</span> demo-password-123
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Emails:</span> admin@ | manager@ | viewer@
              &lt;tenant-slug&gt;.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500">
        <svg
          className="h-5 w-5 text-white"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <div>
        <h3 className="font-semibold text-white">{title}</h3>
        <p className="mt-1 text-sm text-brand-200">{description}</p>
      </div>
    </div>
  );
}
