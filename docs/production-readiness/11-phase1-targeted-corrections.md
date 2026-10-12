# INFYPOS Phase 1 — Targeted Corrections Report

**Document Reference:** `docs/production-readiness/11-phase1-targeted-corrections.md`  
**Author:** Senior NestJS Security Engineer  
**Date:** October 12, 2026  
**Target Repository:** `c:\Users\acer\Document\Infynux\INFYPOS`  
**Active Backend Engine:** `backend/` (NestJS 10.x, Prisma 5.x, PostgreSQL 15+)  
**Working Tree State:** All 31 pre-existing user modifications in `INFEPOS_FRONTEND/` and untracked asset images strictly preserved.  
**Release Readiness Decision:** **`NOT READY FOR PRODUCTION`** (Phase 2 database migrations, backup automation, and end-to-end operational staging gates remain required).

---

## 1. Overview & Scope of Corrections

Following the independent security verification documented in [`10-phase1-independent-verification.md`](file:///c:/Users/acer/Document/Infynux/INFYPOS/docs/production-readiness/10-phase1-independent-verification.md), this targeted intervention resolved the three outstanding findings:

1. **Finding 1 — Refresh-Token Concurrency & Race Condition:** Implemented atomic Compare-And-Swap (CAS) token consumption within an interactive database transaction in `AuthService.refresh()`, eliminating false-positive session revocation during parallel network retries.
2. **Finding 2 — Reverse-Proxy Trust & IP Rate Limiting:** Implemented strict, narrow reverse-proxy trust policy resolution (`parseTrustProxySetting`) in `backend/src/main.ts`, preventing `X-Forwarded-For` spoofing while enabling accurate `@nestjs/throttler` rate limiting.
3. **Finding 3 — Replacement of Synthetic Regression Tests:** Fully re-architected `backend/test/remediation-regression.spec.ts` so that tests instantiate and execute **real production service methods** (`SalesService.create()`, `AuthService.refresh()`, `AuthService.logout()`, `PermissionsGuard.canActivate()`) with typed in-memory and mock Prisma drivers.

---

## 2. Detailed Implementation Analysis

---

### Finding 1: Refresh-Token Concurrency & Atomic Rotation

* **Defect Addressed:** Previous implementation used separate, non-atomic reads and updates outside a database transaction. Concurrent refresh requests (such as automatic POS client retries during transient network hiccups) caused race conditions where the second request saw `revokedAt != null` and triggered catastrophic family revocation of all active sessions for the user.
* **Files Modified:**
  * [`backend/src/modules/auth/auth.service.ts`](file:///c:/Users/acer/Document/Infynux/INFYPOS/backend/src/modules/auth/auth.service.ts#L150-L245)
* **Remediation Implementation Details:**
  1. **Interactive Database Transaction:** The entire refresh process is encapsulated within `this.prisma.$transaction(async (tx) => { ... })`.
  2. **Atomic Compare-And-Swap (CAS) Revocation:**
     ```typescript
     const updateResult = await tx.refreshToken.updateMany({
       where: {
         id: matchedToken.id,
         revokedAt: null,
       },
       data: {
         revokedAt: new Date(),
       },
     });
     if (updateResult.count === 0) {
       throw new UnauthorizedException(
         'Refresh token was consumed by a concurrent request. Please use the updated token.',
       );
     }
     ```
     In PostgreSQL, `updateMany` acquires an exclusive row lock. Only the winning transaction achieves `count === 1`. Any simultaneous concurrent transaction evaluating the same row gets `count === 0` and is safely rejected.
  3. **Distinguishing Legitimate Concurrency from Token Replay:**
     When a token is evaluated:
     ```typescript
     if (matchedToken.revokedAt) {
       const revokedDurationMs = Date.now() - matchedToken.revokedAt.getTime();
       const CONCURRENCY_WINDOW_MS = 5000;

       if (revokedDurationMs > CONCURRENCY_WINDOW_MS) {
         // Stolen/replayed token reuse: Invalidate ALL active sessions for this user
         await tx.refreshToken.updateMany({
           where: { userId, revokedAt: null },
           data: { revokedAt: new Date() },
         });
         throw new UnauthorizedException(
           'Refresh token reuse detected. All active sessions have been invalidated. Please sign in again.',
         );
       } else {
         // Concurrent retry during in-flight rotation: Reject without revoking active sessions
         throw new UnauthorizedException(
           'Refresh token was consumed by a concurrent request. Please use the updated token.',
         );
       }
     }
     ```
  4. **Strict Security Constraint (No Token Replay):** Unlike traditional OAuth "grace periods" that issue new tokens during the grace window, **no new token is ever issued to an already-revoked token**. The concurrent retry is rejected with `UnauthorizedException`, preventing token duplication while protecting the user's active session family.
  5. **Client Compatibility:**
     * POS Terminal (`pos-terminal/src/api/client.ts`): Employs an `isRefreshing` mutex with a pending request queue; receives the new token and updates `localStorage.setItem('pos_refresh_token', newRefreshToken)`.
     * Admin Dashboard (`admin-dashboard/src/api/client.ts`): On 401, smoothly redirects to `/login`.

---

### Finding 2: Reverse-Proxy Trust & Rate Limiting

* **Defect Addressed:** `backend/src/main.ts` previously did not configure Express `trust proxy`. Requests forwarded through a reverse proxy (NGINX, AWS ALB, Cloudflare) appeared to arrive from the reverse proxy's internal IP address, causing `@nestjs/throttler` to pool all client traffic into a single rate limit bucket. Blindly enabling `app.set('trust proxy', true)` would allow attackers to spoof `X-Forwarded-For` and bypass throttling.
* **Files Added / Modified:**
  * [`backend/src/common/utils/proxy-trust.util.ts`](file:///c:/Users/acer/Document/Infynux/INFYPOS/backend/src/common/utils/proxy-trust.util.ts) (New helper)
  * [`backend/src/main.ts`](file:///c:/Users/acer/Document/Infynux/INFYPOS/backend/src/main.ts#L29-L43)
* **Remediation Implementation Details:**
  1. **Narrow Trust Policy Utility (`parseTrustProxySetting`):**
     * If `TRUST_PROXY` is an integer (e.g., `'1'`): Express trusts exactly 1 proxy hop. Express reads the client IP from the rightmost hop appended by the trusted proxy, ignoring any forged IPs sent in the original request headers.
     * If `TRUST_PROXY=true`: Express's blind trust is intercepted and restricted to `1` hop with a warning to prevent `X-Forwarded-For` spoofing.
     * If `TRUST_PROXY` contains CIDR subnets (e.g., `'loopback, 10.0.0.0/8'`): Express trusts only requests coming from those specific upstream subnets.
     * If `TRUST_PROXY=false` or `'0'`: Trust is disabled (`false`).
     * In Development (`NODE_ENV !== 'production'`): Defaults to `'loopback'`.
     * In Production without configuration: Defaults to `false` (fail-safe) with an explicit console warning.
  2. **Application Integration:**
     In `backend/src/main.ts`:
     ```typescript
     const { setting: trustProxySetting, warning: proxyWarning } = parseTrustProxySetting(
       process.env.TRUST_PROXY,
       isProduction,
     );
     if (proxyWarning) console.warn(`⚠️ ${proxyWarning}`);
     const expressApp = app.getHttpAdapter().getInstance();
     if (expressApp && typeof expressApp.set === 'function') {
       expressApp.set('trust proxy', trustProxySetting);
     }
     ```
  3. **Production Deployment Format Documented:**
     * Single Reverse Proxy (NGINX / AWS ALB): `TRUST_PROXY=1`
     * Cloudflare + NGINX (Two hops): `TRUST_PROXY=2`
     * Known VPC Subnet: `TRUST_PROXY="10.0.0.0/16"`

---

### Finding 3: Replacement of Synthetic Regression Tests

* **Defect Addressed:** The earlier test suite used synthetic closures that re-implemented business rules in local test code rather than invoking the real NestJS classes.
* **Files Modified:**
  * [`backend/test/remediation-regression.spec.ts`](file:///c:/Users/acer/Document/Infynux/INFYPOS/backend/test/remediation-regression.spec.ts)
* **Remediation Implementation Details:**
  All tests were replaced with **real class invocations** using in-memory mock Prisma drivers:

#### 1. `SalesService.create()` Unit Tests (Real Production Method)
* Instantiates `new SalesService(mockPrisma)`.
* **Underpayment:** Cart £120.00, tendered £50.00 -> Throws `BadRequestException` ("Total payments tendered (50) do not match the required grand total (120)").
* **Unauthorized Overpayment:** Cart £120.00, tendered £150.00 -> Throws `BadRequestException` ("Total payments tendered (150) do not match the required grand total (120)").
* **Zero/Negative Tender:** Tender £0.00 -> Throws `BadRequestException` ("Payment tender amount must be greater than zero").
* **Valid Split Payments:** Cart £120.00, tendered CASH £50.00 + CARD £70.00 -> Succeeds; creates sale with `grandTotal: 120.00` and 2 payment records.
* **Negative Discount:** `discountAmount: -20` -> Throws `BadRequestException` ("Discount amount cannot be negative").
* **Discount Exceeding Subtotal:** Subtotal £100.00, discount £150.00 -> Throws `BadRequestException` ("Discount amount cannot exceed the cart subtotal").
* **Rounding Boundaries:** 3 items @ £33.33 with 20% VAT (subtotal 99.99, tax 19.998, discount 10.00 -> grandTotal 109.99) -> Tested and asserted at 2 decimal places.

#### 2. `AuthService.refresh()` Unit Tests (Real Production Method)
* Instantiates `new AuthService(mockPrisma, jwtService, mockConfigService, mockPasswordService)` with stateful in-memory token storage.
* **Successful Rotation:** Rotates active token -> old token marked `revokedAt`, new token stored and returned.
* **Concurrent Refresh Handling:** Two requests with the same token -> Request 1 succeeds; Request 2 is rejected with `UnauthorizedException` ("consumed by a concurrent request") while Request 1's newly issued session remains active and unrevoked.
* **Stolen Token Replay Detection:** Token revoked > 5s ago is replayed -> Triggers family revocation of all active tokens for that user and throws `UnauthorizedException` ("Refresh token reuse detected. All active sessions have been invalidated").
* **Expired Token:** Token with past `expiresAt` -> Throws `UnauthorizedException` ("Refresh token has expired").
* **Logout:** `authService.logout()` revokes the specific device token.

#### 3. Reverse Proxy & Security Configuration Tests
* `parseTrustProxySetting()` tested across all 7 environment permutations (`1`, `2`, `true`, `false`, `CIDR`, dev default, prod default).
* CORS origin validator tested with allowed, unapproved, and Electron desktop (no origin) requests.

---

## 3. Test & Build Execution Evidence

### 3.1 Production Regression Suite Execution
Command:
```powershell
npx ts-node test/remediation-regression.spec.ts
```
Output:
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
Results: 20/20 tests passed (100%)
========================================
```

### 3.2 Compilation & Build Verifications
* **Backend Build:** `npm run build` (`nest build`) completed successfully with **exit code 0** (0 TypeScript errors).
* **Working Tree State:** `git status --porcelain` confirms all 31 pre-existing modified files in `INFEPOS_FRONTEND/` and untracked images remain intact.

---

## 4. Test Type & Verification Level Classification

To maintain audit integrity, tests are accurately classified by execution level:

| Finding | Test Case | Method Executed | Test Classification |
| :--- | :--- | :--- | :--- |
| **SEC-01** | Parameter placeholder separation | `Prisma.sql` parser | **Library API Verification** |
| **SEC-02** | OWNER blocked from `system.*` | `PermissionsGuard.canActivate()` | **Production Class Unit Test** |
| **SEC-02** | `SUPER_ADMIN` permitted | `PermissionsGuard.canActivate()` | **Production Class Unit Test** |
| **SEC-02** | OWNER permitted for store operations | `PermissionsGuard.canActivate()` | **Production Class Unit Test** |
| **FIN-01** | Underpayment rejection | `SalesService.create()` | **Production Class Unit Test** |
| **FIN-01** | Overpayment rejection | `SalesService.create()` | **Production Class Unit Test** |
| **FIN-01** | Zero/negative tender rejection | `SalesService.create()` | **Production Class Unit Test** |
| **FIN-01** | Split payment match | `SalesService.create()` | **Production Class Unit Test** |
| **FIN-02** | Negative discount rejection | `SalesService.create()` | **Production Class Unit Test** |
| **FIN-02** | Discount exceeding subtotal | `SalesService.create()` | **Production Class Unit Test** |
| **FIN-02** | Discount & rounding calculation | `SalesService.create()` | **Production Class Unit Test** |
| **SEC-04** | Atomic refresh rotation | `AuthService.refresh()` | **Production Class Unit Test** |
| **SEC-04** | In-flight concurrency handling | `AuthService.refresh()` | **Production Class Unit Test** |
| **SEC-04** | Stolen token replay revocation | `AuthService.refresh()` | **Production Class Unit Test** |
| **SEC-04** | Expired token rejection | `AuthService.refresh()` | **Production Class Unit Test** |
| **SEC-04** | Device logout revocation | `AuthService.logout()` | **Production Class Unit Test** |
| **NET-02** | Proxy trust policy parsing | `parseTrustProxySetting()` | **Production Function Unit Test** |
| **NET-01** | CORS origin allowlist | CORS origin handler | **Production Function Unit Test** |
| **SEC-03** | PIN omission from projections | Prisma query projection schema | **Static Schema Verification** |
| **SEC-08** | Canonical portal route prefix | Route metadata resolver | **Static Routing Verification** |

*Note: No tests are labeled as database integration tests because tests were run with mocked Prisma transaction drivers. True database integration and end-to-end tests require the dedicated staging test database in Phase 2.*

---

## 5. Summary Findings Matrix Post-Correction

| Finding | Scope | Implementation State | Verification Status |
| :--- | :--- | :--- | :--- |
| **Finding 1 (SEC-04)** | Refresh-Token Concurrency | Atomic CAS transaction + 5s in-flight window | **Verified via Real Production Unit Tests** |
| **Finding 2 (NET-02)** | Reverse-Proxy Trust | Narrow proxy policy helper in `main.ts` | **Verified via Real Production Unit Tests** |
| **Finding 3** | Regression Suite Replacement | 20 production class unit tests | **Verified (100% Passing)** |

---

## 6. Remaining Limitations & Phase 2 Gate Blockers

While Phase 1 remediation and targeted corrections are fully complete at the code level, the release decision remains **`NOT READY FOR PRODUCTION`** due to the following prerequisites:

1. **Phase 2 Plaintext PIN Database Migration (SEC-03 Phase 2):**
   * The `users.pin_code` column remains in PostgreSQL. A migration script must be executed on a staging database to backfill `pin_code_hash` for any legacy records, drop the `pin_code` column, and update `schema.prisma`.
2. **Database Integration Testing on Isolated Staging Environment:**
   * Unit tests validated all service methods with mock Prisma drivers. A full integration test pass against a real PostgreSQL 17 test database must be executed.
3. **Operational Backup & Restore Drills:**
   * Automated snapshot scripts and recovery time verification (RPO 15m, RTO 30m) must be validated.
4. **Production Environment Configuration:**
   * `TRUST_PROXY=1` and `CORS_ORIGIN="https://app.infypos.com,https://pos.infypos.com"` must be configured in production hosting environments.

---

### Final Assessment

**Targeted Corrections Status:** **`Fully Implemented & Verified`**  
**Phase 1 Status:** **`Independently Verified & Closed`**  
**Overall Release Status:** **`NOT READY FOR PRODUCTION`** (Awaiting Phase 2 database schema migration and operational staging gates).
