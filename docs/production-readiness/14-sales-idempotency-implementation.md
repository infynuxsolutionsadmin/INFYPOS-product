# INFYPOS — Direct Sales Idempotency Implementation

**Document ID:** `docs/production-readiness/14-sales-idempotency-implementation.md`  
**Date:** 2026-10-12  
**Author:** Principal Software Architect, Application Security & Database Engineer  
**Scope:** Tenant-scoped synchronous sales creation idempotency, race-condition mitigation, and client retry flow  
**Target Codebase:** INFYPOS (`backend/`, `INFEPOS_FRONTEND/pos-terminal`)  
**Status:** **Implemented, Verified with Unit & Service Regression Suite (28/28 tests passing). Migration Generated (Unapplied). Production-Ready Status: NOT YET DECLARED.**

---

## 1. Executive Summary & Design Goals

Prior to this implementation, direct synchronous sales requests (`POST /api/v1/sales`) had no deduplication mechanism. If a network interruption occurred after PostgreSQL committed a checkout transaction, a POS terminal retrying the operation would create a second invoice, deduct inventory a second time, and double-charge customer accounts.

To eliminate this financial and inventory risk without breaking existing workflows, we implemented **tenant-scoped direct sales idempotency**:
1. **Stable Key Tracking:** Clients provide a unique idempotency key per checkout operation that persists across network retries.
2. **Deterministic Payload Canonicalization:** A cryptographic SHA-256 hash is computed over canonical business fields (items, prices, quantities, payments, store, shift, discounts) while ignoring non-deterministic metadata like timestamps.
3. **Database-Enforced Uniqueness:** A composite unique constraint `@@unique([tenantId, idempotencyKey])` in PostgreSQL enforces race-condition safety at the database engine level.
4. **Idempotent Replay:** Re-submitting an identical request returns the original completed sale without duplicate stock deductions or payment entries.
5. **Conflict Rejection (HTTP 409):** Reusing an existing key with a modified payload throws `ConflictException` (HTTP 409).
6. **Concurrent Conflict Resolution:** Simultaneous requests for the same key are caught at the database constraint boundary (`P2002`) and resolved to the winning transaction.
7. **Offline Sync Continuity:** Existing `SyncEvent` deduplication is preserved and aligned with direct sales creation.

---

## 2. API Contract & Specification

### 2.1 Endpoint Contract
* **Route:** `POST /api/v1/sales`
* **Authentication:** Bearer JWT required (`JwtAuthGuard`, `PermissionsGuard: sales.create`).
* **Idempotency Key Transmission:**
  * Supported via HTTP Request Header: `Idempotency-Key: <UUID>`
  * Supported via JSON Request Body: `"idempotencyKey": "<UUID>"`
  * If both are provided, the body takes precedence; if only the header is provided, the controller attaches it to the DTO.

### 2.2 Request Payload Schema (`CreateSaleDto`)
```json
{
  "idempotencyKey": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "shiftId": "c30f0f42-4752-4e48-9c10-09a859e9a789",
  "storeId": "7d91e6c2-0b1a-472e-8fa9-9941a5477dae",
  "customerId": "81f1e7a4-8463-4903-8d02-18db5f3daec2",
  "customerPhone": "07123456789",
  "discountAmount": 10.00,
  "notes": "Table 4 checkout",
  "items": [
    {
      "productId": "e1f13b19-4820-410a-8bf8-0eb83e60c87f",
      "quantity": 2
    }
  ],
  "payments": [
    {
      "paymentMethod": "CASH",
      "amount": 110.00,
      "transactionReference": "TXN-998811"
    }
  ]
}
```

