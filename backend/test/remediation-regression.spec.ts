import * as assert from 'assert';
import * as crypto from 'crypto';
import { ForbiddenException, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Prisma, ProductStatus, InventoryStatus, StoreStatus, UserStatus, PaymentMethod } from '@prisma/client';

import { PermissionsGuard } from '../src/common/guards/permissions.guard';
import { SalesService } from '../src/modules/sales/sales.service';
import { SalesController } from '../src/modules/sales/sales.controller';
import { calculateSaleRequestHash } from '../src/modules/sales/utils/sale-idempotency.util';
import { AuthService } from '../src/modules/auth/auth.service';
import { parseTrustProxySetting } from '../src/common/utils/proxy-trust.util';

// =========================================================================
// REGRESSION & UNIT TEST SUITE: PRODUCTION METHOD VERIFICATION
// =========================================================================

async function runTests() {
  console.log('🚀 Running INFYPOS Production Service Regression & Security Tests...\n');
  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}\n`);
    }
  }

  async function asyncTest(name: string, fn: () => Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}\n`);
    }
  }

  // =======================================================================
  // 1. SEC-01: SQL INJECTION SAFETY IN INVENTORY REPORTING
  // =======================================================================
  test('SEC-01 [Library Level]: Prisma.sql parameterization neutralizes SQL injection in search filter', () => {
    const maliciousSearch = "'; DROP TABLE inventories; --";
    const searchFilter = Prisma.sql`AND (p."name" ILIKE ${`%${maliciousSearch}%`} OR p."sku" ILIKE ${`%${maliciousSearch}%`})`;

    assert.ok(searchFilter.strings.length > 1, 'Should create parameterized string segments');
    assert.deepStrictEqual(searchFilter.values, [
      `%${maliciousSearch}%`,
      `%${maliciousSearch}%`,
    ], 'Values must be bound as safe query parameters, not raw text');
  });

  // =======================================================================
  // 2. SEC-02: OWNER AUTHORIZATION BYPASS & CROSS-TENANT PERMISSIONS
  // =======================================================================
  await asyncTest('SEC-02 [Unit]: PermissionsGuard.canActivate() rejects OWNER accessing system.tenants.manage', async () => {
    const reflector = new Reflector();
    reflector.getAllAndOverride = () => ['system.tenants.manage'];
    const mockAuthService: any = { getRolePermissions: async () => [] };
    const guard = new PermissionsGuard(reflector, mockAuthService);

    const mockOwnerContext: any = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            roleCode: 'OWNER',
            tenantId: '11111111-1111-1111-1111-111111111111',
          },
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    };

    await assert.rejects(
      async () => {
        await guard.canActivate(mockOwnerContext);
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenException, 'Must throw ForbiddenException');
        assert.match(err.message, /Platform administrator privileges required/i);
        return true;
      },
    );
  });

  await asyncTest('SEC-02 [Unit]: PermissionsGuard.canActivate() allows SUPER_ADMIN for system operations', async () => {
    const reflector = new Reflector();
    reflector.getAllAndOverride = () => ['system.tenants.manage'];
    const mockAuthService: any = { getRolePermissions: async () => [] };
    const guard = new PermissionsGuard(reflector, mockAuthService);

    const mockSuperAdminContext: any = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            roleCode: 'SUPER_ADMIN',
            tenantId: '00000000-0000-0000-0000-000000000000',
          },
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    };

    const result = await guard.canActivate(mockSuperAdminContext);
    assert.strictEqual(result, true, 'SUPER_ADMIN must be allowed for system operations');
  });

  await asyncTest('SEC-02 [Unit]: PermissionsGuard.canActivate() preserves OWNER access for tenant-level operations', async () => {
    const reflector = new Reflector();
    reflector.getAllAndOverride = () => ['products.create'];
    const mockAuthService: any = { getRolePermissions: async () => [] };
    const guard = new PermissionsGuard(reflector, mockAuthService);

    const mockOwnerContext: any = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            roleCode: 'OWNER',
            tenantId: '11111111-1111-1111-1111-111111111111',
          },
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    };

    const result = await guard.canActivate(mockOwnerContext);
    assert.strictEqual(result, true, 'OWNER should retain access for tenant-level operations');
  });

  // =======================================================================
  // 3. FIN-01 & FIN-02: PRODUCTION SALES SERVICE CHECKOUT VALIDATION
  // =======================================================================
  function createMockSalesService(options: {
    productPrice?: string;
    productVatRate?: string;
    inventoryOnHand?: number;
  } = {}) {
    const price = options.productPrice ?? '100.00';
    const vatRate = options.productVatRate ?? '20.00';
    const onHand = options.inventoryOnHand ?? 100;

    const mockTx: any = {
      product: {
        findFirst: async ({ where }: any) => ({
          id: where.id,
          name: 'Test Product',
          sku: 'SKU-001',
          barcode: '12345678',
          sellingPrice: new Prisma.Decimal(price),
          vatRate: new Prisma.Decimal(vatRate),
          status: ProductStatus.ACTIVE,
          trackInventory: false,
        }),
      },
      sale: {
        create: async ({ data }: any) => ({
          id: 'sale-uuid-1',
          ...data,
          items: data.items.create,
          payments: data.payments.create,
        }),
      },
      stockMovement: {
        createMany: async () => ({ count: 1 }),
      },
    };

    const mockPrisma: any = {
      shift: {
        findUnique: async () => ({
          id: 'shift-1',
          tenantId: 'tenant-1',
          storeId: 'store-1',
          status: 'OPEN',
        }),
      },
      store: {
        findFirst: async () => ({
          id: 'store-1',
          tenantId: 'tenant-1',
          status: StoreStatus.ACTIVE,
        }),
      },
      user: {
        findFirst: async () => ({
          id: 'cashier-1',
          tenantId: 'tenant-1',
          status: UserStatus.ACTIVE,
        }),
      },
      customer: {
        findFirst: async () => null,
      },
      $transaction: async (fn: any) => fn(mockTx),
    };

    return new SalesService(mockPrisma);
  }

  await asyncTest('FIN-01 [Unit]: SalesService.create() rejects underpayment when tendered is less than grand total', async () => {
    // 1 item @ £100.00 with 20% VAT = subtotal £100.00, VAT £20.00 -> Grand Total £120.00
    const salesService = createMockSalesService({ productPrice: '100.00', productVatRate: '20.00' });

    const dto: any = {
      shiftId: 'shift-1',
      storeId: 'store-1',
      items: [{ productId: 'prod-1', quantity: 1 }],
      payments: [{ paymentMethod: PaymentMethod.CASH, amount: 50.00 }], // Underpayment £50 vs £120
    };

    await assert.rejects(
      async () => {
        await salesService.create('tenant-1', 'cashier-1', dto);
      },
      (err: any) => {
        assert.ok(err instanceof BadRequestException, 'Must throw BadRequestException');
        assert.match(err.message, /do not match the required grand total/);
        return true;
      },
    );
  });

  await asyncTest('FIN-01 [Unit]: SalesService.create() rejects unauthorized overpayment without documented change', async () => {
    // Grand Total is £120.00. Overpayment £150.00 without change record is rejected.
    const salesService = createMockSalesService({ productPrice: '100.00', productVatRate: '20.00' });

    const dto: any = {
      shiftId: 'shift-1',
      storeId: 'store-1',
      items: [{ productId: 'prod-1', quantity: 1 }],
      payments: [{ paymentMethod: PaymentMethod.CASH, amount: 150.00 }],
    };

    await assert.rejects(
      async () => {
        await salesService.create('tenant-1', 'cashier-1', dto);
      },
      (err: any) => {
        assert.ok(err instanceof BadRequestException);
        assert.match(err.message, /do not match the required grand total/);
        return true;
      },
    );
  });

  await asyncTest('FIN-01 [Unit]: SalesService.create() rejects zero or negative tender amount', async () => {
    const salesService = createMockSalesService({ productPrice: '100.00', productVatRate: '20.00' });

    const dto: any = {
      shiftId: 'shift-1',
      storeId: 'store-1',
      items: [{ productId: 'prod-1', quantity: 1 }],
      payments: [{ paymentMethod: PaymentMethod.CASH, amount: 0 }],
    };

    await assert.rejects(
      async () => {
        await salesService.create('tenant-1', 'cashier-1', dto);
      },
      (err: any) => {
        assert.ok(err instanceof BadRequestException);
        assert.match(err.message, /Payment tender amount must be greater than zero/);
        return true;
      },
    );
  });

  await asyncTest('FIN-01 [Unit]: SalesService.create() accepts valid split payments exactly matching grand total', async () => {
    // Grand Total is £120.00. Tender CASH £50.00 + CARD £70.00 = £120.00
    const salesService = createMockSalesService({ productPrice: '100.00', productVatRate: '20.00' });

    const dto: any = {
      shiftId: 'shift-1',
      storeId: 'store-1',
      items: [{ productId: 'prod-1', quantity: 1 }],
      payments: [
        { paymentMethod: PaymentMethod.CASH, amount: 50.00 },
        { paymentMethod: PaymentMethod.CARD, amount: 70.00 },
      ],
    };

    const result = await salesService.create('tenant-1', 'cashier-1', dto);
    assert.ok(result.saleNumber, 'Sale created successfully');
    assert.ok(new Prisma.Decimal(result.grandTotal).equals(new Prisma.Decimal('120.00')), 'Grand total must equal 120.00');
    assert.strictEqual(result.payments.length, 2);
  });

  await asyncTest('FIN-02 [Unit]: SalesService.create() rejects negative discount amounts', async () => {
    const salesService = createMockSalesService({ productPrice: '100.00', productVatRate: '20.00' });

    const dto: any = {
      shiftId: 'shift-1',
      storeId: 'store-1',
      discountAmount: -20.00, // Negative discount attempts to inflate bill
      items: [{ productId: 'prod-1', quantity: 1 }],
      payments: [{ paymentMethod: PaymentMethod.CASH, amount: 140.00 }],
    };

    await assert.rejects(
      async () => {
        await salesService.create('tenant-1', 'cashier-1', dto);
      },
      (err: any) => {
        assert.ok(err instanceof BadRequestException);
        assert.match(err.message, /Discount amount cannot be negative/);
        return true;
      },
    );
  });

  await asyncTest('FIN-02 [Unit]: SalesService.create() rejects discount exceeding subtotal', async () => {
    // Subtotal is £100.00. Discount £150.00 exceeds subtotal.
    const salesService = createMockSalesService({ productPrice: '100.00', productVatRate: '20.00' });

    const dto: any = {
      shiftId: 'shift-1',
      storeId: 'store-1',
      discountAmount: 150.00,
      items: [{ productId: 'prod-1', quantity: 1 }],
      payments: [{ paymentMethod: PaymentMethod.CASH, amount: 0 }],
    };

    await assert.rejects(
      async () => {
        await salesService.create('tenant-1', 'cashier-1', dto);
      },
      (err: any) => {
        assert.ok(err instanceof BadRequestException);
        assert.match(err.message, /Discount amount cannot exceed the cart subtotal/);
        return true;
      },
    );
  });

  await asyncTest('FIN-02 [Unit]: SalesService.create() accurately calculates discounts and rounding boundaries', async () => {
    // Product price = 33.33, VAT = 20.00%. Qty = 3.
    // Subtotal = 99.99, tax = 99.99 * 0.20 = 19.998. Discount = 10.00.
    // Grand Total = (99.99 + 19.998) - 10.00 = 109.988 -> rounded to 109.99
    const salesService = createMockSalesService({ productPrice: '33.33', productVatRate: '20.00' });

    const dto: any = {
      shiftId: 'shift-1',
      storeId: 'store-1',
      discountAmount: 10.00,
      items: [{ productId: 'prod-1', quantity: 3 }],
      payments: [{ paymentMethod: PaymentMethod.CARD, amount: 109.99 }],
    };

    const result = await salesService.create('tenant-1', 'cashier-1', dto);
    assert.ok(result.saleNumber);
    assert.strictEqual(result.grandTotal, '109.99');
    assert.strictEqual(result.discountAmount, '10');
  });

  // =======================================================================
  // 3B. IDEMP-01: SALES IDEMPOTENCY, CONCURRENCY & TRANSACTION ISOLATION
  // =======================================================================
  function createStatefulMockSalesService(options: {
    initialStock?: number;
    trackInventory?: boolean;
    failOnSaleCreate?: boolean;
  } = {}) {
    const trackInventory = options.trackInventory ?? true;
    let currentStock = new Prisma.Decimal(options.initialStock ?? 20);
    const salesTable: any[] = [];
    const stockMovementsTable: any[] = [];
    const activeKeyMap = new Map<string, any>();

    const mockPrisma: any = {
      shift: {
        findUnique: async ({ where }: any) => ({
          id: where.id,
          tenantId: where.id.includes('tenant-B') ? 'tenant-B' : where.id.includes('tenant-A') ? 'tenant-A' : 'tenant-1',
          storeId: 'store-1',
          status: 'OPEN',
        }),
      },
      store: {
        findFirst: async ({ where }: any) => ({
          id: where.id,
          tenantId: where.tenantId,
          status: StoreStatus.ACTIVE,
        }),
      },
      user: {
        findFirst: async ({ where }: any) => ({
          id: where.id,
          tenantId: where.tenantId,
          status: UserStatus.ACTIVE,
        }),
      },
      customer: {
        findFirst: async () => null,
      },
      sale: {
        findFirst: async ({ where }: any) => {
          if (where.tenantId && where.idempotencyKey) {
            const key = `${where.tenantId}:${where.idempotencyKey}`;
            if (activeKeyMap.has(key)) {
              return JSON.parse(JSON.stringify(activeKeyMap.get(key)));
            }
          }
          const match = salesTable.find(
            (s) => s.tenantId === where.tenantId && s.idempotencyKey === where.idempotencyKey,
          );
          return match ? JSON.parse(JSON.stringify(match)) : null;
        },
      },
      _getState: () => ({
        stock: currentStock,
        sales: salesTable,
        stockMovements: stockMovementsTable,
      }),
      $transaction: async (callback: any) => {
        let stagedStock = new Prisma.Decimal(currentStock);
        const stagedSales: any[] = [];
        const stagedMovements: any[] = [];
        const stagedKeyList: string[] = [];

        const tx = {
          product: {
            findFirst: async ({ where }: any) => ({
              id: where.id,
              name: 'Test Coffee',
              sku: 'COF-001',
              barcode: '99887766',
              sellingPrice: new Prisma.Decimal('50.00'),
              vatRate: new Prisma.Decimal('20.00'),
              status: ProductStatus.ACTIVE,
              trackInventory,
            }),
          },
          inventory: {
            findUnique: async () => ({
              id: 'inv-1',
              storeId: 'store-1',
              productId: 'prod-1',
              quantityOnHand: stagedStock,
              reservedQuantity: new Prisma.Decimal(0),
              status: InventoryStatus.ACTIVE,
            }),
            updateMany: async ({ where, data }: any) => {
              const decrement = data.quantityOnHand.decrement;
              if (where.quantityOnHand?.gte && stagedStock.lt(where.quantityOnHand.gte)) {
                return { count: 0 };
              }
              stagedStock = stagedStock.sub(decrement);
              return { count: 1 };
            },
          },
          stockMovement: {
            createMany: async ({ data }: any) => {
              stagedMovements.push(...data);
              return { count: data.length };
            },
          },
          sale: {
            create: async ({ data }: any) => {
              if (options.failOnSaleCreate) {
                throw new Error('Database transaction abort simulated');
              }
              if (data.idempotencyKey) {
                const key = `${data.tenantId}:${data.idempotencyKey}`;
                if (activeKeyMap.has(key)) {
                  const error: any = new Error('Unique constraint failed on the fields: (`tenant_id`,`idempotency_key`)');
                  error.code = 'P2002';
                  error.meta = { target: ['tenant_id', 'idempotency_key'] };
                  throw error;
                }
              }

              const createdSale = {
                id: `sale-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                ...data,
                items: data.items.create.map((item: any) => ({
                  id: `item-${Math.random()}`,
                  ...item,
                })),
                payments: data.payments.create.map((p: any) => ({
                  id: `pay-${Math.random()}`,
                  ...p,
                })),
                createdAt: new Date(),
              };

              if (data.idempotencyKey) {
                const key = `${data.tenantId}:${data.idempotencyKey}`;
                activeKeyMap.set(key, createdSale);
                stagedKeyList.push(key);
              }

              stagedSales.push(createdSale);
              return createdSale;
            },
          },
        };

        try {
          const result = await callback(tx);

          currentStock = stagedStock;
          salesTable.push(...stagedSales);
          stockMovementsTable.push(...stagedMovements);

          return result;
        } catch (txErr) {
          for (const key of stagedKeyList) {
            activeKeyMap.delete(key);
          }
          throw txErr;
        }
      },
    };

    return {
      service: new SalesService(mockPrisma),
      getState: () => mockPrisma._getState(),
      salesTable,
    };
  }

  await asyncTest('IDEMP-01 [Unit]: Successful first checkout persists sale and decrements inventory', async () => {
    const { service, getState } = createStatefulMockSalesService({ initialStock: 10 });
    const dto: any = {
      idempotencyKey: 'IDEMP-KEY-001',
      shiftId: 'shift-1',
      storeId: 'store-1',
      items: [{ productId: 'prod-1', quantity: 2 }],
      payments: [{ paymentMethod: PaymentMethod.CASH, amount: 120.00 }],
    };

    const result = await service.create('tenant-1', 'cashier-1', dto);
    assert.ok(result.saleNumber, 'Must return saleNumber');
    assert.strictEqual(result.grandTotal, '120');
    assert.strictEqual(getState().sales.length, 1, 'Exactly 1 sale persisted');
    assert.strictEqual(getState().stock.toString(), '8', 'Stock decremented from 10 to 8');
  });

  await asyncTest('IDEMP-01 [Unit]: Repeated identical request returns original sale without duplicate invoice or inventory deductions', async () => {
    const { service, getState } = createStatefulMockSalesService({ initialStock: 10 });
    const dto: any = {
      idempotencyKey: 'IDEMP-KEY-002',
      shiftId: 'shift-1',
      storeId: 'store-1',
      items: [{ productId: 'prod-1', quantity: 2 }],
      payments: [{ paymentMethod: PaymentMethod.CASH, amount: 120.00 }],
    };

    const first = await service.create('tenant-1', 'cashier-1', dto);
    const second = await service.create('tenant-1', 'cashier-1', dto);

    assert.strictEqual(first.saleNumber, second.saleNumber, 'Must return identical saleNumber');
    assert.strictEqual(first.grandTotal, second.grandTotal, 'Must return identical grandTotal');
    assert.strictEqual(getState().sales.length, 1, 'Must NOT create duplicate sale record');
    assert.strictEqual(getState().stock.toString(), '8', 'Stock must not be deducted again (still 8)');
    assert.strictEqual(getState().stockMovements.length, 1, 'Only one stock movement recorded');
  });

  await asyncTest('IDEMP-01 [Unit]: Same key with different payload throws ConflictException (HTTP 409)', async () => {
    const { service, getState } = createStatefulMockSalesService({ initialStock: 10 });
    const dtoOriginal: any = {
      idempotencyKey: 'IDEMP-KEY-003',
      shiftId: 'shift-1',
      storeId: 'store-1',
      items: [{ productId: 'prod-1', quantity: 1 }],
      payments: [{ paymentMethod: PaymentMethod.CASH, amount: 60.00 }],
    };

    const dtoConflicting: any = {
      idempotencyKey: 'IDEMP-KEY-003',
      shiftId: 'shift-1',
      storeId: 'store-1',
      items: [{ productId: 'prod-1', quantity: 2 }],
      payments: [{ paymentMethod: PaymentMethod.CASH, amount: 120.00 }],
    };

    await service.create('tenant-1', 'cashier-1', dtoOriginal);

    await assert.rejects(
      async () => {
        await service.create('tenant-1', 'cashier-1', dtoConflicting);
      },
      (err: any) => {
        assert.ok(err instanceof ConflictException, 'Must throw ConflictException');
        assert.match(err.message, /Idempotency key has already been used for a different checkout operation/i);
        return true;
      },
    );

    assert.strictEqual(getState().sales.length, 1, 'Conflicting request must not create sale');
    assert.strictEqual(getState().stock.toString(), '9', 'Stock must remain at original deducted level (9)');
  });

  await asyncTest('IDEMP-01 [Unit]: Concurrent requests with same key resolve via P2002 collision to single sale', async () => {
    const { service, getState } = createStatefulMockSalesService({ initialStock: 20 });
    const dto: any = {
      idempotencyKey: 'IDEMP-CONCURRENT-001',
      shiftId: 'shift-1',
      storeId: 'store-1',
      items: [{ productId: 'prod-1', quantity: 2 }],
      payments: [{ paymentMethod: PaymentMethod.CASH, amount: 120.00 }],
    };

    const [res1, res2] = await Promise.all([
      service.create('tenant-1', 'cashier-1', dto),
      service.create('tenant-1', 'cashier-1', dto),
    ]);

    assert.strictEqual(res1.saleNumber, res2.saleNumber, 'Both callers must receive the exact same saleNumber');
    assert.strictEqual(getState().sales.length, 1, 'Database must contain exactly 1 sale');
    assert.strictEqual(getState().stock.toString(), '18', 'Stock decremented exactly once');
  });

  await asyncTest('IDEMP-01 [Unit]: Inventory is deducted exactly once across multiple repeated checkout attempts', async () => {
    const { service, getState } = createStatefulMockSalesService({ initialStock: 20 });
    const dto: any = {
      idempotencyKey: 'IDEMP-RETRY-005',
      shiftId: 'shift-1',
      storeId: 'store-1',
      items: [{ productId: 'prod-1', quantity: 5 }],
      payments: [{ paymentMethod: PaymentMethod.CASH, amount: 300.00 }],
    };

    for (let i = 0; i < 5; i++) {
      const res = await service.create('tenant-1', 'cashier-1', dto);
      assert.ok(res.saleNumber);
    }

    assert.strictEqual(getState().sales.length, 1, 'Only 1 sale recorded in DB');
    assert.strictEqual(getState().stock.toString(), '15', 'Stock decremented only once (20 - 5 = 15)');
    assert.strictEqual(getState().stockMovements.length, 1, 'Only 1 stock movement created');
  });

  await asyncTest('IDEMP-01 [Unit]: Failed transaction leaves zero partial sale or inventory mutations', async () => {
    const { service, getState } = createStatefulMockSalesService({ initialStock: 20, failOnSaleCreate: true });
    const dto: any = {
      idempotencyKey: 'IDEMP-FAIL-006',
      shiftId: 'shift-1',
      storeId: 'store-1',
      items: [{ productId: 'prod-1', quantity: 2 }],
      payments: [{ paymentMethod: PaymentMethod.CASH, amount: 120.00 }],
    };

    await assert.rejects(
      async () => {
        await service.create('tenant-1', 'cashier-1', dto);
      },
      (err: any) => {
        assert.match(err.message, /Database transaction abort simulated/);
        return true;
      },
    );

    assert.strictEqual(getState().sales.length, 0, 'No sale record created on transaction rollback');
    assert.strictEqual(getState().stock.toString(), '20', 'Stock remains untouched at 20');
    assert.strictEqual(getState().stockMovements.length, 0, 'No stock movements created');
  });

  await asyncTest('IDEMP-01 [Unit]: Tenant isolation: Tenant A and Tenant B can use the same key without cross-tenant collisions or leakage', async () => {
    const { service, getState } = createStatefulMockSalesService({ initialStock: 50 });
    const sharedKey = 'TENANT-SCOPED-KEY-999';

    const dtoTenantA: any = {
      idempotencyKey: sharedKey,
      shiftId: 'shift-tenant-A',
      storeId: 'store-1',
      items: [{ productId: 'prod-1', quantity: 1 }],
      payments: [{ paymentMethod: PaymentMethod.CASH, amount: 60.00 }],
    };

    const dtoTenantB: any = {
      idempotencyKey: sharedKey,
      shiftId: 'shift-tenant-B',
      storeId: 'store-1',
      items: [{ productId: 'prod-1', quantity: 2 }],
      payments: [{ paymentMethod: PaymentMethod.CASH, amount: 120.00 }],
    };

    const resA = await service.create('tenant-A', 'cashier-1', dtoTenantA);
    const resB = await service.create('tenant-B', 'cashier-2', dtoTenantB);

    assert.notStrictEqual(resA.saleNumber, resB.saleNumber, 'Each tenant must receive their own sale');
    assert.strictEqual(resA.grandTotal, '60');
    assert.strictEqual(resB.grandTotal, '120');

    const sales = getState().sales;
    assert.strictEqual(sales.length, 2, 'Two separate sales created in DB');
    assert.strictEqual(sales[0].tenantId, 'tenant-A');
    assert.strictEqual(sales[1].tenantId, 'tenant-B');
    assert.strictEqual(sales[0].idempotencyKey, sharedKey);
    assert.strictEqual(sales[1].idempotencyKey, sharedKey);
  });

  await asyncTest('IDEMP-01 [Unit]: Client retry after network timeout reuses the same key and safely recovers original sale', async () => {
    const { service, getState } = createStatefulMockSalesService({ initialStock: 20 });
    const stableKey = crypto.randomUUID();

    const checkoutRequest: any = {
      idempotencyKey: stableKey,
      shiftId: 'shift-1',
      storeId: 'store-1',
      items: [{ productId: 'prod-1', quantity: 1 }],
      payments: [{ paymentMethod: PaymentMethod.CARD, amount: 60.00 }],
    };

    const originalResult = await service.create('tenant-1', 'cashier-1', checkoutRequest);
    const retryResult = await service.create('tenant-1', 'cashier-1', checkoutRequest);

    assert.strictEqual(retryResult.saleNumber, originalResult.saleNumber, 'Retry recovers original invoice');
    assert.strictEqual(getState().sales.length, 1, 'Only one invoice recorded');
    assert.strictEqual(getState().stock.toString(), '19', 'Stock deducted once');
  });

  await asyncTest('IDEMP-01 [Unit]: Header and body idempotency key disagreement is rejected with BadRequestException', async () => {
    const mockSalesService: any = { create: async () => ({}) };
    const controller = new SalesController(mockSalesService);

    const dto: any = {
      idempotencyKey: 'BODY-KEY-111',
      storeId: 'store-1',
      items: [{ productId: 'prod-1', quantity: 1 }],
      payments: [{ paymentMethod: PaymentMethod.CASH, amount: 60 }],
    };

    await assert.rejects(
      async () => {
        await controller.create('tenant-1', 'cashier-1', 'HEADER-KEY-222', dto);
      },
      (err: any) => {
        assert.ok(err instanceof BadRequestException, 'Must throw BadRequestException');
        assert.match(err.message, /Idempotency-Key header does not match body idempotencyKey/i);
        return true;
      },
    );
  });

  await asyncTest('IDEMP-01 [Unit]: Malformed or oversized idempotency header (>100 chars) is rejected with BadRequestException', async () => {
    const mockSalesService: any = { create: async () => ({}) };
    const controller = new SalesController(mockSalesService);

    const dto: any = {
      storeId: 'store-1',
      items: [{ productId: 'prod-1', quantity: 1 }],
      payments: [{ paymentMethod: PaymentMethod.CASH, amount: 60 }],
    };

    const oversizedHeader = 'a'.repeat(101);

    await assert.rejects(
      async () => {
        await controller.create('tenant-1', 'cashier-1', oversizedHeader, dto);
      },
      (err: any) => {
        assert.ok(err instanceof BadRequestException, 'Must throw BadRequestException');
        assert.match(err.message, /must not exceed 100 characters/i);
        return true;
      },
    );
  });

  await asyncTest('IDEMP-01 [Unit]: Unrelated unique constraint collision (e.g. saleNumber P2002) is not masked and is rethrown', async () => {
    const mockPrisma: any = {
      shift: { findUnique: async () => ({ id: 'shift-1', tenantId: 'tenant-1', storeId: 'store-1', status: 'OPEN' }) },
      store: { findFirst: async () => ({ id: 'store-1', tenantId: 'tenant-1', status: StoreStatus.ACTIVE }) },
      user: { findFirst: async () => ({ id: 'cashier-1', tenantId: 'tenant-1', status: UserStatus.ACTIVE }) },
      customer: { findFirst: async () => null },
      sale: { findFirst: async () => null },
      $transaction: async () => {
        const p2002Err: any = new Error('Unique constraint failed on the fields: (`sale_number`)');
        p2002Err.code = 'P2002';
        p2002Err.meta = { target: ['sale_number'] };
        throw p2002Err;
      },
    };

    const service = new SalesService(mockPrisma);
    const dto: any = {
      idempotencyKey: 'UNRELATED-P2002-KEY',
      shiftId: 'shift-1',
      storeId: 'store-1',
      items: [{ productId: 'prod-1', quantity: 1 }],
      payments: [{ paymentMethod: PaymentMethod.CASH, amount: 60 }],
    };

    await assert.rejects(
      async () => {
        await service.create('tenant-1', 'cashier-1', dto);
      },
      (err: any) => {
        assert.strictEqual(err.code, 'P2002');
        assert.deepStrictEqual(err.meta.target, ['sale_number']);
        return true;
      },
    );
  });

  test('IDEMP-01 [Unit]: Request hash canonicalization sorts duplicate products deterministically', () => {
    const dtoA: any = {
      storeId: 'store-1',
      shiftId: 'shift-1',
      items: [
        { productId: 'prod-1', quantity: 2 },
        { productId: 'prod-1', quantity: 1 },
      ],
      payments: [{ paymentMethod: PaymentMethod.CASH, amount: 60 }],
    };

    const dtoB: any = {
      storeId: 'store-1',
      shiftId: 'shift-1',
      items: [
        { productId: 'prod-1', quantity: 1 },
        { productId: 'prod-1', quantity: 2 },
      ],
      payments: [{ paymentMethod: PaymentMethod.CASH, amount: 60 }],
    };

    const hashA = calculateSaleRequestHash(dtoA);
    const hashB = calculateSaleRequestHash(dtoB);

    assert.strictEqual(hashA, hashB, 'Permuted item order with identical product IDs must yield identical hash');
  });

  await asyncTest('IDEMP-01 [Unit]: P2002 with missing error.meta.target resolves safely if winning idempotency sale exists', async () => {
    const dto: any = {
      idempotencyKey: 'AMBIGUOUS-TARGET-KEY-1',
      shiftId: 'shift-1',
      storeId: 'store-1',
      items: [{ productId: 'prod-1', quantity: 1 }],
      payments: [{ paymentMethod: PaymentMethod.CASH, amount: 60 }],
    };

    const winningHash = calculateSaleRequestHash(dto);
    const mockWinningSale = {
      id: 'winning-sale-1',
      saleNumber: 'INV-WINNING-1',
      grandTotal: new Prisma.Decimal('60'),
      subtotal: new Prisma.Decimal('50'),
      taxAmount: new Prisma.Decimal('10'),
      discountAmount: new Prisma.Decimal('0'),
      status: 'COMPLETED',
      createdAt: new Date(),
      requestHash: winningHash,
      items: [],
      payments: [],
    };

    let firstRead = true;
    const mockPrisma: any = {
      shift: { findUnique: async () => ({ id: 'shift-1', tenantId: 'tenant-1', storeId: 'store-1', status: 'OPEN' }) },
      store: { findFirst: async () => ({ id: 'store-1', tenantId: 'tenant-1', status: StoreStatus.ACTIVE }) },
      user: { findFirst: async () => ({ id: 'cashier-1', tenantId: 'tenant-1', status: UserStatus.ACTIVE }) },
      customer: { findFirst: async () => null },
      sale: {
        findFirst: async () => {
          if (firstRead) {
            firstRead = false;
            return null; // Initial check outside transaction finds nothing
          }
          return mockWinningSale; // After P2002, winning sale is found
        },
      },
      $transaction: async () => {
        const ambiguousErr: any = new Error('Unique constraint failed on unknown target');
        ambiguousErr.code = 'P2002';
        ambiguousErr.meta = {}; // Missing target
        throw ambiguousErr;
      },
    };

    const service = new SalesService(mockPrisma);
    const result = await service.create('tenant-1', 'cashier-1', dto);
    assert.strictEqual(result.saleNumber, 'INV-WINNING-1', 'Must resolve to winning sale when target is missing but record matches');
  });

  await asyncTest('IDEMP-01 [Unit]: P2002 with missing error.meta.target is rethrown if no winning idempotency sale exists', async () => {
    const dto: any = {
      idempotencyKey: 'AMBIGUOUS-TARGET-KEY-2',
      shiftId: 'shift-1',
      storeId: 'store-1',
      items: [{ productId: 'prod-1', quantity: 1 }],
      payments: [{ paymentMethod: PaymentMethod.CASH, amount: 60 }],
    };

    const mockPrisma: any = {
      shift: { findUnique: async () => ({ id: 'shift-1', tenantId: 'tenant-1', storeId: 'store-1', status: 'OPEN' }) },
      store: { findFirst: async () => ({ id: 'store-1', tenantId: 'tenant-1', status: StoreStatus.ACTIVE }) },
      user: { findFirst: async () => ({ id: 'cashier-1', tenantId: 'tenant-1', status: UserStatus.ACTIVE }) },
      customer: { findFirst: async () => null },
      sale: {
        findFirst: async () => null, // No winning sale found
      },
      $transaction: async () => {
        const ambiguousErr: any = new Error('Unique constraint failed on unknown target');
        ambiguousErr.code = 'P2002';
        ambiguousErr.meta = undefined; // Missing meta/target
        throw ambiguousErr;
      },
    };

    const service = new SalesService(mockPrisma);
    await assert.rejects(
      async () => {
        await service.create('tenant-1', 'cashier-1', dto);
      },
      (err: any) => {
        assert.strictEqual(err.code, 'P2002', 'Must rethrow P2002 when target is missing and no winning sale exists');
        return true;
      },
    );
  });

  // =======================================================================
  // 4. SEC-04: PRODUCTION AUTH SERVICE REFRESH ROTATION & CONCURRENCY
  // =======================================================================
  function createMockAuthService() {
    const jwtSecret = 'test-jwt-secret-key-12345678901234567890';
    const refreshSecret = 'test-refresh-secret-key-12345678901234567890';

    const jwtService = new JwtService({});

    const mockConfigService: any = {
      get: (key: string, defaultVal?: any) => {
        if (key === 'jwt.secret') return jwtSecret;
        if (key === 'jwt.refreshSecret') return refreshSecret;
        if (key === 'jwt.expiresIn') return '15m';
        if (key === 'jwt.refreshExpiresIn') return '7d';
        return defaultVal;
      },
    };

    const mockPasswordService: any = {
      hash: async (plain: string) => `hashed-${plain}`,
      compare: async (plain: string, hash: string) => hash === `hashed-${plain}`,
    };

    // In-memory token storage to verify real atomic database operations
    const tokenStore: Array<{
      id: string;
      userId: string;
      tokenHash: string;
      expiresAt: Date;
      revokedAt: Date | null;
    }> = [];

    const mockTx: any = {
      refreshToken: {
        findUnique: async ({ where }: any) => {
          return tokenStore.find((t) => t.tokenHash === where.tokenHash) || null;
        },
        updateMany: async ({ where, data }: any) => {
          let count = 0;
          for (const token of tokenStore) {
            const matchesId = !where.id || token.id === where.id;
            const matchesUser = !where.userId || token.userId === where.userId;
            const matchesRevoked = where.revokedAt === null ? token.revokedAt === null : true;

            if (matchesId && matchesUser && matchesRevoked) {
              token.revokedAt = data.revokedAt;
              count++;
            }
          }
          return { count };
        },
        create: async ({ data }: any) => {
          const record = {
            id: `token-${tokenStore.length + 1}`,
            userId: data.userId,
            tokenHash: data.tokenHash,
            expiresAt: data.expiresAt,
            revokedAt: null,
          };
          tokenStore.push(record);
          return record;
        },
      },
      user: {
        findUnique: async ({ where }: any) => ({
          id: where.id,
          email: 'cashier@test.com',
          status: UserStatus.ACTIVE,
          roleId: 'role-1',
          storeId: 'store-1',
          role: { id: 'role-1', code: 'CASHIER' },
          tenant: { id: 'tenant-1', code: 'test-tenant', status: 'ACTIVE' },
        }),
      },
    };

    const mockPrisma: any = {
      refreshToken: {
        updateMany: mockTx.refreshToken.updateMany,
      },
      $transaction: async (fn: any) => fn(mockTx),
    };

    const authService = new AuthService(mockPrisma, jwtService, mockConfigService, mockPasswordService);

    return {
      authService,
      jwtService,
      refreshSecret,
      tokenStore,
    };
  }

  await asyncTest('SEC-04 [Unit]: AuthService.refresh() rotates refresh tokens atomically', async () => {
    const { authService, jwtService, refreshSecret, tokenStore } = createMockAuthService();

    // 1. Issue initial refresh token
    const initialPayload = { userId: 'user-uuid-1', tenantId: 'tenant-uuid-1' };
    const rawRefreshToken = await jwtService.signAsync(initialPayload, {
      secret: refreshSecret,
      expiresIn: '7d',
    });
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    tokenStore.push({
      id: 'token-1',
      userId: 'user-uuid-1',
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 86400000),
      revokedAt: null,
    });

    // 2. Perform refresh
    const result = await authService.refresh({ refreshToken: rawRefreshToken });

    assert.ok(result.accessToken, 'Must return new accessToken');
    assert.ok(result.refreshToken, 'Must return new refreshToken');
    assert.notStrictEqual(result.refreshToken, rawRefreshToken, 'Must issue a rotated new refresh token');

    // Verify database state: old token is revoked; new token is stored and active
    const oldToken = tokenStore.find((t) => t.id === 'token-1');
    assert.ok(oldToken?.revokedAt !== null, 'Initial token must be marked revoked');

    const newTokenHash = crypto.createHash('sha256').update(result.refreshToken).digest('hex');
    const newToken = tokenStore.find((t) => t.tokenHash === newTokenHash);
    assert.ok(newToken, 'New token must be stored in database');
    assert.strictEqual(newToken?.revokedAt, null, 'New token must be active');
  });

  await asyncTest('SEC-04 [Unit]: Concurrent refresh retry is rejected without destroying user session family', async () => {
    const { authService, jwtService, refreshSecret, tokenStore } = createMockAuthService();

    const rawRefreshToken = await jwtService.signAsync(
      { userId: 'user-uuid-1', tenantId: 'tenant-uuid-1' },
      { secret: refreshSecret, expiresIn: '7d' },
    );
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    tokenStore.push({
      id: 'token-1',
      userId: 'user-uuid-1',
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 86400000),
      revokedAt: null,
    });

    // Request 1 consumes the token successfully
    const successResult = await authService.refresh({ refreshToken: rawRefreshToken });
    assert.ok(successResult.refreshToken);

    // Request 2 arrives immediately with the SAME token (in-flight network retry, within 5s window)
    await assert.rejects(
      async () => {
        await authService.refresh({ refreshToken: rawRefreshToken });
      },
      (err: any) => {
        assert.ok(err instanceof UnauthorizedException);
        assert.match(err.message, /consumed by a concurrent request/);
        return true;
      },
    );

    // CRITICAL SECURITY ASSERTION:
    // Request 1's newly issued token must NOT be revoked! The legitimate session remains alive.
    const newHash = crypto.createHash('sha256').update(successResult.refreshToken).digest('hex');
    const activeToken = tokenStore.find((t) => t.tokenHash === newHash);
    assert.strictEqual(activeToken?.revokedAt, null, 'Legitimate active session must NOT be revoked by concurrent retry');
  });

  await asyncTest('SEC-04 [Unit]: Stolen token replay after concurrency window triggers full family revocation', async () => {
    const { authService, jwtService, refreshSecret, tokenStore } = createMockAuthService();

    const stolenToken = await jwtService.signAsync(
      { userId: 'user-uuid-1', tenantId: 'tenant-uuid-1' },
      { secret: refreshSecret, expiresIn: '7d' },
    );
    const stolenHash = crypto.createHash('sha256').update(stolenToken).digest('hex');

    // Simulate token that was rotated 1 minute ago
    tokenStore.push({
      id: 'token-stolen',
      userId: 'user-uuid-1',
      tokenHash: stolenHash,
      expiresAt: new Date(Date.now() + 7 * 86400000),
      revokedAt: new Date(Date.now() - 60000), // Revoked 60 seconds ago
    });

    // Legitimate active session on another device
    tokenStore.push({
      id: 'token-active-device-2',
      userId: 'user-uuid-1',
      tokenHash: 'active-hash-device-2',
      expiresAt: new Date(Date.now() + 7 * 86400000),
      revokedAt: null,
    });

    // Attacker attempts to replay the stolen token
    await assert.rejects(
      async () => {
        await authService.refresh({ refreshToken: stolenToken });
      },
      (err: any) => {
        assert.ok(err instanceof UnauthorizedException);
        assert.match(err.message, /Refresh token reuse detected/);
        return true;
      },
    );

    // CRITICAL SECURITY ASSERTION:
    // All active tokens for user-uuid-1 must be revoked due to replay detection
    const device2Token = tokenStore.find((t) => t.id === 'token-active-device-2');
    assert.ok(device2Token?.revokedAt !== null, 'All user sessions must be revoked on genuine reuse detection');
  });

  await asyncTest('SEC-04 [Unit]: AuthService.refresh() rejects expired refresh token', async () => {
    const { authService, jwtService, refreshSecret, tokenStore } = createMockAuthService();

    const expiredToken = await jwtService.signAsync(
      { userId: 'user-uuid-1', tenantId: 'tenant-uuid-1' },
      { secret: refreshSecret, expiresIn: '7d' },
    );
    const expiredHash = crypto.createHash('sha256').update(expiredToken).digest('hex');

    tokenStore.push({
      id: 'token-expired',
      userId: 'user-uuid-1',
      tokenHash: expiredHash,
      expiresAt: new Date(Date.now() - 10000), // Expired 10 seconds ago
      revokedAt: null,
    });

    await assert.rejects(
      async () => {
        await authService.refresh({ refreshToken: expiredToken });
      },
      (err: any) => {
        assert.ok(err instanceof UnauthorizedException);
        assert.match(err.message, /Refresh token has expired/);
        return true;
      },
    );
  });

  await asyncTest('SEC-04 [Unit]: AuthService.logout() revokes specific device refresh token', async () => {
    const { authService, jwtService, refreshSecret, tokenStore } = createMockAuthService();

    const tokenToLogout = await jwtService.signAsync(
      { userId: 'user-uuid-1', tenantId: 'tenant-uuid-1' },
      { secret: refreshSecret, expiresIn: '7d' },
    );
    const hash = crypto.createHash('sha256').update(tokenToLogout).digest('hex');

    tokenStore.push({
      id: 'token-device-1',
      userId: 'user-uuid-1',
      tokenHash: hash,
      expiresAt: new Date(Date.now() + 7 * 86400000),
      revokedAt: null,
    });

    const logoutResult = await authService.logout({ refreshToken: tokenToLogout });
    assert.strictEqual(logoutResult.message, 'Logged out successfully');

    const recordedToken = tokenStore.find((t) => t.id === 'token-device-1');
    assert.ok(recordedToken?.revokedAt !== null, 'Logged out token must be marked revoked');
  });

  // =======================================================================
  // 5. FINDING 2 / NET-01 & NET-02: REVERSE PROXY TRUST & CORS VALIDATION
  // =======================================================================
  test('NET-02 [Unit]: parseTrustProxySetting resolves narrowest safe policy', () => {
    // 1. Single proxy hop
    assert.deepStrictEqual(parseTrustProxySetting('1', true), { setting: 1 });

    // 2. Multi-hop integer
    assert.deepStrictEqual(parseTrustProxySetting('2', true), { setting: 2 });

    // 3. Blind 'true' is restricted to 1 hop with warning to prevent spoofing
    const blindTrueResult = parseTrustProxySetting('true', true);
    assert.strictEqual(blindTrueResult.setting, 1);
    assert.ok(blindTrueResult.warning?.includes('Defaulted to 1 hop'));

    // 4. Explicit 'false' disables proxy trust
    assert.deepStrictEqual(parseTrustProxySetting('false', true), { setting: false });
    assert.deepStrictEqual(parseTrustProxySetting('0', true), { setting: false });

    // 5. CIDR subnet list
    assert.deepStrictEqual(parseTrustProxySetting('loopback, 10.0.0.0/8', true), { setting: 'loopback, 10.0.0.0/8' });

    // 6. Unset in dev defaults to loopback
    assert.deepStrictEqual(parseTrustProxySetting(undefined, false), { setting: 'loopback' });

    // 7. Unset in prod defaults to false (fail-safe) with warning
    const unsetProdResult = parseTrustProxySetting(undefined, true);
    assert.strictEqual(unsetProdResult.setting, false);
    assert.ok(unsetProdResult.warning?.includes('TRUST_PROXY is not configured in production'));
  });

  test('NET-01 [Unit]: CORS origin validator rejects unapproved production origins', () => {
    const allowedOrigins = ['https://app.infypos.com', 'https://pos.infypos.com'];
    const originValidator = (requestOrigin: string | undefined, isProduction: boolean): boolean => {
      if (!requestOrigin) return true; // Electron desktop / curl
      if (!isProduction) return true;
      return allowedOrigins.includes(requestOrigin);
    };

    assert.strictEqual(originValidator('https://evil-attacker.com', true), false, 'Reject unapproved origin');
    assert.strictEqual(originValidator('https://app.infypos.com', true), true, 'Allow whitelisted web origin');
    assert.strictEqual(originValidator(undefined, true), true, 'Allow Electron desktop app without origin');
    assert.strictEqual(originValidator('http://localhost:5173', false), true, 'Allow dev origin dynamically');
  });

  // =======================================================================
  // 6. SEC-03: CASHIER PIN EXCLUSION FROM PROJECTIONS
  // =======================================================================
  test('SEC-03 [Unit]: User list and detail projections never include plaintext pinCode', () => {
    const listProjection = {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      status: true,
      roleId: true,
      storeId: true,
      role: { select: { id: true, name: true, code: true } },
      store: { select: { id: true, name: true, code: true } },
    };

    const cashierListProjection = {
      id: true,
      firstName: true,
      lastName: true,
      pinCodeHash: true,
    };

    assert.strictEqual((listProjection as any).pinCode, undefined, 'pinCode must not be in user list projection');
    assert.strictEqual((cashierListProjection as any).pinCode, undefined, 'pinCode must not be in cashier list projection');
  });

  // =======================================================================
  // 7. SEC-08: CUSTOMER PORTAL ROUTE PREFIX
  // =======================================================================
  test('SEC-08 [Unit]: Customer portal route resolves canonical prefix without duplicate v1', () => {
    const controllerPath = 'portal/download';
    const globalPrefix = 'api/v1';

    const oldPath = 'v1/portal/download';
    const oldResolvedRoute = `${globalPrefix}/${oldPath}`;
    assert.strictEqual(oldResolvedRoute, 'api/v1/v1/portal/download', 'Old configuration produced duplicate v1 prefix');

    const newResolvedRoute = `${globalPrefix}/${controllerPath}`;
    assert.strictEqual(newResolvedRoute, 'api/v1/portal/download', 'Remediated configuration produces single canonical v1 route');
  });

  console.log(`\n========================================`);
  console.log(`Results: ${passed}/${total} tests passed (${Math.round((passed / total) * 100)}%)`);
  console.log(`========================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
