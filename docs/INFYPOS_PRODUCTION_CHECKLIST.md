# INFYPOS — Production Readiness Checklist

**Status Legend:**
* `[x]` **Verified and Passed:** Implementation verified against source code, schema, and tests.
* `[!]` **Failed / Requires Correction:** Critical defect or security vulnerability identified; must be fixed before production.
* `[~]` **Partially Implemented:** Functional in some areas, but incomplete or deficient in others.
* `[ ]` **Not Verified / Not Implemented:** Capability does not exist in codebase or could not be verified.

---

## 1. Architecture and Modularity
- [x] **Backend Module Separation:** Clean NestJS feature modules for Auth, Products, Sales, Shifts, Inventory, Stores, Tenants, Sync. (Ref: Audit Section B)
- [~] **Monorepo Hygiene:** `backend/` is actively maintained, but duplicate historical directory `infepos-backend/` remains in repository root. (Ref: Audit Section A)
- [!] **Client Base URL Consistency:** `pos-terminal/src/api/client.ts` uses `/api/v1` default baseURL, but `admin-dashboard/src/api/client.ts` defaults to port 3000 without `/api/v1`. (Ref: Audit Issue 1 & Section 7)
- [x] **Graceful Shutdown:** `app.enableShutdownHooks()` enabled in `main.ts` for clean Docker container lifecycle. (Ref: `backend/src/main.ts:102`)
- [x] **Global Route Prefix:** Global API versioning prefix (`api/v1`) configured in `main.ts:20`.

---

## 2. Authentication and Authorization
- [x] **Password Hashing:** Passwords hashed with bcrypt using 12 salt rounds via `PasswordService`. (Ref: `backend/src/modules/auth/services/password.service.ts`)
- [x] **Refresh Token Rotation:** Refresh tokens rotated atomically with interactive transactions and SHA-256 hash storage. (Ref: `backend/src/modules/auth/auth.service.ts:216`)
- [x] **Stolen Refresh Token Revocation:** Replay of a rotated token after the 15-second grace window triggers immediate invalidation of the user's entire session family. (Ref: `backend/src/modules/auth/auth.service.ts:238`)
- [x] **JWT Secret Security & Environment Isolation:** Fallback hardcoded defaults removed. NODE_ENV explicitly required; production and staging enforce 32+ char secrets, reject whitespace, patterns, and dev dummy secrets, and enforce 3-way pairwise distinctness. Docker compose maps RESET_PASSWORD_SECRET. (Ref: Audit Issue 3, REM-03)
- [!] **Cashier PIN Hash Exposure:** `pinCodeHash` (bcrypt) is returned in `GET /users` and `GET /users/cashiers/:storeId`, allowing 4-digit PINs to be cracked offline in seconds. (Ref: Audit Issue 7)
- [x] **Privilege Escalation via Sync Hardened:** `POST /api/v1/sync` preflight check rejects `CASHIER_PIN_RESET` with authentic HTTP 403 Forbidden, logs security violation to `AuditLog`, and deletes user mutation from sync. PIN resets exclusively channeled through `POST /users/:id/reset-pin` (`users.update`). (Ref: Audit Issue 2, REM-02)
- [x] **Tenant Boundary Enforcement:** `PermissionsGuard` enforces tenant ID matching and prevents `OWNER` from accessing system platform administration routes. (Ref: `backend/src/common/guards/permissions.guard.ts:40`)
- [x] **Customer Portal OTP Security:** 6-digit OTPs hashed with bcrypt, limited to 3 verification attempts, and expire in 10 minutes with account enumeration prevention. (Ref: `backend/src/modules/customer-portal/customer-portal.service.ts:102-160`)

---

## 3. POS Sales and Billing Logic
- [x] **Server-Side Price Authority:** Unit prices and VAT rates are fetched directly from database snapshot records; frontend-submitted prices are discarded. (Ref: `backend/src/modules/sales/sales.service.ts:254`)
- [x] **Discount Boundary Validation:** Discount amounts cannot be negative or exceed the invoice subtotal (`FIN-02`). (Ref: `backend/src/modules/sales/sales.service.ts:278`)
- [x] **Payment Tender Verification:** Sum of payment tenders must equal the grand total (`roundedTotalPaid.equals(roundedGrandTotal)`). Underpayment and overpayment are rejected (`FIN-01`). (Ref: `backend/src/modules/sales/sales.service.ts:314`)
- [x] **Sales Idempotency Key:** Tenant-scoped idempotency key enforced via unique database index `sales_tenant_id_idempotency_key_key`. (Ref: `backend/src/modules/sales/sales.service.ts:336`)
- [x] **Deterministic Request Payload Hashing:** SHA-256 hash of line items and amounts prevents parameter mutation under existing idempotency keys. (Ref: `backend/src/modules/sales/sales.service.ts:416`)
- [!] **Dynamic Currency Display:** POS UI hardcodes `£` symbol in `ReceiptView.tsx`, `CartPanel.tsx`, and `PaymentModal.tsx` regardless of `Store.currency`. (Ref: Audit Section D.2)