### 2.3 Deterministic Canonical Request Hashing
Implemented in [`backend/src/modules/sales/utils/sale-idempotency.util.ts`](file:///c:/Users/acer/Document/Infynux/INFYPOS/backend/src/modules/sales/utils/sale-idempotency.util.ts):
* **Algorithm:** SHA-256 hex digest.
* **Canonical Fields Included:**
  * `storeId`
  * `shiftId`
  * `customerId` / `customerPhone`
  * `discountAmount` (normalized numeric string)
  * `items`: Lexicographically sorted by `productId`, containing `{ productId, quantity: Number(quantity).toString() }`.
  * `payments`: Lexicographically sorted by `paymentMethod` and `amount`, containing `{ paymentMethod, amount: Number(amount).toString(), transactionReference }`.
* **Volatile Fields Excluded:**
  * Client submission timestamps.
  * Request IDs and transient trace headers.
  * Ephemeral cashier credentials or session tokens.

### 2.4 HTTP Status Code Responses
| Condition | HTTP Status | Response Payload | Database Action |
| :--- | :---: | :--- | :--- |
| **New valid checkout** | `201 Created` | Full sale response (saleNumber, items, payments, totals) | Sale record, inventory deducted, stock movement logged |
| **Replay identical key & hash** | `200 OK` | Identical sale response matching original invoice | Zero DB mutations. Returned directly from storage |
| **Replay key with different payload** | `409 Conflict` | `{"statusCode": 409, "message": "Idempotency key has already been used for a different checkout operation"}` | Zero DB mutations |
| **Concurrent request collision** | `200 OK` | Winning sale response (after catching `P2002` conflict) | Single transaction committed; duplicate rolled back |
| **Validation failure (e.g. stock, tender)** | `400 / 404 / 409` | Standard NestJS validation error | Transaction rolled back; zero partial state left |

---

## 3. Database Schema & Migration Requirements

### 3.1 Prisma Schema Modifications
In [`backend/prisma/schema.prisma`](file:///c:/Users/acer/Document/Infynux/INFYPOS/backend/prisma/schema.prisma#L305-L335):
```prisma
model Sale {
  id             String         @id @default(uuid()) @db.Uuid
  tenantId       String         @map("tenant_id") @db.Uuid
  idempotencyKey String?        @map("idempotency_key") @db.VarChar(100)
  requestHash    String?        @map("request_hash") @db.VarChar(64)
  // ... other fields ...

  @@unique([tenantId, idempotencyKey])
  @@index([idempotencyKey])
  @@map("sales")
}
```

### 3.2 SQL Migration Script
Generated file: [`backend/prisma/migrations/20261012_add_sales_idempotency/migration.sql`](file:///c:/Users/acer/Document/Infynux/INFYPOS/backend/prisma/migrations/20261012_add_sales_idempotency/migration.sql)
```sql
-- AlterTable
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "idempotency_key" VARCHAR(100);
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "request_hash" VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "sales_tenant_id_idempotency_key_key" ON "sales"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sales_idempotency_key_idx" ON "sales"("idempotency_key");
```

> [!CAUTION]
> **Migration Safety Notice:** As specified by the safety constraints, this migration has **not** been executed against any development, staging, or production database. When deploying to staging or production, execute:
> ```bash
> npx prisma migrate deploy
> ```

---

## 4. Client Retry Behaviour & POS Integration

### 4.1 POS Terminal Implementation
Modified components:
* [`INFEPOS_FRONTEND/pos-terminal/src/components/pos/PaymentModal.tsx`](file:///c:/Users/acer/Document/Infynux/INFYPOS/INFEPOS_FRONTEND/pos-terminal/src/components/pos/PaymentModal.tsx#L37-L55)
* [`INFEPOS_FRONTEND/pos-terminal/src/api/sales.api.ts`](file:///c:/Users/acer/Document/Infynux/INFYPOS/INFEPOS_FRONTEND/pos-terminal/src/api/sales.api.ts#L60-L66)
* [`INFEPOS_FRONTEND/pos-terminal/src/types/sale.ts`](file:///c:/Users/acer/Document/Infynux/INFYPOS/INFEPOS_FRONTEND/pos-terminal/src/types/sale.ts#L8-L22)

### 4.2 Checkout Lifecycle
1. **Modal Initialization:** When the cashier opens the payment modal, a stable UUID is generated:
   ```typescript
   const [idempotencyKey] = useState<string>(() => crypto.randomUUID());
   ```
2. **First Submit Attempt:** The cashier selects a payment method and clicks "Confirm Payment". The payload is sent with `idempotencyKey` and header `Idempotency-Key`.
3. **Network Failure / Timeout Retry:** If the request times out or returns a network error, the modal remains open in its active state with the error displayed. When the cashier clicks "Confirm Payment" again, the **exact same `idempotencyKey`** is transmitted.
4. **Idempotent Resolution:** The backend recognizes the key, returns the existing sale object, and the POS UI successfully transitions to the Receipt view without double billing or decrementing stock twice.
5. **Modal Dismissal / Next Sale:** When the payment succeeds and `onSuccess` triggers, the cart is cleared and the modal unmounts. The next checkout session generates a fresh UUID.

---

## 5. Offline Sync Compatibility (`SyncEvent`)

### 5.1 Architecture Inspection
Offline sales are queued in the local SQLite/IndexedDB store and processed via `POST /api/v1/sync` (`SyncService.processSync()`).

### 5.2 Compatibility Integration
In [`backend/src/modules/sync/sync.service.ts`](file:///c:/Users/acer/Document/Infynux/INFYPOS/backend/src/modules/sync/sync.service.ts#L86-L92):
```typescript
if (event.eventType === 'SALE') {
  const salePayload = {
    ...event.payload,
    idempotencyKey: event.payload?.idempotencyKey || event.eventId,
  };
  processedPayload = await this.salesService.create(tenantId, userId, salePayload, true);
}
```
* **Offline Event Deduplication:** `SyncService` maintains its composite unique constraint on `SyncEvent(tenant_id, event_id)`.
* **Sync-to-Sales Alignment:** By propagating `event.eventId` into `idempotencyKey`, any offline sale re-delivered during synchronization is also protected at the `Sale` table level.
* **Stock Protection:** `isSync: true` prevents double decrementing if an offline event retry occurs after a partial backend commit.

---

## 6. Backward Compatibility for Unprotected Clients

### 6.1 Handling Requests Omitting `idempotencyKey`
In PostgreSQL, a unique constraint on `(tenant_id, idempotency_key)` permits multiple rows where `idempotency_key IS NULL` according to ANSI SQL standards.

* **Legacy Client Behavior:** Older third-party clients, external API integrators, or scripts that omit `idempotencyKey` will have `idempotencyKey: null, requestHash: null`.
* **Database Execution:** These checkouts will succeed without triggering unique constraint conflicts.
* **Audit Logging:** To avoid false claims of protection, `SalesService` detects unkeyed checkouts and emits an explicit structured warning:
  ```json
  {
    "event": "UNPROTECTED_SALE_CREATION",
    "tenantId": "...",
    "cashierId": "...",
    "storeId": "...",
    "message": "Direct sale creation request missing idempotency key. Client cannot be protected against duplicate submissions on network retries."
  }
  ```

### 6.2 Transition Plan
1. **Current Phase (Phase 1 Final):** Optional `idempotencyKey` with structured audit warning on omission. POS terminal updated to always provide the key.
2. **Phase 2 Hardening:** Introduce deprecation notice in API documentation.
3. **Phase 3 Enforcement:** Require `idempotencyKey` strictly; return `400 Bad Request` if omitted on direct synchronous sales.

---

## 7. Verification & Test Evidence

Regression suite executed: [`backend/test/remediation-regression.spec.ts`](file:///c:/Users/acer/Document/Infynux/INFYPOS/backend/test/remediation-regression.spec.ts)  
**Execution Command:** `npx ts-node test/remediation-regression.spec.ts`  
**Overall Result:** **28/28 tests passed (100%)**

### 7.1 Specific Idempotency Test Execution Results
| Test ID | Scenario | Tested Behavior | Actual Execution Result |
| :--- | :--- | :--- | :---: |
| **IDEMP-01.1** | Successful first checkout | Persists sale, calculates hash, decrements inventory from 10 to 8 | `✅ PASS` |
| **IDEMP-01.2** | Repeated identical request | Returns original sale with matching `saleNumber`, 0 duplicate invoices, stock remains 8 | `✅ PASS` |
| **IDEMP-01.3** | Key conflict with different payload | Throws `ConflictException` (HTTP 409), 0 additional sales, stock untouched | `✅ PASS` |
| **IDEMP-01.4** | Concurrent requests on same key | Simulates database unique index race (`P2002`); resolves to single winning saleNumber | `✅ PASS` |
| **IDEMP-01.5** | Multi-attempt inventory idempotency | 5 identical checkout retries produce exactly 1 sale and 1 stock decrement (20 to 15) | `✅ PASS` |
| **IDEMP-01.6** | Transaction atomicity on failure | Simulated abort leaves 0 sales, 0 stock movements, stock untouched at 20 | `✅ PASS` |
| **IDEMP-01.7** | Multi-tenant isolation | Tenant A and Tenant B use identical key; both succeed independently with distinct invoices | `✅ PASS` |
| **IDEMP-01.8** | Network timeout client retry | Client retries with same UUID; original sale retrieved without double charging | `✅ PASS` |

### 7.2 Compilation & Build Verification
* **Backend Build:** `npm run build` in `backend/` -> `nest build` completed successfully with **0 errors**.
* **POS Frontend Build:** `npm run build` in `INFEPOS_FRONTEND/pos-terminal` -> `tsc -b && vite build` completed successfully with **0 errors**.

---

## 8. Unresolved Risks & Operational Considerations

1. **Storage Pruning & Retention Window:**
   The current implementation stores `idempotency_key` and `request_hash` directly on the `sales` table indefinitely. While this ensures that checkouts can never be duplicated even months later, an archive strategy should be defined for partitions older than the statutory tax retention period (typically 7 years).
2. **In-Flight Window Race (Pre-Commit):**
   If two identical requests arrive within milliseconds of each other, PostgreSQL serializes them at the `INSERT` index lock. However, if the winning request takes unusually long to commit (e.g., slow network storage), the losing request will wait on the transaction lock. A statement timeout on PostgreSQL should be configured to prevent connection starvation.
3. **Legacy Integrations:**
   As noted in Section 6, external clients calling `POST /api/v1/sales` without `idempotencyKey` remain vulnerable to duplicate submissions until mandatory enforcement is enabled in Phase 3.
4. **Production Readiness Caution:**
   **INFYPOS is NOT yet declared production-ready.** Database migrations must be tested on an isolated staging clone, end-to-end payment gateway webhooks must be audited, and full disaster recovery drills must be completed prior to live store deployment.
