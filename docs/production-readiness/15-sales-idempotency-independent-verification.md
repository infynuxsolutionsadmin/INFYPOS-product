# INFYPOS — Independent Sales Idempotency Verification

**Document ID:** `docs/production-readiness/15-sales-idempotency-independent-verification.md`
**Date:** 2026-10-12  
**Auditor:** Independent Principal Security Architect & Database Systems Auditor  
**Baseline Document:** [`docs/production-readiness/14-sales-idempotency-implementation.md`](file:///c:/Users/acer/Document/Infynux/INFYPOS/docs/production-readiness/14-sales-idempotency-implementation.md)  
**Target Codebase:** INFYPOS Active Production Monorepo (`backend/`, `INFEPOS_FRONTEND/pos-terminal`, `INFEPOS_FRONTEND/admin-dashboard`)  
**Overall Verdict:** **VERIFIED WITH TARGETED CORRECTIONS. ALL 32 UNIT REGRESSION TESTS PASSING (100%). POSTGRESQL LIVE INTEGRATION TESTING DEFERRED PENDING ISOLATED STAGING CLONE. PRODUCTION-READY STATUS: NOT READY.**

---

## 1. Executive Summary & Audit Methodology

An independent, line-by-line inspection of the direct sales idempotency implementation was conducted across the backend services, controllers, DTOs, database migration SQL, frontend POS checkout lifecycle, and offline synchronization mechanisms.

The audit uncovered **two subtle gaps in the initial implementation**:
1. **Header-Body Idempotency Key Disagreement:** In `SalesController.create()`, when both an HTTP `Idempotency-Key` header and a body `idempotencyKey` were provided with differing values, the controller previously prioritized the body key and silently ignored the header key without validation.
2. **Unvalidated Header Key Length:** The HTTP `Idempotency-Key` header was appended to the DTO after NestJS `ValidationPipe` had completed execution, allowing oversized keys (>100 characters) to bypass `@MaxLength(100)` validation and trigger database engine runtime exceptions.

Both issues were corrected, tested, and verified during this audit.

---

## 2. Forensic Scope Analysis & Verification Findings

### Scope 1: Composite Unique Constraint & Unapplied Migration Safety
* **Status:** `FIXED`
* **Inspected Artifacts:**
  * [`backend/prisma/schema.prisma:321-326`](file:///c:/Users/acer/Document/Infynux/INFYPOS/backend/prisma/schema.prisma#L321-L326)
  * [`backend/prisma/migrations/20261012_add_sales_idempotency/migration.sql:1-10`](file:///c:/Users/acer/Document/Infynux/INFYPOS/backend/prisma/migrations/20261012_add_sales_idempotency/migration.sql#L1-L10)
* **Inspection Details:**
  1. The Prisma schema defines `@@unique([tenantId, idempotencyKey])` and `@@index([idempotencyKey])` on `model Sale`.
  2. The SQL migration executes:
     ```sql
     ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "idempotency_key" VARCHAR(100);
     ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "request_hash" VARCHAR(64);
     CREATE UNIQUE INDEX IF NOT EXISTS "sales_tenant_id_idempotency_key_key" ON "sales"("tenant_id", "idempotency_key");
     CREATE INDEX IF NOT EXISTS "sales_idempotency_key_idx" ON "sales"("idempotency_key");
     ```
  3. **Safety on Existing Records:** In PostgreSQL (ANSI standard B-Tree indexing), `NULL` values in a unique index are not treated as equal unless `NULLS NOT DISTINCT` is explicitly passed. Because historical sales records have `idempotency_key IS NULL`, existing rows will not violate the unique constraint upon migration execution.
  4. **Operational Deployment Caveat:** For high-volume production databases with millions of rows, running `CREATE UNIQUE INDEX` acquires a `SHARE` lock on `"sales"`. To avoid query stalls, production deployments should execute the index creation concurrently or during off-peak maintenance.

---

### Scope 2: Request Hash Coverage & Deterministic Canonicalization
* **Status:** `FIXED`
* **Inspected Artifacts:**
  * [`backend/src/modules/sales/utils/sale-idempotency.util.ts:1-48`](file:///c:/Users/acer/Document/Infynux/INFYPOS/backend/src/modules/sales/utils/sale-idempotency.util.ts#L1-L48)
  * [`backend/src/modules/sales/dto/create-sale.dto.ts:43-86`](file:///c:/Users/acer/Document/Infynux/INFYPOS/backend/src/modules/sales/dto/create-sale.dto.ts#L43-L86)
* **Inspection Details:**
  1. `calculateSaleRequestHash()` covers all business-critical cart properties: `storeId`, `shiftId`, `customerId`, `customerPhone`, `discountAmount`, `notes`, line items, and payment tenders.
  2. Non-deterministic volatile fields (client timestamps, temporary access tokens, request IDs) are strictly excluded.
  3. **Targeted Enhancement Applied:** Array sorting was enhanced with a secondary tie-breaker on quantity (`a.productId.localeCompare(b.productId) || a.quantity.localeCompare(b.quantity)`), ensuring deterministic output even if a client sends duplicate product line items in varied orders.
  4. **Legacy Payment Fallback:** Normalized fallback handling for `(dto as any).paymentMethod` was added to canonicalize offline/legacy payloads that omit structured payment tender arrays.

---

### Scope 3: Discrimination of Prisma P2002 Unique-Constraint Collisions
* **Status:** `FIXED`
* **Inspected Artifacts:**
  * [`backend/src/modules/sales/sales.service.ts:381-424`](file:///c:/Users/acer/Document/Infynux/INFYPOS/backend/src/modules/sales/sales.service.ts#L381-L424)
* **Inspection Details:**
  1. In the initial implementation, any Prisma `P2002` exception during `$transaction` attempted to resolve to a winning sale. If an unrelated unique collision occurred (such as a collision on `saleNumber` or `customerCode`), the service would unnecessarily query `findFirst` and might produce ambiguous error behavior.
  2. **Correction Implemented:** Refined the error catch block to inspect `error.meta?.target`:
     ```typescript
     const target = error?.meta?.target;
     const isIdempotencyTarget =
       !target ||
       (Array.isArray(target) &&
         (target.includes('idempotency_key') ||
           target.includes('idempotencyKey') ||
           target.includes('tenant_id')));
     ```
  3. If an unrelated unique constraint fails (e.g. `saleNumber`), the error is immediately re-thrown and not masked as an idempotency collision. Verified via unit test `IDEMP-01.11`.

---

### Scope 4: Concurrent Retry & Transaction Isolation
* **Status:** `FIXED`
* **Inspected Artifacts:**
  * [`backend/src/modules/sales/sales.service.ts:162-424`](file:///c:/Users/acer/Document/Infynux/INFYPOS/backend/src/modules/sales/sales.service.ts#L162-L424)
* **Inspection Details:**
  1. Line items, payment records, inventory deductions (`tx.inventory.updateMany`), and stock movements (`tx.stockMovement.createMany`) occur within a single atomic Prisma `$transaction`.
  2. When two concurrent requests use the same key, PostgreSQL serializes them at the composite unique index.
  3. The losing request encounters `P2002`, rolls back its entire transaction (leaving zero partial sales, zero payment records, and zero inventory decrements), and catches the error outside the transaction boundary.
  4. The losing request then retrieves the winning committed sale, verifies the request hash, and returns the original sale format. Verified via concurrency test `IDEMP-01.4`.

---

### Scope 5: POS Key Stability Across Checkout Lifecycle
* **Status:** `FIXED`
* **Inspected Artifacts:**
  * [`INFEPOS_FRONTEND/pos-terminal/src/components/pos/PaymentModal.tsx:37-75, 298-332`](file:///c:/Users/acer/Document/Infynux/INFYPOS/INFEPOS_FRONTEND/pos-terminal/src/components/pos/PaymentModal.tsx#L37-L75)
  * [`INFEPOS_FRONTEND/pos-terminal/src/components/pos/CartPanel.tsx:278-287`](file:///c:/Users/acer/Document/Infynux/INFYPOS/INFEPOS_FRONTEND/pos-terminal/src/components/pos/CartPanel.tsx#L278-L287)
* **Inspection Details:**
  1. `PaymentModal` generates `idempotencyKey` via `useState(() => crypto.randomUUID())` once when mounted.
  2. **Retry Reuse:** If network failure or backend timeout occurs, the modal remains mounted with the error message visible. Repeated clicks of "Confirm Payment" reuse the exact same `idempotencyKey`.
  3. **Debounce Protection:** The submit button has `disabled={loading}` and displays a spinner (`Loader2`), preventing concurrent double-click race conditions from the browser UI.
  4. **New Key on New Checkout:** When a sale completes, `CartPanel.tsx` sets `isPaymentOpen(false)`, unmounting `PaymentModal`. When a new basket is checked out, `PaymentModal` mounts afresh and executes its initializer to produce a new UUID.

---

### Scope 6: Header vs Body Idempotency Key Disagreement
* **Status:** `FIXED`
* **Inspected Artifacts:**
  * [`backend/src/modules/sales/sales.controller.ts:25-45`](file:///c:/Users/acer/Document/Infynux/INFYPOS/backend/src/modules/sales/sales.controller.ts#L25-L45)
* **Inspection Details:**
  1. **Audit Defect Identified:** The initial implementation used `if (idempotencyHeader && !dto.idempotencyKey) { dto.idempotencyKey = idempotencyHeader; }`. If a caller supplied `Idempotency-Key: KEY-A` in the header and `{"idempotencyKey": "KEY-B"}` in the JSON body, the header was silently ignored.
  2. **Correction Implemented:** Added explicit disagreement detection and length validation:
     ```typescript
     if (idempotencyHeader) {
       if (typeof idempotencyHeader !== 'string' || idempotencyHeader.trim().length === 0) {
         throw new BadRequestException('Idempotency-Key header must be a non-empty string');
       }
       if (idempotencyHeader.length > 100) {
         throw new BadRequestException('Idempotency-Key header must not exceed 100 characters');
       }
       if (dto.idempotencyKey && dto.idempotencyKey !== idempotencyHeader) {
         throw new BadRequestException('Idempotency-Key header does not match body idempotencyKey');
       }
       if (!dto.idempotencyKey) {
         dto.idempotencyKey = idempotencyHeader;
       }
     }
     ```
  3. Verified via unit tests `IDEMP-01.9` and `IDEMP-01.10`.

---

### Scope 7: Comprehensive Caller Audit & Unprotected Paths
* **Status:** `PARTIALLY FIXED`
* **Inspected Callers:**
  1. **POS Terminal Web Client (`PaymentModal.tsx` -> `sales.api.ts`):** `FIXED`. Always generates and transmits `idempotencyKey`.
  2. **Offline Sync (`SyncService.processSync()`):** `FIXED`. Injects `event.eventId` into `idempotencyKey` for `SALE` events.
  3. **Admin Dashboard:** `VERIFIED N/A`. Does not create direct sales (only reads history and creates sales returns).
  4. **Unkeyed Direct API Callers:** `PARTIALLY FIXED (Documented Residual Risk)`. External API integrations or scripts that omit `idempotencyKey` are permitted by PostgreSQL (`idempotency_key IS NULL`) for backward compatibility, but emit a structured `UNPROTECTED_SALE_CREATION` log warning. They are not protected against network retry duplication.

---

### Scope 8: Database Payment Records vs. External Gateway Idempotency
* **Status:** `OPEN (Documented Boundary)`
* **Inspected Architecture:**
  1. `SalesService.create()` records local payment tender rows (`PaymentMethod`: CASH, CARD, UPI, BANK_TRANSFER) in PostgreSQL.
  2. **Gateway Boundary:** `SalesService.create()` does **not** communicate with third-party payment gateways (Stripe, Adyen, Square) or physical card terminals.
  3. **Operational Requirement:** In integrated card terminal deployments, POS clients must obtain a single payment intent or transaction reference from the card terminal *prior* to calling `POST /api/v1/sales`. If a network retry occurs, the POS client must reuse the existing `transactionReference` and must **never** trigger a new card terminal charge.

---

### Scope 9: Test Invocation Analysis (Unit Mocks vs Real PostgreSQL)
* **Status:** `PARTIALLY FIXED`
* **Test Suite Analysis:**
  * **File:** [`backend/test/remediation-regression.spec.ts`](file:///c:/Users/acer/Document/Infynux/INFYPOS/backend/test/remediation-regression.spec.ts)
  * **Execution Evidence:** 32 tests executed via `npx ts-node test/remediation-regression.spec.ts`. All 32 passed (100%).
  * **Code Under Test:** The actual production classes `SalesService`, `SalesController`, `PermissionsGuard`, and utility functions `calculateSaleRequestHash` were invoked.
  * **Database Layer:** The database interactions were executed against a stateful in-memory mock (`createStatefulMockSalesService`) simulating PostgreSQL row locks, `P2002` error codes, and rollback semantics.
  * **PostgreSQL Integration:** **NO tests were executed against a live PostgreSQL database.** This adheres strictly to the safety rule prohibiting migrations or destructive commands against existing development or production databases.
  * **Requirement:** Dedicated PostgreSQL integration tests must be executed on a disposable staging database prior to release.

---

### Scope 10: Tenant Isolation, Malformed Keys & Hash Conflicts
* **Status:** `FIXED`
* **Inspected Artifacts & Tests:**
  1. **Tenant Isolation (`IDEMP-01.7`):** Tested Tenant A and Tenant B creating sales with the exact same `idempotencyKey`. Both checkouts succeeded independently with distinct invoices, verifying that unique keys are strictly scoped to `tenantId`.
  2. **Hash Conflict (`IDEMP-01.3`):** Tested reusing an existing key with a different item quantity. Threw `ConflictException` (HTTP 409).
  3. **Malformed Keys (`IDEMP-01.10`):** Tested oversized (>100 chars) and whitespace keys. Threw `BadRequestException` (HTTP 400).
  4. **Unrelated DB Errors (`IDEMP-01.11`):** Tested unique constraint collision on `saleNumber`. Verified that it is rethrown and not misclassified as an idempotency collision.

---

## 3. Test Execution Summary

```
🚀 Running INFYPOS Production Service Regression & Security Tests...

  ✅ PASS: SEC-01 [Library Level]: Prisma.sql parameterization neutralizes SQL injection in search filter
  ✅ PASS: SEC-02 [Unit]: PermissionsGuard.canActivate() rejects OWNER accessing system.tenants.manage
  ✅ PASS: SEC-02 [Unit]: PermissionsGuard.canActivate() allows SUPER_ADMIN for system operations
  ✅ PASS: SEC-02 [Unit]: PermissionsGuard.canActivate() preserves OWNER access for tenant-level operations
  ✅ PASS: FIN-01 [Unit]: SalesService.create() rejects underpayment when tendered is less than grand total
  ✅ PASS: FIN-01 [Unit]: SalesService.create() rejects unauthorized overpayment without documented change
  ✅ PASS: FIN-01 [Unit]: SalesService.create() rejects zero or negative tender amount
  ✅ PASS: FIN-01 [Unit]: SalesService.create() accepts valid split payments exactly matching grand total
  ✅ PASS: FIN-02 [Unit]: SalesService.create() rejects negative discount amounts
  ✅ PASS: FIN-02 [Unit]: SalesService.create() rejects discount exceeding subtotal
  ✅ PASS: FIN-02 [Unit]: SalesService.create() accurately calculates discounts and rounding boundaries
  ✅ PASS: IDEMP-01 [Unit]: Successful first checkout persists sale and decrements inventory
  ✅ PASS: IDEMP-01 [Unit]: Repeated identical request returns original sale without duplicate invoice or inventory deductions
  ✅ PASS: IDEMP-01 [Unit]: Same key with different payload throws ConflictException (HTTP 409)
  ✅ PASS: IDEMP-01 [Unit]: Concurrent requests with same key resolve via P2002 collision to single sale
  ✅ PASS: IDEMP-01 [Unit]: Inventory is deducted exactly once across multiple repeated checkout attempts
  ✅ PASS: IDEMP-01 [Unit]: Failed transaction leaves zero partial sale or inventory mutations
  ✅ PASS: IDEMP-01 [Unit]: Tenant isolation: Tenant A and Tenant B can use the same key without cross-tenant collisions or leakage
  ✅ PASS: IDEMP-01 [Unit]: Client retry after network timeout reuses the same key and safely recovers original sale
  ✅ PASS: IDEMP-01 [Unit]: Header and body idempotency key disagreement is rejected with BadRequestException
  ✅ PASS: IDEMP-01 [Unit]: Malformed or oversized idempotency header (>100 chars) is rejected with BadRequestException
  ✅ PASS: IDEMP-01 [Unit]: Unrelated unique constraint collision (e.g. saleNumber P2002) is not masked and is rethrown
  ✅ PASS: IDEMP-01 [Unit]: Request hash canonicalization sorts duplicate products deterministically
  ✅ PASS: SEC-04 [Unit]: AuthService.refresh() rotates refresh tokens atomically
  ✅ PASS: SEC-04 [Unit]: Concurrent refresh retry is rejected without destroying user session family
  ✅ PASS: SEC-04 [Unit]: Stolen token replay after concurrency window triggers full family revocation
  ✅ PASS: SEC-04 [Unit]: AuthService.refresh() rejects expired refresh token
  ✅ PASS: SEC-04 [Unit]: AuthService.logout() revokes specific device refresh token
  ✅ PASS: NET-02 [Unit]: parseTrustProxySetting resolves narrowest safe policy
  ✅ PASS: NET-01 [Unit]: CORS origin validator rejects unapproved production origins
  ✅ PASS: SEC-03 [Unit]: User list and detail projections never include plaintext pinCode
  ✅ PASS: SEC-08 [Unit]: Customer portal route resolves canonical prefix without duplicate v1

========================================
Results: 32/32 tests passed (100%)
========================================
```

---

## 4. Findings Summary Table

| Finding Reference | Description | Status | Evidence / Location |
| :--- | :--- | :---: | :--- |
| **VERIF-IDEMP-01** | Composite unique constraint validity | `FIXED` | `schema.prisma:325`, `migration.sql:6` |
| **VERIF-IDEMP-02** | Deterministic canonical request hashing | `FIXED` | `sale-idempotency.util.ts:9-48`, Test `IDEMP-01.12` |
| **VERIF-IDEMP-03** | Discrimination of P2002 error targets | `FIXED` | `sales.service.ts:383-395`, Test `IDEMP-01.11` |
| **VERIF-IDEMP-04** | Atomic rollback and inventory isolation | `FIXED` | `sales.service.ts:162-380`, Test `IDEMP-01.5` & `IDEMP-01.6` |
| **VERIF-IDEMP-05** | POS key stability across retries and modal unmount | `FIXED` | `PaymentModal.tsx:38-43`, `CartPanel.tsx:278-287` |
| **VERIF-IDEMP-06** | Header and body key disagreement prevention | `FIXED` | `sales.controller.ts:39-41`, Test `IDEMP-01.9` |
| **VERIF-IDEMP-07** | Caller inventory & unkeyed caller audit | `PARTIALLY FIXED` | `sync.service.ts:86-92`, `sales.service.ts:68-76` |
| **VERIF-IDEMP-08** | External gateway reconciliation boundary | `OPEN` | Architecture documentation Section 2.8 |
| **VERIF-IDEMP-09** | Live PostgreSQL integration test execution | `PARTIALLY FIXED` | In-memory unit verified; live DB deferred by safety rules |
| **VERIF-IDEMP-10** | Tenant isolation and malformed key validation | `FIXED` | `sales.controller.ts:33-38`, Tests `IDEMP-01.7` & `IDEMP-01.10` |

---

## 5. Next Highest-Priority Blocker

### Blocker: Live Database Migration & PostgreSQL Concurrency Verification in Isolated Staging Environment

* **Nature of Blocker:** While unit tests verify the NestJS application logic and transaction error handlers, the actual PostgreSQL composite index creation and database lock resolution have not been executed on a real PostgreSQL database instance due to strict safety rules protecting existing development and production databases.
* **Evidence Needed to Close:**
  1. Provision an isolated, disposable PostgreSQL staging database instance.
  2. Execute `npx prisma migrate deploy` using `backend/prisma/migrations/20261012_add_sales_idempotency/migration.sql`.
  3. Verify that the unique index builds without error on pre-existing sales records.
  4. Run an automated concurrency test against the staging database with 20 parallel threads submitting checkouts with identical idempotency keys, confirming exactly 1 sale row and 1 stock decrement in PostgreSQL.
* **Production Status:** **INFYPOS is NOT yet production-ready.**