---

## 4. Payment Processing
- [x] **Manual Payment Tenders:** Cash, Card, UPI, and Bank Transfer manual recording supported. (Ref: `backend/src/modules/sales/sales.service.ts:349`)
- [ ] **EFT/POS Hardware Terminal Integration:** No integration with Verifone, Pax, Ingenico, Stripe Terminal, or Square Reader hardware. (Ref: Audit Section D.1)
- [ ] **Payment Gateway Integration:** No online payment gateway integration (Stripe, Adyen, Razorpay) with webhook confirmation. (Ref: Audit Section D.1)
- [x] **Split Tender Support:** Sales accept multiple payment records in a single checkout. (Ref: `backend/src/modules/sales/sales.service.ts:293`)

---

## 5. Inventory Management
- [x] **Atomic Stock Decrement:** `updateMany` with `quantityOnHand: { gte: quantity }` prevents race conditions and negative inventory for online checkouts. (Ref: `backend/src/modules/sales/sales.service.ts:212`)
- [x] **Stock Movement Audit Trail:** Every sale, return, adjustment, and transfer records `balanceBefore` and `balanceAfter` in `stock_movements`. (Ref: `backend/src/modules/sales/sales.service.ts:238`)
- [x] **Offline Sales Sync Recovery:** When `isSync === true`, physical inventory is decremented without `gte` constraint to reflect physical stock reality. (Ref: `backend/src/modules/sales/sales.service.ts:215`)
- [x] **Audit Trail Preservation during Bulk Delete:** `DELETE /api/v1/products/delete-all` strictly preserves historical `sale_items`, `sale_return_items`, `stock_movements`, and operational records. Rejects deletion with HTTP 400 if history exists, and relies on PostgreSQL `ON DELETE RESTRICT`. (Ref: Audit Issue 1, REM-01)

---

## 6. Returns and Refunds
- [x] **Original Sale Verification:** Returns require a valid `COMPLETED` sale. (Ref: `backend/src/modules/sales-returns/sales-returns.service.ts:64`)
- [x] **Quantity Ceiling Enforcement:** Return items validate that `requestQty <= (saleItem.quantity - returnedQuantity)`. (Ref: `backend/src/modules/sales-returns/sales-returns.service.ts:86`)
- [x] **Inventory Restoration:** Returned inventory is credited back to stock and creates a `SALE_RETURN` stock movement. (Ref: `backend/src/modules/sales-returns/sales-returns.service.ts:146`)
- [x] **Discount Apportionment:** Original invoice discounts are proportionally apportioned during partial returns. (Ref: `backend/src/modules/sales-returns/sales-returns.service.ts:192`)
- [!] **Return Number Concurrency Race:** `generateReturnNumber` uses naive `count() + 1`, failing unique constraint `P2002` under concurrent returns. (Ref: Audit Issue 8)

---

## 7. Shift and Cash Drawer Management
- [x] **Shift Open Float Tracking:** Starting cash float recorded on shift open. (Ref: `backend/src/modules/shifts/shifts.service.ts:104`)
- [x] **Cash Reconciliation Variance:** Declared cash compared against expected cash (float + cash sales - cash returns). (Ref: `backend/src/modules/shifts/shifts.service.ts:290`)
- [x] **Z-Report Generation & Sequential Numbering:** Immutable snapshot JSON saved with `storeId_zReportNumber` uniqueness and retry loop on collision. (Ref: `backend/src/modules/shifts/shifts.service.ts:298-343`)
- [!] **Single-Till Store Lockout:** `openShift` enforces `where: { tenantId, storeId, status: OPEN }`. Stores with multiple physical POS registers cannot operate simultaneously. (Ref: Audit Issue 5)

---

