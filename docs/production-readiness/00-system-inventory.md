# INFYPOS System Inventory & Architecture Audit

**Document Version:** 1.0.0  
**Audit Date:** 2026-10-12  
**Auditor:** Principal Software Architect & Production-Readiness Auditor  

---

## 1. Repository Identity & Working Environment

- **Repository Path:** `c:\Users\acer\Document\Infynux\INFYPOS`
- **Active Git Branch:** `main` (tracked with `origin/main`)
- **Current Head Commit:** `a47a076` (*Set entire INFEPOS logo text including middle bar of E to solid white in hero section*)
- **Working Tree State:** Dirty (31 uncommitted files undergoing active feature development / styling enhancements by user)
  - *Backend uncommitted changes:* `backend/src/app.module.ts`, `backend/src/modules/products/products.controller.ts`, `backend/src/modules/products/products.service.ts` (Soft delete, permanent delete validation, product restoration).
  - *Frontend uncommitted changes:* Branding assets, logo SVGs, modal styling in `INFEPOS_FRONTEND/admin-dashboard`, `pos-terminal`.
  - *Safety Policy Compliance:* All uncommitted changes preserved intact.
- **Node.js Runtime Target:** Node >= 20.x LTS
- **Package Manager:** npm (v10.x)

---

## 2. Monorepo & Technology Stack Architecture

| Component | Framework / Technology | Language / Version | Ports / Entry Point | Production Build Tool |
| :--- | :--- | :--- | :--- | :--- |
| **Backend API Engine** | NestJS 10.3 / Express 4.17 | TypeScript 5.3.3 | `http://localhost:3000/api/v1` | `nest build` (tsc) |
| **Database & ORM** | PostgreSQL 17 / Prisma ORM 5.10.0 | SQL / Prisma Schema | Port 5432 / Prisma Client | `npx prisma generate` |
| **Admin Dashboard** | React 19.2.8 + Vite 8.3.0 | TypeScript 6.0.2 / React Router 7 | Port 5173 / Web | `tsc -b && vite build` |
| **POS Terminal** | React 19.2.8 + Vite 8.3.1 + Electron 44.5 | TypeScript 6.0.2 / SQLite3 | Desktop / Electron App | `tsc -b && vite build` |
| **Secondary Backend** | `infepos-backend` (Stale / legacy fork) | TypeScript 5.3.3 | Redundant / Divergent | Superseded by `backend` |

> [!NOTE]
> The workspace contains both `backend` and `infepos-backend`. Analysis of Git commit history and route usage shows that `backend` is the active, feature-complete API engine (with 30 active modules, audit logging, AWS integration, and full reports), whereas `infepos-backend` is a divergent legacy fork with missing payments and stripped services.

---

## 3. Database Schema & Migration Inventory

- **Engine:** PostgreSQL 17 (Containerized in `docker/docker-compose.yml`)
- **ORM:** Prisma Client 5.10.0 (`backend/prisma/schema.prisma` - 1,017 lines)
- **Active Models (26):**
  - Identity & Tenancy: `Tenant`, `Store`, `Role`, `Permission`, `RolePermission`, `User`, `RefreshToken`
  - Catalog & Inventory: `Product`, `Inventory`, `StockMovement`, `InventoryAdjustment`, `InventoryAdjustmentItem`, `StockTransfer`, `StockTransferItem`
  - Sales & Checkout: `Sale`, `SaleItem`, `Payment`, `SaleReturn`, `SaleReturnItem`
  - Procurement: `Supplier`, `Purchase`, `PurchaseItem`, `GoodsReceipt`, `GoodsReceiptItem`
  - Operations & CRM: `Shift`, `Customer`, `SyncEvent`, `AuditLog`, `AuthorizedCustomer`, `OtpCode`, `DownloadLog`
- **Migration History (`backend/prisma/migrations`):**
  - `20260805050817_init_identity`: Initial tables (`tenants`, `stores`, `roles`, `permissions`, `role_permissions`, `users`).
  - `20260805062132_add_refresh_token_model`: Added `refresh_tokens` table.
  - *Discrepancy:* Migration directory only contains migrations for identity tables! Subsequent business tables (`products`, `sales`, `inventory`, `shifts`, `sync_events`) were synchronized directly via `prisma db push` without formal version-controlled migration files.

---

## 4. API Route Inventory (`/api/v1`)

