# INFYPOS Security Findings & Vulnerability Report

**Document Version:** 1.0.0  
**Audit Date:** 2026-10-12  
**Methodology:** OWASP ASVS v4.0, Static Code Analysis, Attack Surface Enumeration  

---

## 1. Vulnerability Summary Dashboard

| Finding ID | Title | Severity | Confidence | Status |
| :--- | :--- | :---: | :---: | :---: |
| **SEC-01** | Raw SQL Injection via `$queryRawUnsafe` in Inventory Reports | `CRITICAL` | Confirmed | Needs Remediation |
| **SEC-02** | Cross-Tenant Administration Access via Unrestricted `/tenants` | `CRITICAL` | Confirmed | Needs Remediation |
| **SEC-03** | Plaintext Cashier PIN Storage in Database & API Response | `HIGH` | Confirmed | Needs Remediation |
| **SEC-04** | Missing Refresh Token Rotation (Replay Attacks) | `HIGH` | Confirmed | Needs Remediation |
| **SEC-05** | Bulk Cashier Password Hash Exposure via `/users/cashiers/:storeId` | `HIGH` | Confirmed | Needs Remediation |
| **SEC-06** | Inactive / Suspended User Sessions Persisting Until JWT Expiry | `MEDIUM` | Confirmed | Needs Remediation |
| **SEC-07** | Broken Production CORS Origin Configuration | `MEDIUM` | Confirmed | Needs Remediation |
| **SEC-08** | Double Route Prefix & Unhandled Raw Error in Public Download Portal | `MEDIUM` | Confirmed | Needs Remediation |
| **SEC-09** | Transitive Dependency Vulnerabilities in Multer (Multer DoS) | `HIGH` | Confirmed | Needs Remediation |
| **SEC-10** | Absence of Login Account Lockout & Brute-Force IP Ban | `LOW` | Confirmed | Needs Remediation |

---

## 2. In-Depth Vulnerability Details

### Finding SEC-01: Critical SQL Injection in Inventory Reports
- **Severity:** `CRITICAL` (CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:H/A:H - 9.9)
- **Confidence:** Confirmed
- **Affected File:** `backend/src/modules/reports/reports.service.ts` (lines 271–296)
- **Vulnerability Type:** CWE-89: Improper Neutralization of Special Elements used in an SQL Command
- **Vulnerable Code Snippet:**
  ```typescript
  let whereQuery: string = `WHERE i."tenant_id" = '${tenantId}'::uuid`;
  if (storeId) whereQuery += ` AND i."store_id" = '${storeId}'::uuid`;
  if (status) whereQuery += ` AND i."status" = '${status}'`;
  if (search) whereQuery += ` AND (p."name" ILIKE '%${search}%' OR p."sku" ILIKE '%${search}%')`;

  const totalRaw = await this.prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as count 
    FROM "inventories" i 
    INNER JOIN "products" p ON p."id" = i."product_id"
    ${whereQuery}
  `);
  ```
- **Attack Vector:** An authenticated attacker passing `search="'; DROP TABLE sales; --"` or using `UNION SELECT` can view all records from other tenants or alter table contents.
- **Remediation:** Replace `$queryRawUnsafe` with safe Prisma queries or parameterized `Prisma.sql`:
  ```typescript
  const searchFilter = search ? Prisma.sql`AND (p."name" ILIKE ${`%${search}%`} OR p."sku" ILIKE ${`%${search}%`})` : Prisma.empty;
  const itemsRaw = await this.prisma.$queryRaw`
    SELECT i.*, p."name" as "productName", p."sku" as "productSku",
           (i."quantity_on_hand" - i."reserved_quantity") as "availableStock"
    FROM "inventories" i
    INNER JOIN "products" p ON p."id" = i."product_id"
    WHERE i."tenant_id" = ${tenantId}::uuid
    ${searchFilter}
    ORDER BY p."name" ASC
    LIMIT ${limit} OFFSET ${skip}
  `;
  ```

---

### Finding SEC-02: Cross-Tenant Management Access
- **Severity:** `CRITICAL` (CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H - 8.8)
- **Confidence:** Confirmed
- **Affected Files:** `backend/src/common/guards/permissions.guard.ts` & `backend/src/modules/tenants/tenants.controller.ts`
- **Vulnerability Type:** CWE-639: Authorization Bypass Through User-Controlled Key / Broken Access Control
- **Analysis:**
  `PermissionsGuard` line 35 automatically returns `true` for any user with `roleCode === 'OWNER'`. In multi-tenant SaaS, every merchant owner has the `OWNER` role within their tenant. Since `TenantsController` has `@Permissions('system.tenants.manage')`, any tenant owner can access `/api/v1/tenants`, listing all stores and tenants across the system and calling `DELETE /api/v1/tenants/:id`.
- **Remediation:**
  Remove `OWNER` from system-level guard bypasses. Ensure `system.tenants.manage` is strictly reserved for `roleCode === 'SUPER_ADMIN'`.

---

### Finding SEC-03: Plaintext Cashier PIN Storage & Cleartext API Exposure
- **Severity:** `HIGH` (CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N - 6.5)
- **Confidence:** Confirmed
- **Affected Files:** `backend/src/modules/users/users.service.ts` & `backend/prisma/schema.prisma`
- **Vulnerability Type:** CWE-312: Cleartext Storage of Sensitive Information
- **Analysis:**
  The `User` model defines `pinCode String? @map("pin_code") @db.VarChar(10)`. When users are created or updated, plaintext PINs are written to PostgreSQL. Furthermore, `findOne` (line 227) and `findAll` (line 162) explicitly include `pinCode: true` in the select projection, returning plaintext employee PINs to anyone with user viewing rights.
- **Remediation:**
  Drop the plaintext `pin_code` column. Store only `pinCodeHash`. Ensure user queries never return PIN values.

---

### Finding SEC-04: Missing Refresh Token Rotation (Token Replay)
- **Severity:** `HIGH` (CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:N - 7.4)
- **Confidence:** Confirmed
- **Affected File:** `backend/src/modules/auth/auth.service.ts` (lines 149–208)
- **Vulnerability Type:** CWE-294: Authentication Bypass by Capture-replay
- **Analysis:**
  When a client calls `POST /api/v1/auth/refresh`, `AuthService.refresh` checks the refresh token in the database and generates a new `accessToken`. However, the existing `refreshToken` is neither deleted nor revoked (`revokedAt` is not set). A stolen refresh token can be used indefinitely until expiration (7 days).
- **Remediation:**
  Mark the used refresh token as revoked (`revokedAt: new Date()`) and return a newly issued `refreshToken` alongside the `accessToken`.

---

### Finding SEC-05: Bulk Cashier Password Hash Exposure via `/users/cashiers/:storeId`
- **Severity:** `HIGH` (CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N - 6.5)
- **Confidence:** Confirmed
- **Affected File:** `backend/src/modules/users/users.controller.ts` (line 68) & `users.service.ts` (line 197)
- **Vulnerability Type:** CWE-200: Exposure of Sensitive Information to an Unauthorized Actor
- **Analysis:**
  `getCashiersForStore` is protected only by `JwtAuthGuard` without any permission check. It returns `{ id, firstName, lastName, pinCodeHash }` to the client. Because 4-digit PINs have only 10,000 possibilities (0000–9999), an attacker with the bcrypt hash can crack all cashier PINs in a store within seconds using a simple script.
- **Remediation:**
  Do not transmit password hashes to the frontend. Implement server-side PIN authentication for till pairing and cashier sessions.
