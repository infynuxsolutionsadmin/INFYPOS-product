# INFYPOS Role & Permission Matrix

**Document Version:** 1.0.0  
**Audit Date:** 2026-10-12  
**Implementation Source:** `backend/prisma/seed.ts`, `backend/seed-role-permissions.ts`, `backend/src/common/guards/permissions.guard.ts`  

---

## 1. System Roles Inventory

The INFYPOS access control model defines five distinct roles:

1. **`SUPER_ADMIN` (Platform Administrator):**
   - System-wide administrative user with universal access across all tenants and infrastructure configurations.
   - Guard Behavior: Total bypass in `PermissionsGuard`.
2. **`OWNER` (Merchant / Company Tenant Owner):**
   - Primary business administrator for a specific tenant organization.
   - Assigned all resource permissions upon tenant provisioning in `TenantsService.create`.
   - Guard Behavior: Total bypass in `PermissionsGuard` (Identified as a critical multi-tenant isolation risk in [SEC-02]).
3. **`STORE_MANAGER` (Store General Manager):**
   - Manages operations within an assigned retail outlet: till shifts, staff management, returns, store reports.
4. **`INVENTORY_MANAGER` (Stock & Warehouse Controller):**
   - Manages catalog, products, suppliers, stock adjustments, purchase orders, goods receipts, and inventory valuations.
5. **`CASHIER` (Till Operator):**
   - Frontline point-of-sale operator: clocks into shifts, scans products, creates sales transactions, registers customers.

---

## 2. Resource Permissions Matrix

| Permission Code | Permission Description | SUPER_ADMIN | OWNER | STORE_MANAGER | INVENTORY_MANAGER | CASHIER |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **`system.tenants.manage`** | Create, update, deactivate tenants | ✅ Full | ⚠️ Guard Bypass* | ❌ Denied | ❌ Denied | ❌ Denied |
| **`stores.read`** | View store locations & metadata | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ❌ Denied |
| **`stores.create`** | Add new retail store locations | ✅ Full | ✅ Full | ❌ Denied | ❌ Denied | ❌ Denied |
| **`stores.update`** | Edit store address, currency, config | ✅ Full | ✅ Full | ✅ Assigned Store | ❌ Denied | ❌ Denied |
| **`stores.delete`** | Deactivate a retail store | ✅ Full | ✅ Full | ❌ Denied | ❌ Denied | ❌ Denied |
| **`users.read`** | View employees in organization | ✅ Full | ✅ Full | ✅ Store Staff | ❌ Denied | ❌ Denied |
| **`users.create`** | Provision new cashier/manager staff | ✅ Full | ✅ Full | ✅ Cashiers | ❌ Denied | ❌ Denied |
| **`users.update`** | Edit staff roles, status, details | ✅ Full | ✅ Full | ✅ Cashiers | ❌ Denied | ❌ Denied |
| **`users.delete`** | Deactivate employee accounts | ✅ Full | ✅ Full | ❌ Denied | ❌ Denied | ❌ Denied |
| **`roles.read`** | View custom roles and permissions | ✅ Full | ✅ Full | ❌ Denied | ❌ Denied | ❌ Denied |
| **`roles.create / update`** | Customize role definitions | ✅ Full | ✅ Full | ❌ Denied | ❌ Denied | ❌ Denied |
| **`products.read`** | View catalog, prices, and SKUs | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Till Lookup |
| **`products.create`** | Create new catalog items & barcodes | ✅ Full | ✅ Full | ❌ Denied | ✅ Full | ❌ Denied |
| **`products.update`** | Update selling price, VAT rate, SKU | ✅ Full | ✅ Full | ❌ Denied | ✅ Full | ❌ Denied |
| **`products.delete`** | Archive / soft-delete catalog items | ✅ Full | ✅ Full | ❌ Denied | ✅ Full | ❌ Denied |
| **`inventory.read`** | Check current store stock levels | ✅ Full | ✅ Full | ✅ Store Stock | ✅ Full | ✅ Till Stock |
| **`inventory.update`** | Adjust stock on hand / transfers | ✅ Full | ✅ Full | ✅ Store Stock | ✅ Full | ❌ Denied |
| **`sales.create`** | Execute POS sales checkout | ✅ Full | ✅ Full | ✅ Full | ❌ Denied | ✅ Full |
| **`sales.read`** | Query transaction history & receipts | ✅ Full | ✅ Full | ✅ Full | ❌ Denied | ✅ Own Shift |
| **`salesReturns.create`** | Process customer refund / return | ✅ Full | ✅ Full | ✅ Full | ❌ Denied | ❌ Manager Reqd |
| **`salesReturns.read`** | View return receipts & history | ✅ Full | ✅ Full | ✅ Full | ❌ Denied | ❌ Denied |
| **`shifts.open`** | Open cash drawer float shift | ✅ Full | ✅ Full | ✅ Full | ❌ Denied | ✅ Assigned Till |
| **`shifts.close`** | Finalize cash drawer count | ✅ Full | ✅ Full | ✅ Full | ❌ Denied | ✅ Assigned Till |
| **`shifts.xreport`** | Generate interim mid-shift reading | ✅ Full | ✅ Full | ✅ Full | ❌ Denied | ✅ Assigned Till |
| **`shifts.zreport`** | Generate end-of-day financial report | ✅ Full | ✅ Full | ✅ Full | ❌ Denied | ❌ Manager Reqd |
| **`reports.read`** | View executive revenue & VAT reports | ✅ Full | ✅ Full | ✅ Store Reports | ✅ Inventory Val | ❌ Denied |
| **`dashboard.read`** | Access live KPI dashboard metrics | ✅ Full | ✅ Full | ✅ Store KPIs | ✅ Inventory KPIs | ❌ Denied |
| **`customers.read / create`** | Search & enroll retail loyalty customers | ✅ Full | ✅ Full | ✅ Full | ❌ Denied | ✅ Full |
| **`suppliers.read / manage`** | Manage wholesale procurement vendors | ✅ Full | ✅ Full | ❌ Denied | ✅ Full | ❌ Denied |
| **`purchases.read / manage`** | Purchase orders & stock replenishment | ✅ Full | ✅ Full | ❌ Denied | ✅ Full | ❌ Denied |
| **`goodsReceipts.manage`** | Receive inbound purchase shipments | ✅ Full | ✅ Full | ✅ Assigned Store | ✅ Full | ❌ Denied |

*\*Note on Guard Bypass:* `PermissionsGuard` line 35 contains an unconditional bypass for `user.roleCode === 'OWNER'`, allowing tenant owners to bypass permission checks on system tenant endpoints.

---

## 3. Enforcement Architecture & Flaws

1. **Guard Implementation (`backend/src/common/guards/permissions.guard.ts`):**
   - Retrieves permissions via `AuthService.getRolePermissions(roleCode, tenantId)`.
   - Caches `request.userPermissions` per request.
   - Evaluates `requiredPermissions.every(p => userPermissions.includes(p))`.
2. **Defect:** Any user with `OWNER` role skips evaluation. If an endpoint is meant for platform admins (like `/api/v1/tenants`), the guard permits access without verifying platform super-admin status.
3. **Remediation Recommendation:**
   ```typescript
   // Updated Guard Check:
   if (user.roleCode === 'SUPER_ADMIN') {
     return true;
   }
   // Do not unconditionally bypass OWNER for system-level actions!
   ```
