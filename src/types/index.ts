// ─── Authentication ─────────────────────────────────────────────────────────

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string;
  tenantSlug: string;
}

export interface AuthTokens {
  accessToken: string;
  expiresAt: number;
}

export interface LoginRequest {
  email: string;
  password: string;
  tenantSlug: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  tenantSlug: string;
}

// ─── RBAC ───────────────────────────────────────────────────────────────────

export type UserRole = "ADMIN" | "MANAGER" | "VIEWER";

export type Permission =
  | "analytics:read"
  | "analytics:write"
  | "analytics:delete"
  | "users:read"
  | "users:write"
  | "users:delete"
  | "tenants:read"
  | "tenants:write"
  | "tenants:delete"
  | "metrics:read"
  | "metrics:write"
  | "metrics:export";

export interface RolePermissions {
  [role: string]: Permission[];
}

// ─── Tenant ─────────────────────────────────────────────────────────────────

export type TenantPlan = "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  isActive: boolean;
}

// ─── Analytics ──────────────────────────────────────────────────────────────

export type EventType =
  | "PAGE_VIEW"
  | "CLICK"
  | "CONVERSION"
  | "SIGNUP"
  | "PURCHASE"
  | "API_CALL"
  | "ERROR"
  | "CUSTOM";

export type MetricCategory =
  | "REVENUE"
  | "USERS"
  | "ENGAGEMENT"
  | "PERFORMANCE"
  | "CONVERSION";

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface MetricCard {
  name: string;
  value: number;
  unit: string;
  change: number; // percentage change from previous period
  trend: "up" | "down" | "flat";
  category: MetricCategory;
}

export interface AnalyticsOverview {
  totalRevenue: MetricCard;
  activeUsers: MetricCard;
  conversionRate: MetricCard;
  avgSessionDuration: MetricCard;
}

export interface RevenueChartData {
  month: string;
  revenue: number;
  target: number;
}

export interface UserGrowthData {
  month: string;
  newUsers: number;
  totalUsers: number;
}

export interface ActivityEntry {
  id: string;
  type: EventType;
  name: string;
  value: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface DashboardData {
  overview: AnalyticsOverview;
  revenueChart: RevenueChartData[];
  userGrowth: UserGrowthData[];
  recentActivity: ActivityEntry[];
}

// ─── API ────────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
