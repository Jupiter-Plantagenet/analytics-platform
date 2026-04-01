# AnalyticsPro -- Enterprise Multi-Tenant Analytics Platform

A production-grade analytics platform demonstrating full-stack engineering with multi-tenancy, role-based access control, and interactive dashboards.

## Architecture

```
Client (Next.js App Router)
  |
  +-- Landing / Login page
  +-- Dashboard (charts, metrics, activity feed)
  |
  +-- API Layer (Next.js Route Handlers)
  |     |-- /api/auth       JWT login & registration
  |     |-- /api/analytics   Dashboard data (tenant-scoped)
  |     |-- /api/tenants     Tenant management
  |     |
  |     +-- Middleware: withAuth() -- authentication + RBAC
  |
  +-- Data Layer
        |-- Prisma ORM
        |-- PostgreSQL 16
        +-- Tenant isolation via tenant_id on every query
```

### Key Design Decisions

- **Multi-tenancy via shared database** -- All tenants share one PostgreSQL instance; isolation is enforced by filtering every query on `tenant_id`. This keeps operational costs low while providing strong data boundaries.
- **JWT-based stateless auth** -- Tokens carry `role` and `tenantId` claims. The server verifies on every request; no session store is needed.
- **RBAC permission matrix** -- Three roles (Admin, Manager, Viewer) mapped to 12 fine-grained permissions. Both server middleware and client-side `<RoleGuard>` use the same matrix.
- **Server Components + Route Handlers** -- Built on Next.js 14 App Router patterns. API routes use the `withAuth()` higher-order function for clean, composable security.

## Tech Stack

| Layer       | Technology                         |
|-------------|-------------------------------------|
| Frontend    | Next.js 14, React 18, TypeScript   |
| Styling     | Tailwind CSS                       |
| Charts      | Recharts                           |
| Backend     | Next.js Route Handlers             |
| Database    | PostgreSQL 16                      |
| ORM         | Prisma 5                           |
| Auth        | JWT (jsonwebtoken) + bcrypt        |
| Validation  | Zod                                |
| Testing     | Jest, ts-jest                      |
| CI/CD       | GitHub Actions                     |
| Container   | Docker, Docker Compose             |

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (for the database)

### Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL
docker compose up -d postgres

# 3. Configure environment
cp .env.example .env

# 4. Run migrations and generate Prisma client
npx prisma migrate dev --name init
npx prisma generate

# 5. Seed the database with demo data
npm run db:seed

# 6. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the demo credentials.

### Docker (Full Stack)

```bash
docker compose up --build
```

This starts both PostgreSQL and the Next.js application.

## Demo Credentials

All demo users share the same password: **`demo-password-123`**

| Tenant            | Admin                       | Manager                       | Viewer                       |
|-------------------|-----------------------------|-------------------------------|------------------------------|
| Acme Corporation  | admin@acme-corp.com         | manager@acme-corp.com         | viewer@acme-corp.com         |
| Startup Labs      | admin@startup-labs.com      | manager@startup-labs.com      | viewer@startup-labs.com      |
| Freelance Studio  | admin@freelance-studio.com  | manager@freelance-studio.com  | viewer@freelance-studio.com  |

## RBAC Permission Matrix

| Permission         | Admin | Manager | Viewer |
|--------------------|:-----:|:-------:|:------:|
| analytics:read     |  Yes  |   Yes   |  Yes   |
| analytics:write    |  Yes  |   Yes   |   --   |
| analytics:delete   |  Yes  |    --   |   --   |
| users:read         |  Yes  |   Yes   |   --   |
| users:write        |  Yes  |   Yes   |   --   |
| users:delete       |  Yes  |    --   |   --   |
| tenants:read       |  Yes  |   Yes   |  Yes   |
| tenants:write      |  Yes  |    --   |   --   |
| tenants:delete     |  Yes  |    --   |   --   |
| metrics:read       |  Yes  |   Yes   |  Yes   |
| metrics:write      |  Yes  |   Yes   |   --   |
| metrics:export     |  Yes  |   Yes   |   --   |

## Project Structure

```
src/
  app/
    layout.tsx              Root layout with global styles
    page.tsx                Landing page with login/register form
    dashboard/
      layout.tsx            Dashboard shell (sidebar, top bar)
      page.tsx              Main dashboard with charts and metrics
    api/
      auth/route.ts         Login and registration endpoints
      analytics/route.ts    Dashboard data (GET) and event tracking (POST)
      tenants/route.ts      Tenant info and management
  lib/
    db.ts                   Prisma client singleton
    auth.ts                 JWT + bcrypt utilities
    rbac.ts                 Permission matrix and withAuth middleware
  components/
    DashboardChart.tsx      Revenue and user growth charts (Recharts)
    Sidebar.tsx             Collapsible navigation sidebar
    TenantSelector.tsx      Multi-tenant switcher dropdown
    RoleGuard.tsx           Client-side RBAC wrapper component
  types/
    index.ts                Shared TypeScript type definitions
prisma/
  schema.prisma             Database schema (Tenant, User, AnalyticsEvent, Metric)
  seed.ts                   Seed script with 3 tenants and 12 months of data
__tests__/
  auth.test.ts              Password hashing, JWT, request authentication
  rbac.test.ts              Permission checks, tenant isolation, role hierarchy
  api.test.ts               API middleware integration tests
```

## Testing

```bash
# Run all tests with coverage
npm test

# Watch mode
npm run test:watch
```

Tests cover:
- Password hashing and verification
- JWT generation, verification, and expiry handling
- Request authentication extraction
- RBAC permission matrix for all three roles
- Tenant isolation enforcement
- API middleware (401/403 response handling)
- Role hierarchy validation (Viewer < Manager < Admin)

## API Reference

### POST /api/auth

**Login:**
```json
{
  "action": "login",
  "email": "admin@acme-corp.com",
  "password": "demo-password-123",
  "tenantSlug": "acme-corp"
}
```

**Register:**
```json
{
  "action": "register",
  "email": "new@acme-corp.com",
  "password": "SecurePass1",
  "name": "New User",
  "tenantSlug": "acme-corp"
}
```

### GET /api/analytics

Requires: `Authorization: Bearer <token>`, permission `analytics:read`

Returns dashboard data: metric cards, revenue chart, user growth, recent activity.

### GET /api/tenants

Requires: `Authorization: Bearer <token>`, permission `tenants:read`

Returns current tenant details and usage counts.

### PUT /api/tenants

Requires: `Authorization: Bearer <token>`, permission `tenants:write`

Update tenant name or plan.

## License

MIT
