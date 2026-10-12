# INFYPOS Production Risk Register

**Document Version:** 1.0.0  
**Audit Date:** 2026-10-12  
**Review Standard:** OWASP Top 10, CWE / SANS Top 25, Financial Accounting & Retail EPOS Compliance  

---

## Executive Summary: Top Ten Critical Release Risks

1. **[SEC-01] Critical SQL Injection in Inventory Reporting (`$queryRawUnsafe`)**
2. **[SEC-02] Cross-Tenant Account Takeover & Data Leakage via `/api/v1/tenants`**
3. **[SEC-03] Plaintext Cashier PIN Storage in Database & API Exposure**
4. **[FIN-01] Unvalidated Payment Tender Sums Allowing Zero / Arbitrary Payment Checkout**
5. **[FIN-02] Arbitrary Discount Injection Leading to Negative Invoice Grand Totals**
6. **[SEC-04] Reusable Refresh Tokens Without Rotation or Invalidation on Refresh**
7. **[DB-01] Desynchronized Database Migration State (20+ Tables Missing Migrations)**
8. **[OPS-01] Complete Absence of Automated Business Logic Tests & CI/CD Pipeline**
9. **[SEC-05] Broken Inactive User Revocation (JWTs Bypassing Status Invalidation)**
10. **[NET-01] Production CORS Configuration Blocking Frontend Requests**

---

## Detailed Risk Register

### SEC-01: Critical SQL Injection in Inventory Reporting
- **Severity:** Critical (CVSS 9.8)
- **Confidence:** Confirmed
- **Affected Component:** `backend/src/modules/reports/reports.service.ts` (lines 271–296)
- **Evidence & Reproduction:**
  ```typescript
  // reports.service.ts line 274:
  if (search) whereQuery += ` AND (p."name" ILIKE '%${search}%' OR p."sku" ILIKE '%${search}%')`;
  const itemsRaw = await this.prisma.$queryRawUnsafe(`... ${whereQuery} ...`);
  ```
  Sending `GET /api/v1/reports/inventory?search=' UNION SELECT ... --` executes raw unparameterized SQL against PostgreSQL.
- **Business Impact:** Full database exfiltration, cross-tenant data theft, or data destruction.
- **Recommended Correction:** Refactor to parameterized `this.prisma.$queryRaw` with `Prisma.sql` or use standard Prisma Client `findMany` queries.
- **Regression Test:** Integration test passing SQL injection payloads (`'; DROP TABLE...`, `1' OR '1'='1`) verifying rejection or literal escaping.
- **Status:** OPEN (Pending Approval)

---

### SEC-02: Cross-Tenant Data Exposure via `/api/v1/tenants`
- **Severity:** Critical (CVSS 9.1)
- **Confidence:** Confirmed
- **Affected Component:** `backend/src/common/guards/permissions.guard.ts` (line 35) & `backend/src/modules/tenants/tenants.controller.ts`
- **Evidence & Reproduction:**
  `PermissionsGuard` line 35 checks `if (user.roleCode === 'SUPER_ADMIN' || user.roleCode === 'OWNER') return true;`. Any merchant who signs up has `roleCode === 'OWNER'`. Because `TenantsController` protects its routes with `@Permissions('system.tenants.manage')`, any tenant owner automatically bypasses the guard. `tenants.service.ts` methods (`findAll`, `findOne`, `update`, `remove`) do not filter by caller's `tenantId`.
- **Business Impact:** Merchant A can query all registered merchants on INFYPOS, read their company details, change their settings, or deactivate their stores.
- **Recommended Correction:** Restrict `TenantsController` strictly to `SUPER_ADMIN`, and create a separate `/tenant/me` endpoint scoped to `user.tenantId` for merchant owners.
- **Regression Test:** Request `GET /api/v1/tenants` as a tenant owner and assert HTTP 403 Forbidden.
- **Status:** OPEN (Pending Approval)

---

### SEC-03: Plaintext Cashier PIN Storage & Cleartext API Exposure
- **Severity:** High (CVSS 8.2)
- **Confidence:** Confirmed
- **Affected Component:** `backend/src/modules/users/users.service.ts` (lines 90, 162, 227) & `backend/prisma/schema.prisma`
- **Evidence & Reproduction:**
  `schema.prisma` contains `pinCode String? @map("pin_code") @db.VarChar(10)`. When users are created or updated, plaintext `pinCode` is saved into the database alongside `pinCodeHash`. Calling `GET /api/v1/users` or `GET /api/v1/users/:id` returns `pinCode: "1234"` in the JSON response.
- **Business Impact:** Any staff member with access to user viewing can steal cashier PIN codes and clock in or make unauthorized till transactions under their identity.
- **Recommended Correction:** Remove cleartext `pinCode` column from database. Store only `pinCodeHash`. Never return plaintext PINs in user responses.
- **Regression Test:** Assert `pinCode` is not present in `findMany` or `findOne` user query results.
- **Status:** OPEN (Pending Approval)

---

### FIN-01: Unvalidated Payment Tender Sums During Sale Checkout
- **Severity:** High (CVSS 8.5)
- **Confidence:** Confirmed
- **Affected Component:** `backend/src/modules/sales/sales.service.ts` (lines 250–260)
- **Evidence & Reproduction:**
  `createSale` accepts `dto.payments`. While cart grand total is recomputed, the server does not verify that `SUM(payment.amount) === grandTotal`. An API client can submit a sale of £500 with `dto.payments: [{ paymentMethod: 'CASH', amount: 0.01 }]`, and the sale is recorded as `status: COMPLETED`.