| Module Path | Controller | Guard Enforcement | Permission Keys |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth/login` | `AuthController.login` | Public | None |
| `/api/v1/auth/refresh` | `AuthController.refresh` | Public | None |
| `/api/v1/tenants` | `TenantsController` | `JwtAuthGuard, PermissionsGuard` | `system.tenants.manage` |
| `/api/v1/stores` | `StoresController` | `JwtAuthGuard, PermissionsGuard` | `stores.read`, `stores.create`, `stores.update`, `stores.delete` |
| `/api/v1/users` | `UsersController` | `JwtAuthGuard, PermissionsGuard` | `users.read`, `users.create`, `users.update`, `users.delete` |
| `/api/v1/users/cashiers/:storeId` | `UsersController` | `JwtAuthGuard` | None (Any authenticated user can fetch store cashier PIN hashes) |
| `/api/v1/roles` | `RolesController` | `JwtAuthGuard, PermissionsGuard` | `roles.read`, `roles.create`, `roles.update`, `roles.delete` |
| `/api/v1/permissions` | `PermissionsController` | `JwtAuthGuard, PermissionsGuard` | `permissions.read` |
| `/api/v1/products` | `ProductsController` | `JwtAuthGuard, PermissionsGuard` | `products.read`, `products.create`, `products.update`, `products.delete` |
| `/api/v1/inventory` | `InventoryController` | `JwtAuthGuard, PermissionsGuard` | `inventory.read`, `inventory.update` |
| `/api/v1/inventory-adjustments` | `InventoryAdjustmentsController` | `JwtAuthGuard, PermissionsGuard` | `inventory.update` |
| `/api/v1/stock-transfers` | `StockTransfersController` | `JwtAuthGuard, PermissionsGuard` | `inventory.update` |
| `/api/v1/sales` | `SalesController` | `JwtAuthGuard, PermissionsGuard` | `sales.read`, `sales.create` |
| `/api/v1/sales-returns` | `SalesReturnsController` | `JwtAuthGuard, PermissionsGuard` | `salesReturns.create`, `salesReturns.read` |
| `/api/v1/shifts` | `ShiftsController` | `JwtAuthGuard, PermissionsGuard` | `shifts.open`, `shifts.close`, `shifts.xreport`, `shifts.zreport` |
| `/api/v1/customers` | `CustomersController` | `JwtAuthGuard, PermissionsGuard` | `customers.read`, `customers.create`, `customers.update`, `customers.delete` |
| `/api/v1/suppliers` | `SuppliersController` | `JwtAuthGuard, PermissionsGuard` | `suppliers.read`, `suppliers.create`, `suppliers.update`, `suppliers.delete` |
| `/api/v1/purchases` | `PurchasesController` | `JwtAuthGuard, PermissionsGuard` | `purchases.read`, `purchases.create`, `purchases.update`, `purchases.delete` |
| `/api/v1/goods-receipts` | `GoodsReceiptsController` | `JwtAuthGuard, PermissionsGuard` | `goodsReceipts.read`, `goodsReceipts.create` |
| `/api/v1/payments` | `PaymentsController` | `JwtAuthGuard, PermissionsGuard` | `sales.read` |
| `/api/v1/dashboard` | `DashboardController` | `JwtAuthGuard, PermissionsGuard` | `dashboard.read` |
| `/api/v1/reports` | `ReportsController` | `JwtAuthGuard, PermissionsGuard` | `reports.read` |
| `/api/v1/sync` | `SyncController` | `JwtAuthGuard, PermissionsGuard` | `sales.create` |
| `/api/v1/v1/portal/download` | `CustomerPortalPublicController` | `ThrottlerGuard` | Public (Contains double `v1` prefix bug) |
| `/api/v1/health` | `HealthController` | Public | None |

---

## 5. Security & Authentication Controls

- **Password Hashing:** `bcrypt` with configurable rounds (`BCRYPT_SALT_ROUNDS=12`).
- **Access Tokens:** JWT with 15-minute expiration (`JWT_ACCESS_EXPIRES=15m`), signed via HMAC-SHA256 (`jwt.secret`).
- **Refresh Tokens:** Database-persisted SHA-256 hashed refresh tokens (`RefreshToken` table) with 7-day expiration (`jwt.refreshExpiresIn`).
- **Authorization:** `PermissionsGuard` checking user role code (`SUPER_ADMIN`, `OWNER` bypasses) and database-backed `RolePermission` entries.
- **Rate Limiting:** `ThrottlerModule` configured globally at 300 requests/minute, with tighter rate limits (5-10/min) on OTP endpoints.
- **Security Headers:** `helmet()` loaded globally in `backend/src/main.ts`.

---

## 6. Testing, Quality & CI/CD Status

- **Automated Unit / Integration Tests:** Negligible. Only default NestJS `health.controller.spec.ts` exists.
- **E2E Tests:** Skeleton `test/app.e2e-spec.ts` testing HTTP 200 on root. No checkout, stock deduction, shift, or tenant tests.
- **Package.json Test Scripts:** MISSING in `backend/package.json` (`npm test` fails with code 1).
- **CI / CD Pipelines:** NONE. No `.github/workflows` configurations exist in repo root or backend.
- **Linter Coverage:** Oxlint configured on frontends (0 errors, 82 warnings). ESLint configured on backend.

---

## 7. Storage, Integrations & Third-Party Dependencies

- **Document / Image Storage:** AWS S3 (`@aws-sdk/client-s3`) with pre-signed URL generation. Operates in simulation mode if credentials are unset.
- **Email Notifications:** AWS SES (`@aws-sdk/client-ses`). Operates in simulation mode if credentials are unset.
- **Payment Gateways:** No external merchant integration (Stripe, Worldpay, etc.). Till records manual tender selections (`CASH`, `CARD`, `OTHER`).
- **Backup Infrastructure:** None configured in repository scripts or cron jobs.
