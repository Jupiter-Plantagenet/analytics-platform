"use client";

import { useState, useRef, useEffect } from "react";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

interface TenantSelectorProps {
  tenants: Tenant[];
  currentTenantId: string;
  onSelect: (tenantId: string) => void;
}

export default function TenantSelector({
  tenants,
  currentTenantId,
  onSelect,
}: TenantSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentTenant = tenants.find((t) => t.id === currentTenantId);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const planColors: Record<string, string> = {
    FREE: "bg-gray-100 text-gray-700",
    STARTER: "bg-blue-100 text-blue-700",
    PROFESSIONAL: "bg-purple-100 text-purple-700",
    ENTERPRISE: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-colors hover:border-brand-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {/* Tenant avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-sm font-bold text-brand-700">
          {currentTenant?.name.charAt(0) ?? "?"}
        </div>
        <div className="text-left">
          <p className="font-medium text-gray-900">
            {currentTenant?.name ?? "Select tenant"}
          </p>
          {currentTenant && (
            <p className="text-xs text-gray-500">{currentTenant.slug}</p>
          )}
        </div>
        <svg
          className={`ml-2 h-4 w-4 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute left-0 z-50 mt-2 w-72 origin-top-left rounded-xl border border-gray-200 bg-white shadow-lg ring-1 ring-black ring-opacity-5"
          role="listbox"
        >
          <div className="p-2">
            <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Switch Tenant
            </p>
            {tenants.map((tenant) => (
              <button
                key={tenant.id}
                onClick={() => {
                  onSelect(tenant.id);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  tenant.id === currentTenantId
                    ? "bg-brand-50 text-brand-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
                role="option"
                aria-selected={tenant.id === currentTenantId}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-sm font-bold text-brand-700">
                  {tenant.name.charAt(0)}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">{tenant.name}</p>
                  <p className="text-xs text-gray-500">{tenant.slug}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    planColors[tenant.plan] ?? planColors.FREE
                  }`}
                >
                  {tenant.plan}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