- **Business Impact:** Fraudulent checkout completion, till ledger imbalance, loss of stock without payment.
- **Recommended Correction:** Add strict validation ensuring `payments.reduce((acc, p) => acc.add(p.amount), new Decimal(0)).equals(grandTotal)`.
- **Regression Test:** Submit sale with payment amount less than grand total; assert HTTP 400 BadRequestException (`Total payments do not equal grand total`).
- **Status:** OPEN (Pending Approval)

---

### FIN-02: Unbounded Discount Injection Permitting Negative Invoices
- **Severity:** High (CVSS 7.5)
- **Confidence:** Confirmed
- **Affected Component:** `backend/src/modules/sales/sales.service.ts` (lines 220–222)
- **Evidence & Reproduction:**
  `const discountAmount = dto.discountAmount ? new Prisma.Decimal(dto.discountAmount) : new Prisma.Decimal(0);`
  `const grandTotal = subtotal.add(taxAmount).sub(discountAmount);`
  No check ensures `discountAmount.lte(subtotal)` or `grandTotal.gte(0)`.
- **Business Impact:** Malicious or erroneous negative sales totals corrupting financial reporting, tax returns, and shift cash accounting.
- **Recommended Correction:** Require `discountAmount <= subtotal` and ensure `grandTotal >= 0`. Restrict discounts above a store threshold to managerial approval.
- **Regression Test:** Submit sale with discount greater than subtotal; assert HTTP 400 BadRequest.
- **Status:** OPEN (Pending Approval)

---

### SEC-04: Reusable Refresh Tokens Without Rotation
- **Severity:** High (CVSS 7.4)
- **Confidence:** Confirmed
- **Affected Component:** `backend/src/modules/auth/auth.service.ts` (lines 149–209)
- **Evidence & Reproduction:**
  In `AuthService.refresh`, the token is looked up in `RefreshToken` table and validated. However, the existing token is NEVER revoked or rotated. The same refresh token can be used indefinitely until `expiresAt` (7 days).
- **Business Impact:** If a refresh token is leaked or intercepted, an attacker maintains persistent access for up to 7 days even if the legitimate client refreshes.
- **Recommended Correction:** Implement Refresh Token Rotation (RTR): revoke the used token immediately upon refresh and issue a brand-new refresh token.
- **Regression Test:** Replay a used refresh token and assert HTTP 401 Unauthorized.
- **Status:** OPEN (Pending Approval)

---

### DB-01: Untracked Schema Migrations Across Core Business Models
- **Severity:** High (CVSS 7.8)
- **Confidence:** Confirmed
- **Affected Component:** `backend/prisma/migrations`
- **Evidence & Reproduction:**
  Only 2 migration folders exist in `backend/prisma/migrations`, covering only identity models. Over 20 models (`Product`, `Sale`, `Inventory`, `Shift`, `StockMovement`, etc.) were created with `prisma db push` and lack versioned SQL migrations.
- **Business Impact:** Deploying to a fresh production database via `prisma migrate deploy` will fail or leave the database incomplete. Production schema drift cannot be safely audited or rolled back.
- **Recommended Correction:** Generate a clean baseline migration using `npx prisma migrate diff` against the active schema.
- **Regression Test:** Run `prisma migrate deploy` against an empty disposable PostgreSQL container and verify all 26 tables are created.
- **Status:** BLOCKED (Requires disposable DB environment)

---

### OPS-01: Missing Automated Test Scripts & CI/CD Release Gates
- **Severity:** High (CVSS 7.0)
- **Confidence:** Confirmed
- **Affected Component:** Monorepo root & `backend/package.json`
- **Evidence & Reproduction:**
  `backend/package.json` has no `test` script (`npm test` returns error). No GitHub Actions workflow files exist in the repository.
- **Business Impact:** Zero regression protection. Any code push can silently break checkout, inventory deduction, or authentication without detection before deployment.
- **Recommended Correction:** Configure Jest unit & e2e test scripts in `backend/package.json`. Add `.github/workflows/ci.yml` running lint, build, and tests on every commit.
- **Regression Test:** `npm test` runs and passes with >80% critical business logic coverage.
- **Status:** OPEN (Pending Approval)

---

### SEC-05: Inactive Account Session Persistence
- **Severity:** Medium (CVSS 6.5)
- **Confidence:** Confirmed
- **Affected Component:** `backend/src/modules/auth/strategies/jwt.strategy.ts` (lines 16–18)
- **Evidence & Reproduction:**
  `JwtStrategy.validate(payload)` returns `payload` directly without querying the database. If an employee is terminated or tenant suspended, existing JWTs remain fully active until the 15-minute token expiry.
- **Business Impact:** Terminated employees can perform unauthorized transactions or exfiltrate data during the active token window.
- **Recommended Correction:** Add database lookup or cached active user status check in `JwtStrategy` or `PermissionsGuard`.
- **Regression Test:** Set user status to `INACTIVE` in database; assert subsequent API requests with active token are rejected with HTTP 403.
- **Status:** OPEN (Pending Approval)

---

### NET-01: Broken Production CORS Setting
- **Severity:** Medium (CVSS 6.0)
- **Confidence:** Confirmed
- **Affected Component:** `backend/src/main.ts` (lines 31–37)
- **Evidence & Reproduction:**
  `app.enableCors({ origin: process.env.NODE_ENV === 'production' ? [configService.get('app.frontendUrl', '')] : '*' })`. In production, if `FRONTEND_URL` is empty, origin is `['']`, blocking all browser requests.
- **Business Impact:** Production deployment will suffer immediate total outage for browser-based admin dashboard and POS terminal.
- **Recommended Correction:** Support comma-separated origins from `ALLOWED_ORIGINS` environment variable with proper fallback validation.
- **Regression Test:** Make preflight `OPTIONS` request with production origin and assert HTTP 204 with `Access-Control-Allow-Origin`.
- **Status:** OPEN (Pending Approval)
