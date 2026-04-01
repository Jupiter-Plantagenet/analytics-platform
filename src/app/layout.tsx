import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AnalyticsPro - Enterprise Multi-Tenant Analytics",
  description:
    "Production-grade analytics platform with multi-tenancy, RBAC, and real-time dashboards.",
  keywords: ["analytics", "multi-tenant", "dashboard", "enterprise"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