## 8. Database Integrity and Migrations
- [x] **Decimal Precision for Money:** Prices, subtotals, grand totals, and float amounts use `@db.Decimal(10, 2)`. (Ref: `backend/prisma/schema.prisma`)
- [x] **Transactional Boundaries:** Sales, returns, shift closures, and adjustments wrapped in atomic `$transaction` blocks.
- [x] **Foreign Key Referential Integrity:** Critical relations (`sale_items`, `shifts`, `stock_movements`) use `onDelete: Restrict` or `Cascade` appropriately.
- [!] **Migration Collision on Clean Database:** `0_init/migration.sql` conflicts with legacy migrations (`20260805...`), preventing `prisma migrate deploy` on empty databases. (Ref: Audit Issue 4)
- [!] **Unindexed Audit Log:** `AuditLog` table lacks a `tenantId` column, making tenant-scoped auditing and isolation impossible. (Ref: Audit Section B)

---

## 9. API Security and Hardening
- [x] **Global Validation Pipe:** `ValidationPipe` enabled with `whitelist: true, forbidNonWhitelisted: true, transform: true`. (Ref: `backend/src/main.ts:77`)
- [x] **Security Headers:** `helmet()` enabled globally. (Ref: `backend/src/main.ts:29`)
- [x] **Rate Limiting:** `ThrottlerModule` configured globally (300 requests/minute default; strict limits on OTP). (Ref: `backend/src/app.module.ts:49`)
- [x] **CORS Origin Validation:** Origin whitelist enforced in production with dynamic reflection in development. (Ref: `backend/src/main.ts:56`)
- [x] **Error Leakage Prevention:** `HttpExceptionFilter` intercepts unhandled exceptions, returning generic `'Internal server error'` (HTTP 500) without exposing stack traces. (Ref: `backend/src/common/filters/http-exception.filter.ts:42`)
- [~] **Request Size Limits:** Express JSON parser configured to 50MB (`main.ts:24`); excessively high for standard POS operations.

---

## 10. Frontend and Desktop Client
- [x] **Offline SQLite Storage:** POS terminal uses local SQLite for products, cashiers, and pending sync events. (Ref: `INFEPOS_FRONTEND/pos-terminal/electron/main.ts:21-65`)
- [x] **Responsive Admin Dashboard:** Modern Tailwind layout supporting all screen sizes.
- [!] **Unconditional Electron DevTools:** `mainWindow.webContents.openDevTools()` executed in packaged production builds. (Ref: Audit Issue 6)
- [!] **Offline Cashier PIN Cracking Risk:** Client executes `compareSync(pin, pinCodeHash)` in renderer process. (Ref: Audit Issue 7)
- [ ] **Native ESC/POS Thermal Printing:** Terminal relies on `window.print()` without direct serial/USB ESC/POS ESC/POS commands or cash drawer kick pulse. (Ref: Audit Section D.3)

---

## 11. Concurrency and Scalability
- [x] **Checkout Concurrency Protection:** Idempotency key and atomic inventory check eliminate double-charge and double-decrement risks. (Ref: `sales.service.ts:212,383`)
- [!] **Sequence Number Race Conditions:** `ADJ-`, `RET-`, `PO-`, `GRN-`, `TR-` numbering relies on `count() + 1` outside database locks. (Ref: Audit Issue 8)
- [~] **Shift Report Query Performance:** Shift X/Z reports fetch all sales and items via unbounded `findMany` into Node.js memory. (Ref: `shifts.service.ts:151`)

---

## 12. Logging, Monitoring, and Recovery
- [x] **Redacted HTTP Logging:** `LoggingInterceptor` logs method, URL, status code, and latency without logging sensitive request bodies or tokens. (Ref: `backend/src/common/interceptors/logging.interceptor.ts`)
- [x] **Database Health Endpoint:** `GET /api/v1/health` executes `SELECT 1` and reports database connectivity latency. (Ref: `backend/src/modules/health/health.service.ts:16`)
- [x] **Automated Database Backup Scripts:** `backup-db.sh` and `backup-db.ps1` execute compressed streaming `pg_dump` with S3 KMS integration and retention rotation. (Ref: `scripts/backup-db.sh`)
- [ ] **APM & Crash Reporting:** Sentry / Datadog / OpenTelemetry not configured. (Ref: Audit Section D.6)

---

## 13. Testing and Quality Assurance
- [x] **Backend Unit Regression Suite:** 38 tests pass in `backend/test/remediation-regression.spec.ts` covering refresh rotation, idempotency hashes, and permission guards.
- [!] **Zero Frontend Automated Tests:** No tests exist in `admin-dashboard` or `pos-terminal` (0 unit, 0 E2E). (Ref: Audit Section 12)
- [!] **Missing POS Workflow E2E Integration Tests:** No automated tests for complete multi-store cashier clock-in, checkout, split payment, and shift reconciliation.

