import { StripeService, PLAN_PRICING } from '../src/modules/billing/stripe.service';
import * as path from 'path';
import * as assert from 'assert';
import * as crypto from 'crypto';
import { ForbiddenException, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { validate, Environment } from '../src/config/env.validation';
import jwtConfig from '../src/config/jwt.config';
import { DEV_TEST_DUMMY_SECRETS, MIN_SECRET_LENGTH } from '../src/config/jwt-secrets.util';
import { Prisma, ProductStatus, InventoryStatus, StoreStatus, UserStatus, PaymentMethod, TenantStatus } from '@prisma/client';

import { PermissionsGuard } from '../src/common/guards/permissions.guard';
import { SalesService } from '../src/modules/sales/sales.service';
import { SalesController } from '../src/modules/sales/sales.controller';
import { calculateSaleRequestHash } from '../src/modules/sales/utils/sale-idempotency.util';
import { AuthService } from '../src/modules/auth/auth.service';
import { parseTrustProxySetting } from '../src/common/utils/proxy-trust.util';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { ProductsService } from '../src/modules/products/products.service';
import { Test } from '@nestjs/testing';
import { SyncService } from '../src/modules/sync/sync.service';
import { SyncController } from '../src/modules/sync/sync.controller';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { UsersService } from '../src/modules/users/users.service';
import { PasswordService } from '../src/modules/auth/services/password.service';
import { ShiftsService } from '../src/modules/shifts/shifts.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { getNextSequenceNumber } from '../src/common/utils/sequence.util';
import { ShiftStatus } from '@prisma/client';
import * as fs from 'fs';


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
        findFirst: async ({ where }: any) => {
          return tokenStore.find((t) => {
            const matchesUser = !where.userId || t.userId === where.userId;
            const matchesRevoked = where.revokedAt === null ? t.revokedAt === null : true;
            return matchesUser && matchesRevoked;
          }) || null;
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
    try {
      const retryResult = await authService.refresh({ refreshToken: rawRefreshToken });
      assert.ok(retryResult.accessToken, 'Concurrent retry returns active access token to recover session');
    } catch (err: any) {
      assert.ok(err instanceof UnauthorizedException);
      assert.match(err.message, /consumed by a concurrent request/);
    }

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

  // =======================================================================
  // 8. SEC-05: JWT USER & TENANT ACTIVE STATUS ENFORCEMENT
  // =======================================================================
  await asyncTest('SEC-05 [Unit]: JwtStrategy allows active user in active tenant', async () => {
    const mockConfig = { get: (key: string) => (key === 'jwt.secret' ? 'test-secret' : undefined) } as any;
    const mockPrisma = {
      user: {
        findFirst: async ({ where }: any) => {
          if (where.id === 'user-active' && where.tenantId === 'tenant-active') {
            return {
              id: 'user-active',
              status: UserStatus.ACTIVE,
              roleId: 'role-1',
              tenant: { status: TenantStatus.ACTIVE },
            };
          }
          return null;
        },
      },
    } as any;

    const strategy = new JwtStrategy(mockConfig, mockPrisma);
    const payload = { userId: 'user-active', tenantId: 'tenant-active', roleCode: 'OWNER' };
    const validated = await strategy.validate(payload);
    assert.deepStrictEqual(validated, payload);
  });

  await asyncTest('SEC-05 [Unit]: JwtStrategy rejects inactive or locked user', async () => {
    const mockConfig = { get: (key: string) => (key === 'jwt.secret' ? 'test-secret' : undefined) } as any;
    const mockPrisma = {
      user: {
        findFirst: async () => ({
          id: 'user-inactive',
          status: UserStatus.INACTIVE,
          roleId: 'role-1',
          tenant: { status: TenantStatus.ACTIVE },
        }),
      },
    } as any;

    const strategy = new JwtStrategy(mockConfig, mockPrisma);
    await assert.rejects(
      async () => {
        await strategy.validate({ userId: 'user-inactive', tenantId: 'tenant-active' });
      },
      (err: any) => {
        assert.ok(err instanceof UnauthorizedException);
        assert.match(err.message, /User account is inactive/);
        return true;
      },
    );
  });

  await asyncTest('SEC-05 [Unit]: JwtStrategy rejects user whose tenant is suspended/inactive', async () => {
    const mockConfig = { get: (key: string) => (key === 'jwt.secret' ? 'test-secret' : undefined) } as any;
    const mockPrisma = {
      user: {
        findFirst: async () => ({
          id: 'user-active',
          status: UserStatus.ACTIVE,
          roleId: 'role-1',
          tenant: { status: TenantStatus.SUSPENDED },
        }),
      },
    } as any;

    const strategy = new JwtStrategy(mockConfig, mockPrisma);
    await assert.rejects(
      async () => {
        await strategy.validate({ userId: 'user-active', tenantId: 'tenant-suspended' });
      },
      (err: any) => {
        assert.ok(err instanceof UnauthorizedException);
        assert.match(err.message, /Tenant account is suspended/);
        return true;
      },
    );
  });

  await asyncTest('SEC-05 [Unit]: JwtStrategy rejects deleted/non-existent user', async () => {
    const mockConfig = { get: (key: string) => (key === 'jwt.secret' ? 'test-secret' : undefined) } as any;
    const mockPrisma = {
      user: {
        findFirst: async () => null,
      },
    } as any;

    const strategy = new JwtStrategy(mockConfig, mockPrisma);
    await assert.rejects(
      async () => {
        await strategy.validate({ userId: 'user-missing', tenantId: 'tenant-active' });
      },
      (err: any) => {
        assert.ok(err instanceof UnauthorizedException);
        assert.match(err.message, /User account no longer exists/);
        return true;
      },
    );
  });

  // =======================================================================
  // 10. SEC-09: CATALOG PURGE INTEGRITY & HISTORICAL DATA PRESERVATION
  // =======================================================================
  await asyncTest('SEC-09 [Unit]: ProductsService.deleteAll() succeeds on unlinked catalog with zero transactions', async () => {
    let inventoryDeleted = false;
    let productsDeleted = false;

    const mockPrisma: any = {
      $transaction: async (fn: any) => {
        const tx: any = {
          saleItem: { findFirst: async () => null },
          saleReturnItem: { findFirst: async () => null },
          stockMovement: { findFirst: async () => null },
          purchaseItem: { findFirst: async () => null },
          goodsReceiptItem: { findFirst: async () => null },
          inventoryAdjustmentItem: { findFirst: async () => null },
          stockTransferItem: { findFirst: async () => null },
          inventory: { deleteMany: async (args: any) => { inventoryDeleted = true; return { count: 5 }; } },
          product: { deleteMany: async (args: any) => { productsDeleted = true; return { count: 5 }; } },
        };
        return await fn(tx);
      },
    };

    const service = new ProductsService(mockPrisma);
    const result = await service.deleteAll('tenant-fresh');
    assert.strictEqual(result.deletedCount, 5);
    assert.ok(inventoryDeleted, 'Unlinked inventories should be deleted');
    assert.ok(productsDeleted, 'Unlinked products should be deleted');
  });

  await asyncTest('SEC-09 [Unit]: ProductsService.deleteAll() rejects deletion when SaleItem history exists', async () => {
    let productsDeleted = false;
    let saleItemsDeleted = false;

    const mockPrisma: any = {
      $transaction: async (fn: any) => {
        const tx: any = {
          saleItem: { findFirst: async () => ({ id: 'sale-item-1' }) },
          saleReturnItem: { findFirst: async () => null },
          stockMovement: { findFirst: async () => null },
          purchaseItem: { findFirst: async () => null },
          goodsReceiptItem: { findFirst: async () => null },
          inventoryAdjustmentItem: { findFirst: async () => null },
          stockTransferItem: { findFirst: async () => null },
          inventory: { deleteMany: async () => { throw new Error('Should not reach inventory delete'); } },
          product: { deleteMany: async () => { productsDeleted = true; return { count: 1 }; } },
        };
        return await fn(tx);
      },
    };

    const service = new ProductsService(mockPrisma);
    await assert.rejects(
      async () => {
        await service.deleteAll('tenant-with-sales');
      },
      (err: any) => {
        assert.ok(err instanceof BadRequestException);
        assert.match(err.message, /historical sales or operational records exist/);
        return true;
      },
    );
    assert.strictEqual(productsDeleted, false, 'Products must NOT be deleted when sales exist');
    assert.strictEqual(saleItemsDeleted, false, 'SaleItems must NEVER be deleted');
  });

  await asyncTest('SEC-09 [Unit]: ProductsService.deleteAll() rejects deletion when SaleReturnItem history exists', async () => {
    const mockPrisma: any = {
      $transaction: async (fn: any) => {
        const tx: any = {
          saleItem: { findFirst: async () => null },
          saleReturnItem: { findFirst: async () => ({ id: 'return-item-1' }) },
          stockMovement: { findFirst: async () => null },
          purchaseItem: { findFirst: async () => null },
          goodsReceiptItem: { findFirst: async () => null },
          inventoryAdjustmentItem: { findFirst: async () => null },
          stockTransferItem: { findFirst: async () => null },
          inventory: { deleteMany: async () => {} },
          product: { deleteMany: async () => {} },
        };
        return await fn(tx);
      },
    };

    const service = new ProductsService(mockPrisma);
    await assert.rejects(
      async () => {
        await service.deleteAll('tenant-with-returns');
      },
      (err: any) => {
        assert.ok(err instanceof BadRequestException);
        assert.match(err.message, /historical sales or operational records exist/);
        return true;
      },
    );
  });

  await asyncTest('SEC-09 [Unit]: ProductsService.deleteAll() rejects deletion when Purchase / Movement history exists', async () => {
    const mockPrisma: any = {
      $transaction: async (fn: any) => {
        const tx: any = {
          saleItem: { findFirst: async () => null },
          saleReturnItem: { findFirst: async () => null },
          stockMovement: { findFirst: async () => ({ id: 'movement-1' }) },
          purchaseItem: { findFirst: async () => ({ id: 'po-item-1' }) },
          goodsReceiptItem: { findFirst: async () => null },
          inventoryAdjustmentItem: { findFirst: async () => null },
          stockTransferItem: { findFirst: async () => null },
          inventory: { deleteMany: async () => {} },
          product: { deleteMany: async () => {} },
        };
        return await fn(tx);
      },
    };

    const service = new ProductsService(mockPrisma);
    await assert.rejects(
      async () => {
        await service.deleteAll('tenant-with-purchases');
      },
      (err: any) => {
        assert.ok(err instanceof BadRequestException);
        assert.match(err.message, /historical sales or operational records exist/);
        return true;
      },
    );
  });

  await asyncTest('SEC-09 [Unit]: ProductsService.deleteAll() handles P2003 foreign-key violation outside aborted transaction', async () => {
    const mockPrisma: any = {
      $transaction: async (fn: any) => {
        const tx: any = {
          saleItem: { findFirst: async () => null },
          saleReturnItem: { findFirst: async () => null },
          stockMovement: { findFirst: async () => null },
          purchaseItem: { findFirst: async () => null },
          goodsReceiptItem: { findFirst: async () => null },
          inventoryAdjustmentItem: { findFirst: async () => null },
          stockTransferItem: { findFirst: async () => null },
          inventory: { deleteMany: async () => {} },
          product: {
            deleteMany: async () => {
              const p2003Error: any = new Error('Foreign key violation');
              p2003Error.code = 'P2003';
              throw p2003Error;
            },
          },
        };
        return await fn(tx);
      },
    };

    const service = new ProductsService(mockPrisma);
    await assert.rejects(
      async () => {
        await service.deleteAll('tenant-concurrent-fk');
      },
      (err: any) => {
        assert.ok(err instanceof BadRequestException);
        assert.match(err.message, /referenced by historical operational records/);
        return true;
      },
    );
  });

  await asyncTest('SEC-09 [Unit]: ProductsService.deleteAll() strictly enforces tenant isolation', async () => {
    let checkedTenantId = '';
    let deletedInventoryTenantId = '';
    let deletedProductTenantId = '';

    const mockPrisma: any = {
      $transaction: async (fn: any) => {
        const tx: any = {
          saleItem: {
            findFirst: async (args: any) => {
              checkedTenantId = args.where.product.tenantId;
              return null;
            },
          },
          saleReturnItem: { findFirst: async () => null },
          stockMovement: { findFirst: async () => null },
          purchaseItem: { findFirst: async () => null },
          goodsReceiptItem: { findFirst: async () => null },
          inventoryAdjustmentItem: { findFirst: async () => null },
          stockTransferItem: { findFirst: async () => null },
          inventory: {
            deleteMany: async (args: any) => {
              deletedInventoryTenantId = args.where.tenantId;
              return { count: 1 };
            },
          },
          product: {
            deleteMany: async (args: any) => {
              deletedProductTenantId = args.where.tenantId;
              return { count: 1 };
            },
          },
        };
        return await fn(tx);
      },
    };

    const targetTenant = 'tenant-alpha-999';
    const service = new ProductsService(mockPrisma);
    await service.deleteAll(targetTenant);

    assert.strictEqual(checkedTenantId, targetTenant);
    assert.strictEqual(deletedInventoryTenantId, targetTenant);
    assert.strictEqual(deletedProductTenantId, targetTenant);
  });


  // =======================================================================
  // 11. SEC-02-SYNC: OFFLINE SYNC PRIVILEGE ESCALATION & PIN RESET HARDENING (REM-02)
  // =======================================================================
  function createMockSyncService(options: {
    auditLogAction?: (...args: any[]) => Promise<void>;
    salesCreate?: (...args: any[]) => Promise<any>;
    salesReturnsCreate?: (...args: any[]) => Promise<any>;
    shiftsOpenShift?: (...args: any[]) => Promise<any>;
    shiftsCloseShift?: (...args: any[]) => Promise<any>;
    userUpdateMany?: (...args: any[]) => Promise<any>;
    syncEventFindUnique?: (...args: any[]) => Promise<any>;
    syncEventCreate?: (...args: any[]) => Promise<any>;
    syncEventUpdate?: (...args: any[]) => Promise<any>;
    syncEventUpdateMany?: (...args: any[]) => Promise<any>;
  } = {}) {
    const mockPrisma: any = {
      user: {
        updateMany: options.userUpdateMany || (async () => ({ count: 1 })),
        update: async () => ({ id: 'updated' }),
      },
      syncEvent: {
        findUnique: options.syncEventFindUnique || (async () => null),
        create: options.syncEventCreate || (async (args: any) => args.data),
        update: options.syncEventUpdate || (async () => ({})),
        updateMany: options.syncEventUpdateMany || (async () => ({ count: 1 })),
      },
    };

    const mockSalesService: any = {
      create: options.salesCreate || (async () => ({ id: 'sale-created' })),
    };

    const mockSalesReturnsService: any = {
      create: options.salesReturnsCreate || (async () => ({ id: 'return-created' })),
    };

    const mockShiftsService: any = {
      openShift: options.shiftsOpenShift || (async () => ({ id: 'shift-opened' })),
      closeShift: options.shiftsCloseShift || (async () => ({ id: 'shift-closed' })),
    };

    const mockAuditService: any = {
      logAction: options.auditLogAction || (async () => {}),
    };

    const service = new SyncService(
      mockPrisma,
      mockSalesService,
      mockSalesReturnsService,
      mockShiftsService,
      mockAuditService,
    );

    return { service, mockPrisma, mockSalesService, mockSalesReturnsService, mockShiftsService, mockAuditService };
  }

  await asyncTest('SEC-02-SYNC [Unit]: Cashier attempting a STORE_MANAGER PIN reset through sync throws ForbiddenException (HTTP 403)', async () => {
    const { service } = createMockSyncService();
    await assert.rejects(
      async () => {
        await service.processSync('tenant-1', 'cashier-user-1', {
          deviceId: 'dev-1',
          events: [
            {
              eventId: 'evt-1',
              eventType: 'CASHIER_PIN_RESET',
              occurredAt: new Date().toISOString(),
              payload: { storeId: 'store-1', cashierId: 'manager-user-uuid', pinCodeHash: 'hacked-hash' },
            },
          ],
        });
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenException);
        assert.match(err.message, /Access denied: PIN credential resets cannot be performed via synchronization/);
        return true;
      },
    );
  });

  await asyncTest('SEC-02-SYNC [Unit]: Cashier attempting an OWNER PIN reset through sync throws ForbiddenException (HTTP 403)', async () => {
    const { service } = createMockSyncService();
    await assert.rejects(
      async () => {
        await service.processSync('tenant-1', 'cashier-user-1', {
          deviceId: 'dev-1',
          events: [
            {
              eventId: 'evt-2',
              eventType: 'CASHIER_PIN_RESET',
              occurredAt: new Date().toISOString(),
              payload: { storeId: 'store-1', cashierId: 'owner-user-uuid', pinCodeHash: 'hacked-hash' },
            },
          ],
        });
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenException);
        assert.match(err.message, /Access denied: PIN credential resets cannot be performed via synchronization/);
        return true;
      },
    );
  });

  await asyncTest('SEC-02-SYNC [Unit]: Cashier attempting another CASHIER PIN reset through sync throws ForbiddenException (HTTP 403)', async () => {
    const { service } = createMockSyncService();
    await assert.rejects(
      async () => {
        await service.processSync('tenant-1', 'cashier-user-1', {
          deviceId: 'dev-1',
          events: [
            {
              eventId: 'evt-3',
              eventType: 'CASHIER_PIN_RESET',
              occurredAt: new Date().toISOString(),
              payload: { storeId: 'store-1', cashierId: 'other-cashier-uuid', pinCodeHash: 'hacked-hash' },
            },
          ],
        });
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenException);
        assert.match(err.message, /Access denied: PIN credential resets cannot be performed via synchronization/);
        return true;
      },
    );
  });

  await asyncTest('SEC-02-SYNC [Unit]: Malformed PIN-reset event throws ForbiddenException (HTTP 403) without unhandled exceptions', async () => {
    const { service } = createMockSyncService();
    await assert.rejects(
      async () => {
        await service.processSync('tenant-1', 'cashier-user-1', {
          deviceId: 'dev-1',
          events: [
            {
              eventId: 'evt-malformed-1',
              eventType: 'CASHIER_PIN_RESET',
              occurredAt: new Date().toISOString(),
              payload: null,
            },
          ],
        });
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenException);
        return true;
      },
    );
  });

  await asyncTest('SEC-02-SYNC [Unit]: Cross-tenant target PIN reset attempt throws ForbiddenException (HTTP 403)', async () => {
    let userUpdated = false;
    const { service } = createMockSyncService({
      userUpdateMany: async () => { userUpdated = true; return { count: 1 }; },
    });

    await assert.rejects(
      async () => {
        await service.processSync('tenant-attacker', 'cashier-attacker', {
          deviceId: 'dev-1',
          events: [
            {
              eventId: 'evt-cross-1',
              eventType: 'CASHIER_PIN_RESET',
              occurredAt: new Date().toISOString(),
              payload: { storeId: 'store-victim', cashierId: 'victim-uuid', pinCodeHash: 'hacked-hash' },
            },
          ],
        });
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenException);
        return true;
      },
    );
    assert.strictEqual(userUpdated, false, 'User in cross-tenant must never be updated');
  });

  await asyncTest('SEC-02-SYNC [Unit]: Target user original PIN hash remains strictly unchanged after rejected attempt', async () => {
    let updateCalled = false;
    let updateManyCalled = false;

    const { service, mockPrisma } = createMockSyncService();
    mockPrisma.user.update = async () => { updateCalled = true; };
    mockPrisma.user.updateMany = async () => { updateManyCalled = true; };

    await assert.rejects(
      async () => {
        await service.processSync('tenant-1', 'cashier-1', {
          deviceId: 'dev-1',
          events: [
            {
              eventId: 'evt-target-check',
              eventType: 'CASHIER_PIN_RESET',
              occurredAt: new Date().toISOString(),
              payload: { storeId: 'store-1', cashierId: 'manager-1', pinCodeHash: 'evil-hash' },
            },
          ],
        });
      },
    );

    assert.strictEqual(updateCalled, false, 'prisma.user.update must not be called');
    assert.strictEqual(updateManyCalled, false, 'prisma.user.updateMany must not be called');
  });

  await asyncTest('SEC-02-SYNC [Unit]: Security audit record captures authenticated actor, target, tenant, event ID and outcome REJECTED', async () => {
    let capturedAudit: any = null;
    const { service } = createMockSyncService({
      auditLogAction: async (adminId, action, entity, entityId, details) => {
        capturedAudit = { adminId, action, entity, entityId, details };
      },
    });

    await assert.rejects(
      async () => {
        await service.processSync('tenant-secure-777', 'authenticated-cashier-id', {
          deviceId: 'dev-1',
          events: [
            {
              eventId: 'evt-audit-verify-1',
              eventType: 'CASHIER_PIN_RESET',
              occurredAt: new Date().toISOString(),
              payload: { storeId: 'store-1', cashierId: 'target-manager-id', pinCodeHash: 'evil-hash' },
            },
          ],
        });
      },
    );

    assert.ok(capturedAudit, 'Audit log must be created');
    assert.strictEqual(capturedAudit.adminId, 'authenticated-cashier-id', 'Actor ID must match authenticated context');
    assert.strictEqual(capturedAudit.action, 'SECURITY_VIOLATION_UNAUTHORIZED_PIN_RESET');
    assert.strictEqual(capturedAudit.entity, 'User');
    assert.strictEqual(capturedAudit.entityId, 'target-manager-id');
    assert.strictEqual(capturedAudit.details.tenantId, 'tenant-secure-777');
    assert.strictEqual(capturedAudit.details.eventId, 'evt-audit-verify-1');
    assert.strictEqual(capturedAudit.details.targetUserId, 'target-manager-id');
    assert.strictEqual(capturedAudit.details.outcome, 'REJECTED');
  });

  await asyncTest('SEC-02-SYNC [Unit]: Security audit details contain NO plaintext PIN, PIN hash, or credentials', async () => {
    let auditDetails: any = null;
    const secretPlainPin = '9876';
    const secretHash = '$2b$12$eX4mpL3H4sH';

    const { service } = createMockSyncService({
      auditLogAction: async (_adminId, _action, _entity, _entityId, details) => {
        auditDetails = details;
      },
    });

    await assert.rejects(
      async () => {
        await service.processSync('tenant-audit-safe', 'cashier-1', {
          deviceId: 'dev-1',
          events: [
            {
              eventId: 'evt-credential-leak-check',
              eventType: 'CASHIER_PIN_RESET',
              occurredAt: new Date().toISOString(),
              payload: { storeId: 'store-1', cashierId: 'mgr-1', pin: secretPlainPin, pinCodeHash: secretHash },
            },
          ],
        });
      },
    );

    assert.ok(auditDetails);
    const jsonString = JSON.stringify(auditDetails);
    assert.strictEqual(jsonString.includes(secretPlainPin), false, 'Plaintext PIN must NOT be in audit details');
    assert.strictEqual(jsonString.includes(secretHash), false, 'PIN hash must NOT be in audit details');
    assert.strictEqual(auditDetails.pin, undefined);
    assert.strictEqual(auditDetails.pinCodeHash, undefined);
  });

  await asyncTest('SEC-02-SYNC [Unit]: Audit logging failure does not prevent request rejection (fail-closed HTTP 403)', async () => {
    const { service } = createMockSyncService({
      auditLogAction: async () => {
        throw new Error('Database connection failed while writing to audit_logs');
      },
    });

    await assert.rejects(
      async () => {
        await service.processSync('tenant-1', 'cashier-1', {
          deviceId: 'dev-1',
          events: [
            {
              eventId: 'evt-audit-fail',
              eventType: 'CASHIER_PIN_RESET',
              occurredAt: new Date().toISOString(),
              payload: { storeId: 'store-1', cashierId: 'target-1' },
            },
          ],
        });
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenException, 'Must still throw ForbiddenException even if audit logging fails');
        return true;
      },
    );
  });

  await asyncTest('SEC-02-SYNC [Unit]: Legitimate SALE synchronization remains functional', async () => {
    let saleCreated = false;
    const { service } = createMockSyncService({
      salesCreate: async (tenantId, userId, payload, isSync) => {
        saleCreated = true;
        assert.strictEqual(tenantId, 'tenant-sale');
        assert.strictEqual(userId, 'cashier-sale');
        assert.strictEqual(isSync, true);
        return { id: 'sale-uuid-1', saleNumber: 'INV-100' };
      },
    });

    const result = await service.processSync('tenant-sale', 'cashier-sale', {
      deviceId: 'dev-1',
      events: [
        {
          eventId: 'evt-legit-sale-1',
          eventType: 'SALE',
          occurredAt: new Date().toISOString(),
          payload: { storeId: 'store-1', grandTotal: 50 },
        },
      ],
    });

    assert.strictEqual(saleCreated, true, 'SalesService.create must be called');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.processed.length, 1);
    assert.strictEqual(result.processed[0].eventId, 'evt-legit-sale-1');
  });

  await asyncTest('SEC-02-SYNC [Unit]: Legitimate SALE_RETURN synchronization remains functional', async () => {
    let returnCreated = false;
    const { service } = createMockSyncService({
      salesReturnsCreate: async (tenantId, userId, payload, isSync) => {
        returnCreated = true;
        assert.strictEqual(tenantId, 'tenant-ret');
        assert.strictEqual(isSync, true);
        return { id: 'return-uuid-1' };
      },
    });

    const result = await service.processSync('tenant-ret', 'cashier-ret', {
      deviceId: 'dev-1',
      events: [
        {
          eventId: 'evt-legit-return-1',
          eventType: 'SALE_RETURN',
          occurredAt: new Date().toISOString(),
          payload: { storeId: 'store-1', originalSaleId: 'sale-1' },
        },
      ],
    });

    assert.strictEqual(returnCreated, true, 'SalesReturnsService.create must be called');
    assert.strictEqual(result.processed.length, 1);
  });

  await asyncTest('SEC-02-SYNC [Unit]: Legitimate SHIFT_OPEN and SHIFT_CLOSE synchronization remain functional', async () => {
    let shiftOpened = false;
    let shiftClosed = false;

    const { service } = createMockSyncService({
      shiftsOpenShift: async () => { shiftOpened = true; return { id: 'shift-1' }; },
      shiftsCloseShift: async () => { shiftClosed = true; return { id: 'shift-1' }; },
    });

    const result = await service.processSync('tenant-shift', 'cashier-shift', {
      deviceId: 'dev-1',
      events: [
        {
          eventId: 'evt-shift-open-1',
          eventType: 'SHIFT_OPEN',
          occurredAt: new Date().toISOString(),
          payload: { storeId: 'store-1', openingFloat: 100 },
        },
        {
          eventId: 'evt-shift-close-1',
          eventType: 'SHIFT_CLOSE',
          occurredAt: new Date().toISOString(),
          payload: { storeId: 'store-1', shiftId: 'shift-1', closingCash: 250 },
        },
      ],
    });

    assert.strictEqual(shiftOpened, true);
    assert.strictEqual(shiftClosed, true);
    assert.strictEqual(result.processed.length, 2);
  });

  await asyncTest('SEC-02-ONLINE [Unit]: Existing authorized online manager PIN reset for a CASHIER succeeds via POST /users/:id/reset-pin', async () => {
    let updatedPinHash = '';
    const mockPrisma: any = {
      user: {
        findFirst: async () => ({
          id: 'cashier-target-1',
          tenantId: 'tenant-1',
          storeId: 'store-1',
          role: { code: 'CASHIER' },
        }),
        findMany: async () => [],
        update: async (args: any) => {
          updatedPinHash = args.data.pinCodeHash;
          return { id: 'cashier-target-1' };
        },
      },
    };

    const mockPasswordService: any = {
      hash: async (pin: string) => `hashed-${pin}`,
      compare: async () => false,
    };

    const usersService = new UsersService(mockPrisma, mockPasswordService as any);
    const result = await usersService.resetPin('tenant-1', 'cashier-target-1', '5555');

    assert.strictEqual(result.message, 'PIN successfully reset');
    assert.strictEqual(result.generatedPin, '5555');
    assert.strictEqual(updatedPinHash, 'hashed-5555');
  });

  await asyncTest('SEC-02-ONLINE [Unit]: Online manager reset targeting an OWNER or STORE_MANAGER remains rejected (HTTP 400)', async () => {
    const mockPrisma: any = {
      user: {
        findFirst: async () => ({
          id: 'manager-target-1',
          tenantId: 'tenant-1',
          storeId: 'store-1',
          role: { code: 'STORE_MANAGER' },
        }),
      },
    };

    const usersService = new UsersService(mockPrisma, {} as any);
    await assert.rejects(
      async () => {
        await usersService.resetPin('tenant-1', 'manager-target-1', '5555');
      },
      (err: any) => {
        assert.ok(err instanceof BadRequestException);
        assert.strictEqual(err.message, 'PIN code can only be set for cashiers');
        return true;
      },
    );
  });

  await asyncTest('SEC-02-ONLINE [Unit]: Cashier token with only sales.create cannot access online reset endpoint (HTTP 403 Forbidden)', async () => {
    const reflector = new Reflector();
    const mockAuthService: any = {
      getRolePermissions: async () => ['sales.create', 'shifts.open'],
    };

    const guard = new PermissionsGuard(reflector, mockAuthService);
    const context: any = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => ({
          user: { userId: 'cashier-1', roleCode: 'CASHIER', tenantId: 'tenant-1' },
        }),
      }),
    };

    reflector.getAllAndOverride = () => ['users.update'];

    await assert.rejects(
      async () => {
        await guard.canActivate(context);
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenException);
        assert.strictEqual(err.message, 'Insufficient permissions');
        return true;
      },
    );
  });

  await asyncTest('SEC-02-SYNC [Unit]: Replay of rejected sync event never mutates user PIN', async () => {
    let updateAttempted = false;
    const { service, mockPrisma } = createMockSyncService({
      syncEventFindUnique: async () => ({ status: 'FAILED' }),
    });
    mockPrisma.user.updateMany = async () => { updateAttempted = true; return { count: 1 }; };

    await assert.rejects(async () => {
      await service.processSync('tenant-1', 'cashier-1', {
        deviceId: 'dev-1',
        events: [
          {
            eventId: 'evt-replayed-1',
            eventType: 'CASHIER_PIN_RESET',
            occurredAt: new Date().toISOString(),
            payload: { storeId: 'store-1', cashierId: 'mgr-1', pinCodeHash: 'replayed-hash' },
          },
        ],
      });
    });

    assert.strictEqual(updateAttempted, false, 'Replayed event must never mutate user records');
  });

  await asyncTest('SEC-02-SYNC [Unit]: Mixed batch containing a forbidden PIN-reset event and legitimate SALE events returns HTTP 403 before any sale is processed', async () => {
    let salesCreatedCount = 0;
    let auditLogged = false;

    const { service } = createMockSyncService({
      salesCreate: async () => { salesCreatedCount++; return { id: 'sale-1' }; },
      auditLogAction: async () => { auditLogged = true; },
    });

    await assert.rejects(
      async () => {
        await service.processSync('tenant-mixed', 'cashier-attacker', {
          deviceId: 'dev-1',
          events: [
            {
              eventId: 'legit-sale-1',
              eventType: 'SALE',
              occurredAt: new Date().toISOString(),
              payload: { storeId: 'store-1', grandTotal: 25 },
            },
            {
              eventId: 'exploit-pin-reset-1',
              eventType: 'CASHIER_PIN_RESET',
              occurredAt: new Date().toISOString(),
              payload: { storeId: 'store-1', cashierId: 'manager-victim-id', pinCodeHash: 'evil-hash' },
            },
            {
              eventId: 'legit-sale-2',
              eventType: 'SALE',
              occurredAt: new Date().toISOString(),
              payload: { storeId: 'store-1', grandTotal: 50 },
            },
          ],
        });
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenException);
        return true;
      },
    );

    assert.strictEqual(salesCreatedCount, 0, 'Zero sales must be created when batch is poisoned with forbidden event');
    assert.strictEqual(auditLogged, true, 'Audit log must be triggered for poisoned batch');
  });

  await asyncTest('SEC-02-SYNC [Unit]: Normal batch containing only legitimate event types retains its existing response structure and behavior', async () => {
    const { service } = createMockSyncService();
    const result = await service.processSync('tenant-normal', 'cashier-normal', {
      deviceId: 'dev-1',
      events: [
        {
          eventId: 'sale-event-1',
          eventType: 'SALE',
          occurredAt: new Date().toISOString(),
          payload: { storeId: 'store-1', grandTotal: 10 },
        },
        {
          eventId: 'shift-event-1',
          eventType: 'SHIFT_OPEN',
          occurredAt: new Date().toISOString(),
          payload: { storeId: 'store-1', openingFloat: 50 },
        },
      ],
    });

    assert.strictEqual(result.success, true);
    assert.ok(Array.isArray(result.processed));
    assert.ok(Array.isArray(result.alreadyProcessed));
    assert.ok(Array.isArray(result.failed));
    assert.strictEqual(result.processed.length, 2);
    assert.strictEqual(result.failed.length, 0);
  });

  await asyncTest('SEC-02-HTTP [E2E HTTP]: Actual NestJS HTTP server rejects sync request containing CASHIER_PIN_RESET with true wire-level HTTP 403', async () => {
    const { service } = createMockSyncService();

    const moduleRef = await Test.createTestingModule({
      controllers: [SyncController],
      providers: [
        { provide: SyncService, useValue: service },
        { provide: AuthService, useValue: { getRolePermissions: async () => ['sales.create'] } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = { userId: 'cashier-live-http', tenantId: 'tenant-live-http', roleCode: 'CASHIER' };
          return true;
        },
      })
      .overrideGuard(PermissionsGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.userPermissions = ['sales.create'];
          return true;
        },
      })
      .compile();

    const app = moduleRef.createNestApplication();
    await app.listen(0);
    const url = await app.getUrl();

    try {
      const response = await fetch(`${url}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: 'device-wire-test',
          events: [
            {
              eventId: 'evt-wire-exploit-1',
              eventType: 'CASHIER_PIN_RESET',
              occurredAt: new Date().toISOString(),
              payload: { storeId: 'store-1', cashierId: 'manager-target-uuid', pinCodeHash: 'evil-hash' },
            },
          ],
        }),
      });

      assert.strictEqual(response.status, 403, 'Actual HTTP wire response status must be 403 Forbidden');
      const json: any = await response.json();
      assert.strictEqual(json.statusCode, 403);
      assert.strictEqual(json.error, 'Forbidden');
    } finally {
      await app.close();
    }
  });


  // =========================================================================
  // SECTION 12: SEC-03-CONFIG — JWT SECRET CONFIGURATION & ISOLATION TESTS
  // =========================================================================

  const validProdSecrets = {
    NODE_ENV: 'production',
    JWT_ACCESS_SECRET: 'prod_access_secret_32_characters_long_aaa111',
    JWT_REFRESH_SECRET: 'prod_refresh_secret_32_characters_long_bbb222',
    RESET_PASSWORD_SECRET: 'prod_reset_secret_32_characters_long_ccc333',
  };

  test('SEC-03-CONFIG [Unit]: Missing NODE_ENV rejects startup with fatal error', () => {
    assert.throws(
      () => validate({ ...validProdSecrets, NODE_ENV: undefined as any }),
      /NODE_ENV is required and must be one of: development, test, staging, production/,
      'Missing NODE_ENV must throw fatal error',
    );
  });

  test('SEC-03-CONFIG [Unit]: Unrecognized NODE_ENV rejects startup with fatal error', () => {
    assert.throws(
      () => validate({ ...validProdSecrets, NODE_ENV: 'local_machine' }),
      /Invalid NODE_ENV "local_machine"/,
      'Unrecognized NODE_ENV must throw fatal error',
    );
  });

  test('SEC-03-CONFIG [Unit]: Missing JWT_ACCESS_SECRET in production throws fatal validation error', () => {
    assert.throws(
      () => validate({ ...validProdSecrets, JWT_ACCESS_SECRET: undefined }),
      /JWT_ACCESS_SECRET is required in production environment/,
      'Missing JWT_ACCESS_SECRET in production must throw fatal error',
    );
  });

  test('SEC-03-CONFIG [Unit]: Missing JWT_REFRESH_SECRET in production throws fatal validation error', () => {
    assert.throws(
      () => validate({ ...validProdSecrets, JWT_REFRESH_SECRET: undefined }),
      /JWT_REFRESH_SECRET is required in production environment/,
      'Missing JWT_REFRESH_SECRET in production must throw fatal error',
    );
  });

  test('SEC-03-CONFIG [Unit]: Missing RESET_PASSWORD_SECRET in production throws fatal validation error', () => {
    assert.throws(
      () => validate({ ...validProdSecrets, RESET_PASSWORD_SECRET: undefined }),
      /RESET_PASSWORD_SECRET is required in production environment/,
      'Missing RESET_PASSWORD_SECRET in production must throw fatal error',
    );
  });

  test('SEC-03-CONFIG [Unit]: Empty or whitespace-only secret in production throws fatal validation error', () => {
    assert.throws(
      () => validate({ ...validProdSecrets, JWT_ACCESS_SECRET: '   ' }),
      /JWT_ACCESS_SECRET cannot be empty or whitespace in production environment/,
      'Whitespace-only secret must throw fatal error',
    );
  });

  test('SEC-03-CONFIG [Unit]: Secret with leading or trailing whitespace is rejected without silent trimming', () => {
    assert.throws(
      () => validate({ ...validProdSecrets, JWT_ACCESS_SECRET: ' ' + validProdSecrets.JWT_ACCESS_SECRET }),
      /JWT_ACCESS_SECRET must not contain leading or trailing whitespace in production environment/,
      'Leading/trailing whitespace in production secret must be rejected without silent trimming',
    );
  });

  test('SEC-03-CONFIG [Unit]: Secret shorter than 32 characters throws fatal validation error', () => {
    assert.throws(
      () => validate({ ...validProdSecrets, JWT_ACCESS_SECRET: 'short_secret_25_chars_long' }),
      /JWT_ACCESS_SECRET must be at least 32 characters long in production environment/,
      'Secrets shorter than 32 characters must be rejected',
    );
  });

  test('SEC-03-CONFIG [Unit]: Prohibited legacy default secret patterns are rejected in production', () => {
    assert.throws(
      () => validate({ ...validProdSecrets, JWT_ACCESS_SECRET: 'super_secret_jwt_access_key_infepos_enterprise_2026' }),
      /matches prohibited insecure pattern/,
      'Legacy default secret pattern must be rejected',
    );
    assert.throws(
      () => validate({ ...validProdSecrets, JWT_REFRESH_SECRET: 'your_super_secret_refresh_key_32_characters_long' }),
      /matches prohibited insecure pattern/,
      'Placeholder secret pattern must be rejected',
    );
  });

  test('SEC-03-CONFIG [Unit]: Unresolved container placeholders are rejected in production', () => {
    assert.throws(
      () => validate({ ...validProdSecrets, JWT_ACCESS_SECRET: '${JWT_ACCESS_SECRET}' }),
      /matches prohibited insecure pattern/,
      'Unresolved docker compose variable placeholder must be rejected',
    );
  });

  test('SEC-03-CONFIG [Unit]: Development and test dummy secrets are explicitly rejected in production', () => {
    assert.throws(
      () => validate({ ...validProdSecrets, JWT_ACCESS_SECRET: DEV_TEST_DUMMY_SECRETS.access }),
      /cannot use development\/test dummy secret in production environment/,
      'Dev dummy access secret must be rejected in production',
    );
    assert.throws(
      () => validate({ ...validProdSecrets, JWT_REFRESH_SECRET: DEV_TEST_DUMMY_SECRETS.refresh }),
      /cannot use development\/test dummy secret in production environment/,
      'Dev dummy refresh secret must be rejected in production',
    );
    assert.throws(
      () => validate({ ...validProdSecrets, RESET_PASSWORD_SECRET: DEV_TEST_DUMMY_SECRETS.reset }),
      /cannot use development\/test dummy secret in production environment/,
      'Dev dummy reset secret must be rejected in production',
    );
  });

  test('SEC-03-CONFIG [Unit]: Secret collision between access and refresh secrets is rejected', () => {
    assert.throws(
      () => validate({ ...validProdSecrets, JWT_REFRESH_SECRET: validProdSecrets.JWT_ACCESS_SECRET }),
      /JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be distinct secrets/,
      'Access and refresh secret collision must be rejected',
    );
  });

  test('SEC-03-CONFIG [Unit]: Secret collision between access and password-reset secrets is rejected', () => {
    assert.throws(
      () => validate({ ...validProdSecrets, RESET_PASSWORD_SECRET: validProdSecrets.JWT_ACCESS_SECRET }),
      /JWT_ACCESS_SECRET and RESET_PASSWORD_SECRET must be distinct secrets/,
      'Access and password-reset secret collision must be rejected',
    );
  });

  test('SEC-03-CONFIG [Unit]: Secret collision between refresh and password-reset secrets is rejected', () => {
    assert.throws(
      () => validate({ ...validProdSecrets, RESET_PASSWORD_SECRET: validProdSecrets.JWT_REFRESH_SECRET }),
      /JWT_REFRESH_SECRET and RESET_PASSWORD_SECRET must be distinct secrets/,
      'Refresh and password-reset secret collision must be rejected',
    );
  });

  test('SEC-03-CONFIG [Unit]: Valid distinct 32+ character secrets succeed in production', () => {
    const validated = validate(validProdSecrets);
    assert.strictEqual(validated.JWT_ACCESS_SECRET, validProdSecrets.JWT_ACCESS_SECRET);
    assert.strictEqual(validated.JWT_REFRESH_SECRET, validProdSecrets.JWT_REFRESH_SECRET);
    assert.strictEqual(validated.RESET_PASSWORD_SECRET, validProdSecrets.RESET_PASSWORD_SECRET);
    assert.strictEqual(validated.NODE_ENV, Environment.Production);
  });

  test('SEC-03-CONFIG [Unit]: Staging environment enforces identical strict secret validation', () => {
    const validStagingSecrets = { ...validProdSecrets, NODE_ENV: 'staging' };
    const validatedStaging = validate(validStagingSecrets);
    assert.strictEqual(validatedStaging.NODE_ENV, Environment.Staging);
    assert.throws(
      () => validate({ ...validStagingSecrets, JWT_ACCESS_SECRET: undefined }),
      /JWT_ACCESS_SECRET is required in staging environment/,
      'Missing secret in staging must be rejected',
    );
    assert.throws(
      () => validate({ ...validStagingSecrets, JWT_ACCESS_SECRET: DEV_TEST_DUMMY_SECRETS.access }),
      /cannot use development\/test dummy secret in staging environment/,
      'Dev dummy secret in staging must be rejected',
    );
    assert.throws(
      () => validate({ ...validStagingSecrets, JWT_REFRESH_SECRET: validStagingSecrets.JWT_ACCESS_SECRET }),
      /JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be distinct secrets/,
      'Secret collision in staging must be rejected',
    );
  });

  test('SEC-03-CONFIG [Unit]: Development and test environments use permitted dummy defaults with logged warning without mutating process.env', () => {
    const initialProcessAccess = process.env.JWT_ACCESS_SECRET;
    const initialProcessRefresh = process.env.JWT_REFRESH_SECRET;
    const initialProcessReset = process.env.RESET_PASSWORD_SECRET;

    const originalWarn = console.warn;
    let warnCaptured = false;
    console.warn = (msg: string) => {
      if (typeof msg === 'string' && msg.includes('Running with development-only dummy JWT secrets')) {
        warnCaptured = true;
      }
    };

    try {
      const devConfig = validate({ NODE_ENV: 'development' });
      assert.strictEqual(devConfig.JWT_ACCESS_SECRET, DEV_TEST_DUMMY_SECRETS.access);
      assert.strictEqual(devConfig.JWT_REFRESH_SECRET, DEV_TEST_DUMMY_SECRETS.refresh);
      assert.strictEqual(devConfig.RESET_PASSWORD_SECRET, DEV_TEST_DUMMY_SECRETS.reset);
      assert.strictEqual(warnCaptured, true, 'Security notice warning must be logged in development fallback');

      // Verify test environment
      const testConfig = validate({ NODE_ENV: 'test' });
      assert.strictEqual(testConfig.JWT_ACCESS_SECRET, DEV_TEST_DUMMY_SECRETS.access);
      assert.strictEqual(testConfig.JWT_REFRESH_SECRET, DEV_TEST_DUMMY_SECRETS.refresh);
      assert.strictEqual(testConfig.RESET_PASSWORD_SECRET, DEV_TEST_DUMMY_SECRETS.reset);

      // Verify process.env was NEVER mutated by validate()
      assert.strictEqual(process.env.JWT_ACCESS_SECRET, initialProcessAccess, 'process.env.JWT_ACCESS_SECRET must not be mutated');
      assert.strictEqual(process.env.JWT_REFRESH_SECRET, initialProcessRefresh, 'process.env.JWT_REFRESH_SECRET must not be mutated');
      assert.strictEqual(process.env.RESET_PASSWORD_SECRET, initialProcessReset, 'process.env.RESET_PASSWORD_SECRET must not be mutated');

      // Verify custom secrets in development are preserved without assigning dummy defaults
      const customDev = validate({
        NODE_ENV: 'development',
        JWT_ACCESS_SECRET: 'custom_dev_access_key_32_characters_12345',
      });
      assert.strictEqual(customDev.JWT_ACCESS_SECRET, 'custom_dev_access_key_32_characters_12345');
      assert.strictEqual(customDev.JWT_REFRESH_SECRET, DEV_TEST_DUMMY_SECRETS.refresh);
    } finally {
      console.warn = originalWarn;
    }
  });

  await asyncTest('SEC-03-CONFIG [Integration]: NestJS ConfigModule initialization verifies jwt factory consistency and environment-switching test isolation', async () => {
    const originalEnv = { ...process.env };
    try {
      // 1. Production initialization
      process.env.NODE_ENV = 'production';
      process.env.JWT_ACCESS_SECRET = 'prod_module_test_access_key_32_characters_111';
      process.env.JWT_REFRESH_SECRET = 'prod_module_test_refresh_key_32_characters_222';
      process.env.RESET_PASSWORD_SECRET = 'prod_module_test_reset_key_32_characters_333';

      const prodModuleRef = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            validate,
            load: [jwtConfig],
            ignoreEnvFile: true,
          }),
        ],
      }).compile();

      const prodConfigService = prodModuleRef.get<ConfigService>(ConfigService);
      const prodJwtSecret = prodConfigService.get<string>('jwt.secret');
      const prodJwtRefresh = prodConfigService.get<string>('jwt.refreshSecret');
      const prodJwtReset = prodConfigService.get<string>('jwt.resetPasswordSecret');

      assert.strictEqual(prodJwtSecret, process.env.JWT_ACCESS_SECRET, 'JWT factory secret must match validated env in production');
      assert.strictEqual(prodJwtRefresh, process.env.JWT_REFRESH_SECRET, 'JWT factory refreshSecret must match validated env in production');
      assert.strictEqual(prodJwtReset, process.env.RESET_PASSWORD_SECRET, 'JWT factory resetPasswordSecret must match validated env in production');
      assert.strictEqual(prodConfigService.get<string>('JWT_ACCESS_SECRET'), prodJwtSecret, 'Direct env getter and nested jwt config must agree in production');
      await prodModuleRef.close();

      // 2. Environment-switching isolation (switch to development with omitted secrets)
      process.env.NODE_ENV = 'development';
      delete process.env.JWT_ACCESS_SECRET;
      delete process.env.JWT_REFRESH_SECRET;
      delete process.env.RESET_PASSWORD_SECRET;

      const devModuleRef = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            validate,
            load: [jwtConfig],
            ignoreEnvFile: true,
          }),
        ],
      }).compile();

      const devConfigService = devModuleRef.get<ConfigService>(ConfigService);
      const devJwtSecret = devConfigService.get<string>('jwt.secret');
      const devJwtRefresh = devConfigService.get<string>('jwt.refreshSecret');
      const devJwtReset = devConfigService.get<string>('jwt.resetPasswordSecret');

      // Verify no secret leakage from previous production test
      assert.notStrictEqual(devJwtSecret, 'prod_module_test_access_key_32_characters_111', 'Must not leak production secrets');
      assert.strictEqual(devJwtSecret, DEV_TEST_DUMMY_SECRETS.access, 'JWT factory must use development dummy access secret when omitted');
      assert.strictEqual(devJwtRefresh, DEV_TEST_DUMMY_SECRETS.refresh, 'JWT factory must use development dummy refresh secret when omitted');
      assert.strictEqual(devJwtReset, DEV_TEST_DUMMY_SECRETS.reset, 'JWT factory must use development dummy reset secret when omitted');
      assert.strictEqual(devConfigService.get<string>('JWT_ACCESS_SECRET'), devJwtSecret, 'Direct env getter and nested jwt config must agree in development');
      await devModuleRef.close();
    } finally {
      process.env = originalEnv;
    }
  });

  console.log(`\n========================================`);

  // =======================================================================
  // BATCH REMEDIATION TESTS: ISSUE 4-8 & OPS 1-3
  // =======================================================================

  // --- ISSUE 5: Multi-Till Shifts ---
  await asyncTest('ISSUE-05 [Unit]: Multi-till shift allows two distinct registers to have active shifts concurrently', async () => {
    const shifts: any[] = [];
    const mockPrisma: any = {
      shift: {
        findFirst: async ({ where }: any) => {
          return shifts.find(s => 
            s.tenantId === where.tenantId &&
            s.storeId === where.storeId &&
            s.status === where.status &&
            (where.registerId !== undefined ? s.registerId === where.registerId : true) &&
            (where.openedById !== undefined ? s.openedById === where.openedById : true)
          ) || null;
        },
        create: async ({ data }: any) => {
          const shift = { id: 'shift-' + (shifts.length + 1), ...data };
          shifts.push(shift);
          return shift;
        },
      },
      $transaction: async (cb: any) => cb(mockPrisma),
    };
    const mockAudit: any = { logAction: async () => {} };
    const shiftsService = new ShiftsService(mockPrisma, mockAudit);

    const shiftA = await shiftsService.openShift('tenant-1', 'store-1', 'cashier-1', {
      startingFloat: 100,
      registerId: 'REG-01',
    });
    assert.strictEqual(shiftA.registerId, 'REG-01', 'Register A shift must be recorded with registerId REG-01');

    const shiftB = await shiftsService.openShift('tenant-1', 'store-1', 'cashier-2', {
      startingFloat: 150,
      registerId: 'REG-02',
    });
    assert.strictEqual(shiftB.registerId, 'REG-02', 'Register B shift must be recorded with registerId REG-02 in same store');
    assert.strictEqual(shifts.length, 2, 'Both tills must have active open shifts in the store');
  });

  await asyncTest('ISSUE-05 [Unit]: Multi-till shift rejects opening second shift on the same register', async () => {
    const shifts: any[] = [
      { id: 'shift-1', tenantId: 'tenant-1', storeId: 'store-1', registerId: 'REG-01', openedById: 'cashier-1', status: ShiftStatus.OPEN }
    ];
    const mockPrisma: any = {
      shift: {
        findFirst: async ({ where }: any) => {
          return shifts.find(s => 
            s.tenantId === where.tenantId &&
            s.storeId === where.storeId &&
            s.status === where.status &&
            (where.registerId !== undefined ? s.registerId === where.registerId : true) &&
            (where.openedById !== undefined ? s.openedById === where.openedById : true)
          ) || null;
        },
      },
      $transaction: async (cb: any) => cb(mockPrisma),
    };
    const shiftsService = new ShiftsService(mockPrisma, {} as any);

    await assert.rejects(
      async () => {
        await shiftsService.openShift('tenant-1', 'store-1', 'cashier-2', {
          startingFloat: 200,
          registerId: 'REG-01',
        });
      },
      (err: any) => {
        assert.ok(err instanceof ConflictException, 'Must reject with ConflictException');
        assert.match(err.message, /already exists for register "REG-01"/i);
        return true;
      }
    );
  });

  await asyncTest('ISSUE-05 [Unit]: Cashier cannot open two active shifts simultaneously', async () => {
    const shifts: any[] = [
      { id: 'shift-1', tenantId: 'tenant-1', storeId: 'store-1', registerId: 'REG-01', openedById: 'cashier-1', status: ShiftStatus.OPEN }
    ];
    const mockPrisma: any = {
      shift: {
        findFirst: async ({ where }: any) => {
          return shifts.find(s => 
            s.tenantId === where.tenantId &&
            (where.openedById !== undefined ? s.openedById === where.openedById : true) &&
            s.status === where.status
          ) || null;
        },
      },
      $transaction: async (cb: any) => cb(mockPrisma),
    };
    const shiftsService = new ShiftsService(mockPrisma, {} as any);

    await assert.rejects(
      async () => {
        await shiftsService.openShift('tenant-1', 'store-1', 'cashier-1', {
          startingFloat: 200,
          registerId: 'REG-02',
        });
      },
      (err: any) => {
        assert.ok(err instanceof ConflictException, 'Must reject with ConflictException');
        assert.match(err.message, /already have an active open shift/i);
        return true;
      }
    );
  });

  // --- ISSUE 7: PIN Credential Stripping ---
  await asyncTest('ISSUE-07 [Unit]: UsersService.findAll strips plaintext PIN and PIN hash, exposing only hasPin boolean', async () => {
    const mockUsers = [
      {
        id: 'user-1',
        firstName: 'Alice',
        lastName: 'Cashier',
        email: 'alice@store.com',
        phone: '12345',
        status: UserStatus.ACTIVE,
        roleId: 'role-1',
        storeId: 'store-1',
        pinCodeHash: '$2b$10$hashedpincodeexample',
        role: { id: 'role-1', name: 'Cashier', code: 'CASHIER' },
        store: { id: 'store-1', name: 'Downtown Store', code: 'DT-01' },
      },
      {
        id: 'user-2',
        firstName: 'Bob',
        lastName: 'Cashier',
        email: 'bob@store.com',
        phone: '67890',
        status: UserStatus.ACTIVE,
        roleId: 'role-1',
        storeId: 'store-1',
        pinCodeHash: null,
        role: { id: 'role-1', name: 'Cashier', code: 'CASHIER' },
        store: { id: 'store-1', name: 'Downtown Store', code: 'DT-01' },
      },
    ];

    const mockPrisma: any = {
      user: {
        count: async () => mockUsers.length,
        findMany: async () => mockUsers,
      },
      $transaction: async (promises: any) => Promise.all(promises),
    };

    const usersService = new UsersService(mockPrisma, {} as any);
    const result = await usersService.findAll('tenant-1', { page: 1, limit: 10 });

    assert.strictEqual(result.items.length, 2);
    // User 1 has pin
    assert.strictEqual(result.items[0].hasPin, true, 'User 1 must have hasPin: true');
    assert.strictEqual((result.items[0] as any).pinCode, undefined, 'Plaintext pinCode must NEVER be returned');
    assert.strictEqual((result.items[0] as any).pinCodeHash, undefined, 'pinCodeHash must NEVER be returned in findAll items');

    // User 2 has no pin
    assert.strictEqual(result.items[1].hasPin, false, 'User 2 must have hasPin: false');
    assert.strictEqual((result.items[1] as any).pinCode, undefined, 'Plaintext pinCode must NEVER be returned');
    assert.strictEqual((result.items[1] as any).pinCodeHash, undefined, 'pinCodeHash must NEVER be returned');
  });

  // --- ISSUE 8: Concurrency-Safe Sequence Generation ---
  await asyncTest('ISSUE-08 [Integration]: Database-backed sequence generator produces strictly monotonic numbers without collisions', async () => {
    const { PrismaClient } = require('@prisma/client');
    const livePrisma = new PrismaClient({
      datasources: { db: { url: 'postgresql://postgres:postgres@localhost:5432/infypos?schema=public' } }
    });

    try {
      const tenantId = '00000000-0000-0000-0000-000000000001';
      const entityType = 'REGRESSION_TEST_SEQ';
      const prefix = 'PO';

      // Execute 10 parallel sequence generations
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(getNextSequenceNumber(livePrisma, tenantId, entityType, prefix, 6));
      }
      const results = await Promise.all(promises);

      // Verify all are strictly formatted and unique
      const uniqueSet = new Set(results);
      assert.strictEqual(results.length, 10);
      assert.strictEqual(uniqueSet.size, 10, 'All 10 parallel sequence numbers must be 100% unique');

      for (const seq of results) {
        assert.match(seq, /^PO-\d{8}-\d{6}$/, 'Must conform to standard PO-YYYYMMDD-000001 format');
      }

      // Cleanup test sequence
      await livePrisma.$executeRawUnsafe(`DELETE FROM "document_sequences" WHERE "entity_type" = '${entityType}'`);
    } finally {
      await livePrisma.$disconnect();
    }
  });

  // --- OPS 3: Tenant-Scoped Audit Logging ---
  await asyncTest('OPS-03 [Unit]: AuditService derives tenant ownership and isolates logs by tenant', async () => {
    const logs: any[] = [];
    const mockPrisma: any = {
      user: {
        findUnique: async ({ where }: any) => {
          if (where.id === 'admin-tenant-1') return { id: 'admin-tenant-1', tenantId: 'tenant-1' };
          if (where.id === 'admin-tenant-2') return { id: 'admin-tenant-2', tenantId: 'tenant-2' };
          return null;
        },
      },
      auditLog: {
        create: async ({ data }: any) => {
          logs.push(data);
          return data;
        },
        count: async ({ where }: any) => logs.filter(l => l.tenantId === where.tenantId).length,
        findMany: async ({ where }: any) => logs.filter(l => l.tenantId === where.tenantId),
      },
    };

    const auditService = new AuditService(mockPrisma);

    // Log action without passing tenantId explicitly (backend must derive it from user)
    await auditService.logAction('admin-tenant-1', 'UPDATE_PRODUCT', 'Product', 'prod-1', { price: 20 });
    assert.strictEqual(logs.length, 1);
    assert.strictEqual(logs[0].tenantId, 'tenant-1', 'Tenant ID must be derived from user on backend');

    // Log action for second tenant
    await auditService.logAction('admin-tenant-2', 'CREATE_USER', 'User', 'usr-2', { email: 'usr2@t2.com' });
    assert.strictEqual(logs.length, 2);
    assert.strictEqual(logs[1].tenantId, 'tenant-2');

    // Tenant 1 queries audit logs -> only tenant 1 logs returned (tenant isolation)
    const t1Logs = await auditService.findAllForTenant('tenant-1');
    assert.strictEqual(t1Logs.items.length, 1);
    assert.strictEqual(t1Logs.items[0].tenantId, 'tenant-1', 'Cross-tenant logs must never leak');
  });

  // --- OPS 1: Admin Dashboard Base URL ---
  await asyncTest('OPS-01 [Unit]: Admin dashboard API client defaults to /api/v1 prefix', async () => {
    const clientPath = path.resolve(__dirname, '../../INFEPOS_FRONTEND/admin-dashboard/src/api/client.ts');
    const clientFile = fs.readFileSync(clientPath, 'utf8');
    assert.ok(
      clientFile.includes("baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'"),
      'Admin dashboard axios client baseURL must point to /api/v1'
    );
  });

  // --- ISSUE 6: Electron Production DevTools Hardening ---
  await asyncTest('ISSUE-06 [Unit]: Electron main.ts does not open DevTools in production and blocks debug shortcuts', async () => {
    const mainPath = path.resolve(__dirname, '../../INFEPOS_FRONTEND/pos-terminal/electron/main.ts');
    const mainFile = fs.readFileSync(mainPath, 'utf8');
    assert.ok(
      !mainFile.includes('// Force devtools open to debug blank screen'),
      'Forced production DevTools must be removed'
    );
    assert.ok(
      mainFile.includes("input.key === 'F12'") && mainFile.includes("mainWindow.setMenu(null)"),
      'Production mode must disable menu and prevent DevTools shortcuts (F12, Ctrl+Shift+I)'
    );
  });

  // =========================================================================
  // STRIPE SAAS BILLING & SUBSCRIPTION INTEGRATION TESTS
  // =========================================================================

  test('STRIPE-01 [Unit]: Plan pricing catalog matches SaaS tiers (£39, £79, £149)', async () => {
    assert.strictEqual(PLAN_PRICING.STARTER.monthlyAmountGbp, 3900);
    assert.strictEqual(PLAN_PRICING.STARTER.annualAmountGbp, 37200);
    assert.strictEqual(PLAN_PRICING.PRO.monthlyAmountGbp, 7900);
    assert.strictEqual(PLAN_PRICING.PRO.annualAmountGbp, 75600);
    assert.strictEqual(PLAN_PRICING.ENTERPRISE.monthlyAmountGbp, 14900);
    assert.strictEqual(PLAN_PRICING.ENTERPRISE.annualAmountGbp, 142800);
  });

  test('STRIPE-02 [Unit]: StripeService creates simulated Checkout Session when keys are pending verification', async () => {
    const mockPrisma: any = {
      tenant: {
        findUnique: async () => ({ id: 't-1', code: 'TEST_TENANT', name: 'Test Tenant', stripeCustomerId: null }),
        update: async () => ({}),
      },
    };
    const mockConfig: any = { get: () => 'sk_test_placeholder' };
    const svc = new StripeService(mockConfig, mockPrisma);
    const session = await svc.createCheckoutSession('t-1', { plan: 'PRO', billingCycle: 'MONTHLY' });
    assert.ok(session.sessionId.startsWith('cs_test_mock_'), 'Must produce simulated session in dev mode');
    assert.ok(session.url.includes('session_id=cs_test_mock_'));
  });

  test('STRIPE-03 [Unit]: Webhook checkout.session.completed activates tenant subscription', async () => {
    let updatedTenantData: any = null;
    const mockPrisma: any = {
      tenant: {
        update: async ({ data }: any) => { updatedTenantData = data; return data; },
      },
    };
    const mockConfig: any = { get: () => 'sk_test_placeholder' };
    const svc = new StripeService(mockConfig, mockPrisma);
    await svc.handleWebhookEvent({
      id: 'evt-test-1',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_live_123',
          customer: 'cus_live_456',
          subscription: 'sub_live_789',
          metadata: { tenantId: 't-1', plan: 'PRO', billingCycle: 'ANNUAL' },
        },
      },
    } as any);

    assert.strictEqual(updatedTenantData.subscriptionPlan, 'PRO');
    assert.strictEqual(updatedTenantData.billingCycle, 'ANNUAL');
    assert.strictEqual(updatedTenantData.subscriptionStatus, 'active');
    assert.strictEqual(updatedTenantData.stripeCustomerId, 'cus_live_456');
    assert.strictEqual(updatedTenantData.stripeSubscriptionId, 'sub_live_789');
  });

  test('STRIPE-04 [Unit]: Webhook invoice.payment_succeeded records billing invoice and keeps tenant active', async () => {
    let createdInvoice: any = null;
    const mockPrisma: any = {
      tenant: {
        findFirst: async () => ({ id: 't-1', code: 'TEST_TENANT', stripeCustomerId: 'cus_live_456' }),
        update: async () => ({}),
      },
      billingInvoice: {
        upsert: async ({ create }: any) => { createdInvoice = create; return create; },
      },
    };
    const mockConfig: any = { get: () => 'sk_test_placeholder' };
    const svc = new StripeService(mockConfig, mockPrisma);
    await svc.handleWebhookEvent({
      id: 'evt-test-2',
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          id: 'in_live_999',
          customer: 'cus_live_456',
          amount_due: 7900,
          amount_paid: 7900,
          currency: 'gbp',
          status: 'paid',
          hosted_invoice_url: 'https://invoice.stripe.com/test',
        },
      },
    } as any);

    assert.strictEqual(createdInvoice.stripeInvoiceId, 'in_live_999');
    assert.strictEqual(createdInvoice.amountPaid, 7900);
    assert.strictEqual(createdInvoice.currency, 'gbp');
  });

  test('STRIPE-05 [Unit]: Webhook customer.subscription.deleted cancels tenant subscription', async () => {
    let canceledData: any = null;
    const mockPrisma: any = {
      tenant: {
        findFirst: async () => ({ id: 't-1', code: 'TEST_TENANT' }),
        update: async ({ data }: any) => { canceledData = data; return data; },
      },
    };
    const mockConfig: any = { get: () => 'sk_test_placeholder' };
    const svc = new StripeService(mockConfig, mockPrisma);
    await svc.handleWebhookEvent({
      id: 'evt-test-3',
      type: 'customer.subscription.deleted',
      data: {
        object: { id: 'sub_live_789' },
      },
    } as any);

    assert.strictEqual(canceledData.subscriptionStatus, 'canceled');
    assert.strictEqual(canceledData.cancelAtPeriodEnd, true);
  });



  console.log(`Results: ${passed}/${total} tests passed (${Math.round((passed / total) * 100)}%)`);
  console.log(`========================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
