import * as assert from 'assert';
import * as crypto from 'crypto';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { Prisma, PrismaClient, PaymentMethod, ProductStatus, InventoryStatus, StoreStatus, UserStatus, TenantStatus, RoleStatus, ShiftStatus } from '@prisma/client';
import { SalesService } from '../src/modules/sales/sales.service';
import { calculateSaleRequestHash } from '../src/modules/sales/utils/sale-idempotency.util';

// Isolated Test Database Configuration
const TEST_DB_URL = 'postgresql://test_runner:test_secret_pw@127.0.0.1:5435/infypos_test_isolated?schema=public';

async function runPostgresIntegrationTests() {
  console.log('🐘 INFYPOS — Live PostgreSQL Idempotency Integration Suite');
  console.log('Connecting to isolated PostgreSQL instance on port 5435...\n');

  const prisma = new PrismaClient({
    datasources: {
      db: { url: TEST_DB_URL },
    },
    log: ['warn', 'error'],
  });

  const salesService = new SalesService(prisma as any);
  (salesService as any).logger = {
    log: () => {},
    warn: () => {},
    error: () => {},
  };

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}\n${err.stack}\n`);
    }
  }

  try {
    await prisma.$connect();
    console.log('Connected successfully to PostgreSQL 17 on port 5435!\n');

    const salesCols: any = await prisma.$queryRawUnsafe(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'sales' ORDER BY ordinal_position;`
    );
    console.log('Sales table columns:', salesCols.map((c: any) => c.column_name).join(', '));

    const salesIdxs: any = await prisma.$queryRawUnsafe(
      `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'sales';`
    );
    console.log('Sales table indexes:', salesIdxs.map((i: any) => i.indexname).join(', '));

    // =========================================================================
    // SEED SYNTHETIC TEST FIXTURES
    // =========================================================================
    console.log('--- Setting up synthetic multi-tenant test data ---');

    // Clean existing test data from previous runs if any
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "stock_movements", "payments", "sale_items", "sales", "inventories", "products", "shifts", "users", "stores", "roles", "tenants" CASCADE;`);

    // 1. Tenant A
    const tenantA = await prisma.tenant.create({
      data: {
        name: 'Tenant Alpha Stores',
        code: `TENANT-A-${Date.now()}`,
        status: TenantStatus.ACTIVE,
      },
    });

    const storeA = await prisma.store.create({
      data: {
        tenantId: tenantA.id,
        name: 'Store Alpha 1',
        code: `STORE-A-${Date.now()}`,
        status: StoreStatus.ACTIVE,
      },
    });

    const roleA = await prisma.role.create({
      data: {
        tenantId: tenantA.id,
        name: 'Cashier Role A',
        code: 'CASHIER_A',
        status: RoleStatus.ACTIVE,
      },
    });

    const userA = await prisma.user.create({
      data: {
        tenantId: tenantA.id,
        storeId: storeA.id,
        roleId: roleA.id,
        firstName: 'Alice',
        lastName: 'Cashier',
        email: `alice.${Date.now()}@alpha.test`,
        passwordHash: 'dummy_hash',
        status: UserStatus.ACTIVE,
      },
    });

    const shiftA = await prisma.shift.create({
      data: {
        tenantId: tenantA.id,
        storeId: storeA.id,
        openedById: userA.id,
        status: ShiftStatus.OPEN,
        openedAt: new Date(),
        startingFloat: new Prisma.Decimal(100),
      },
    });

    const productA = await prisma.product.create({
      data: {
        tenantId: tenantA.id,
        name: 'Artisan Espresso Beans',
        sku: `SKU-A-${Date.now()}`,
        barcode: `BAR-A-${Date.now()}`,
        unit: 'pack',
        sellingPrice: new Prisma.Decimal(50.00),
        costPrice: new Prisma.Decimal(25.00),
        vatRate: new Prisma.Decimal(20.00),
        status: ProductStatus.ACTIVE,
        trackInventory: true,
      },
    });

    const inventoryA = await prisma.inventory.create({
      data: {
        tenantId: tenantA.id,
        storeId: storeA.id,
        productId: productA.id,
        quantityOnHand: new Prisma.Decimal(100.00),
        reservedQuantity: new Prisma.Decimal(0.00),
        minimumStock: new Prisma.Decimal(1.00),
        maximumStock: new Prisma.Decimal(1000.00),
        reorderLevel: new Prisma.Decimal(10.00),
        status: InventoryStatus.ACTIVE,
      },
    });

    // 2. Tenant B (for multi-tenant isolation testing)
    const tenantB = await prisma.tenant.create({
      data: {
        name: 'Tenant Beta Retail',
        code: `TENANT-B-${Date.now()}`,
        status: TenantStatus.ACTIVE,
      },
    });

    const storeB = await prisma.store.create({
      data: {
        tenantId: tenantB.id,
        name: 'Store Beta 1',
        code: `STORE-B-${Date.now()}`,
        status: StoreStatus.ACTIVE,
      },
    });

    const roleB = await prisma.role.create({
      data: {
        tenantId: tenantB.id,
        name: 'Cashier Role B',
        code: 'CASHIER_B',
        status: RoleStatus.ACTIVE,
      },
    });

    const userB = await prisma.user.create({
      data: {
        tenantId: tenantB.id,
        storeId: storeB.id,
        roleId: roleB.id,
        firstName: 'Bob',
        lastName: 'Cashier',
        email: `bob.${Date.now()}@beta.test`,
        passwordHash: 'dummy_hash',
        status: UserStatus.ACTIVE,
      },
    });

    const shiftB = await prisma.shift.create({
      data: {
        tenantId: tenantB.id,
        storeId: storeB.id,
        openedById: userB.id,
        status: ShiftStatus.OPEN,
        openedAt: new Date(),
        startingFloat: new Prisma.Decimal(100),
      },
    });

    const productB = await prisma.product.create({
      data: {
        tenantId: tenantB.id,
        name: 'Organic Earl Grey Tea',
        sku: `SKU-B-${Date.now()}`,
        barcode: `BAR-B-${Date.now()}`,
        unit: 'box',
        sellingPrice: new Prisma.Decimal(30.00),
        costPrice: new Prisma.Decimal(15.00),
        vatRate: new Prisma.Decimal(20.00),
        status: ProductStatus.ACTIVE,
        trackInventory: true,
      },
    });

    const inventoryB = await prisma.inventory.create({
      data: {
        tenantId: tenantB.id,
        storeId: storeB.id,
        productId: productB.id,
        quantityOnHand: new Prisma.Decimal(50.00),
        reservedQuantity: new Prisma.Decimal(0.00),
        minimumStock: new Prisma.Decimal(1.00),
        maximumStock: new Prisma.Decimal(1000.00),
        reorderLevel: new Prisma.Decimal(10.00),
        status: InventoryStatus.ACTIVE,
      },
    });

    console.log('Synthetic fixtures created successfully!\n');

    // =========================================================================
    // SCENARIO 10 & 11: MIGRATION COMPATIBILITY & HISTORICAL NULLS
    // =========================================================================
    console.log('--- Verifying Migration & Historical Row Compatibility ---');

    await test('Scenario 10 & 11: Pre-migration duplicate detection and historical NULL key coexistence', async () => {
      // 1. Drop index to simulate pre-migration state
      await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "sales_tenant_id_idempotency_key_key";`);

      // 2. Insert 3 historical sales with NULL idempotency_key for Tenant A
      await prisma.sale.create({
        data: {
          tenantId: tenantA.id,
          storeId: storeA.id,
          userId: userA.id,
          saleNumber: `HIST-001-${Date.now()}`,
          subtotal: new Prisma.Decimal(100),
          taxAmount: new Prisma.Decimal(20),
          grandTotal: new Prisma.Decimal(120),
          status: 'COMPLETED',
          shiftId: shiftA.id,
          idempotencyKey: null,
          requestHash: null,
        },
      });

      await prisma.sale.create({
        data: {
          tenantId: tenantA.id,
          storeId: storeA.id,
          userId: userA.id,
          saleNumber: `HIST-002-${Date.now()}`,
          subtotal: new Prisma.Decimal(50),
          taxAmount: new Prisma.Decimal(10),
          grandTotal: new Prisma.Decimal(60),
          status: 'COMPLETED',
          shiftId: shiftA.id,
          idempotencyKey: null,
          requestHash: null,
        },
      });

      // 3. Insert duplicate non-null keys to verify Scenario 11
      const duplicateKey = 'PRE-MIGRATION-DUP-KEY';
      await prisma.sale.create({
        data: {
          tenantId: tenantA.id,
          storeId: storeA.id,
          userId: userA.id,
          saleNumber: `DUP-ROW-1-${Date.now()}`,
          subtotal: new Prisma.Decimal(50),
          taxAmount: new Prisma.Decimal(10),
          grandTotal: new Prisma.Decimal(60),
          status: 'COMPLETED',
          shiftId: shiftA.id,
          idempotencyKey: duplicateKey,
          requestHash: 'hash-1',
        },
      });

      const dupRow2 = await prisma.sale.create({
        data: {
          tenantId: tenantA.id,
          storeId: storeA.id,
          userId: userA.id,
          saleNumber: `DUP-ROW-2-${Date.now()}`,
          subtotal: new Prisma.Decimal(50),
          taxAmount: new Prisma.Decimal(10),
          grandTotal: new Prisma.Decimal(60),
          status: 'COMPLETED',
          shiftId: shiftA.id,
          idempotencyKey: duplicateKey,
          requestHash: 'hash-2',
        },
      });

      let indexFailedAsExpected = false;
      try {
        await prisma.$executeRawUnsafe(
          `CREATE UNIQUE INDEX "sales_tenant_id_idempotency_key_key" ON "sales"("tenant_id", "idempotency_key");`
        );
      } catch (err: any) {
        indexFailedAsExpected = true;
        assert.ok(
          err.message.includes('23505') || /unique|duplicate/i.test(err.message),
          'Must fail with unique constraint violation',
        );
      }
      assert.strictEqual(indexFailedAsExpected, true, 'Scenario 11: Index creation must fail on duplicate non-null keys');

      // 5. Clean up duplicate row
      await prisma.sale.delete({ where: { id: dupRow2.id } });

      // 6. Now apply migration SQL -> MUST SUCCEED with existing historical NULL rows
      await prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS "sales_tenant_id_idempotency_key_key" ON "sales"("tenant_id", "idempotency_key");`
      );

      // 7. Verify multiple NULL rows coexist without conflict (Scenario 10)
      const nullRowsCount: any = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int as count FROM "sales" WHERE "tenant_id" = '${tenantA.id}'::uuid AND "idempotency_key" IS NULL;`
      );
      assert.strictEqual(nullRowsCount[0].count, 2, 'Scenario 10: Multiple historical NULL rows coexist under unique index');
    });

    // =========================================================================
    // SCENARIO 1: FIRST CHECKOUT CREATES EXACTLY ONE SALE
    // =========================================================================
    console.log('\n--- Running Real PostgreSQL Direct Sales Tests ---');

    const key1 = `PG-KEY-001-${crypto.randomUUID()}`;
    let sale1Number = '';

    await test('Scenario 1: First checkout creates exactly one sale and decrements stock in PostgreSQL', async () => {
      const dto: any = {
        idempotencyKey: key1,
        shiftId: shiftA.id,
        storeId: storeA.id,
        items: [{ productId: productA.id, quantity: 2 }], // 2 * 50 = 100 + 20% VAT = 120
        payments: [{ paymentMethod: PaymentMethod.CASH, amount: 120.00 }],
      };

      const result = await salesService.create(tenantA.id, userA.id, dto);
      assert.ok(result.saleNumber, 'Must return saleNumber');
      assert.strictEqual(result.grandTotal, '120');
      sale1Number = result.saleNumber;

      // Verify PostgreSQL Database Records
      const saleRow = await prisma.sale.findFirst({
        where: { tenantId: tenantA.id, idempotencyKey: key1 },
        include: { items: true, payments: true },
      });
      assert.ok(saleRow, 'Sale row must exist in PostgreSQL');
      assert.strictEqual(saleRow?.saleNumber, sale1Number);
      assert.strictEqual(saleRow?.items.length, 1);
      assert.strictEqual(saleRow?.payments.length, 1);

      // Verify Inventory Decrement (100 - 2 = 98)
      const invRow = await prisma.inventory.findUnique({
        where: { storeId_productId: { storeId: storeA.id, productId: productA.id } },
      });
      assert.strictEqual(invRow?.quantityOnHand.toString(), '98');

      // Verify StockMovement record
      const smRows = await prisma.stockMovement.findMany({
        where: { referenceId: saleRow?.id },
      });
      assert.strictEqual(smRows.length, 1, 'Exactly one stock movement recorded');
      assert.strictEqual(smRows[0].quantity.toString(), '-2');
    });

    // =========================================================================
    // SCENARIO 2, 3, 4, 5: TWENTY CONCURRENT REQUESTS ON SAME KEY
    // =========================================================================
    const concurrentKey = `PG-CONCURRENT-${crypto.randomUUID()}`;

    await test('Scenario 2, 3, 4, 5: Twenty concurrent requests in PostgreSQL produce exactly one sale, stock decreased once', async () => {
      const concurrentDto: any = {
        idempotencyKey: concurrentKey,
        shiftId: shiftA.id,
        storeId: storeA.id,
        items: [{ productId: productA.id, quantity: 2 }], // 2 * 50 = 100 + 20% VAT = 120
        payments: [{ paymentMethod: PaymentMethod.CASH, amount: 120.00 }],
      };

      // Starting stock is 98 (from Scenario 1). Expecting final stock to be 96 (decremented by 2 exactly once).
      const invBefore = await prisma.inventory.findUnique({
        where: { storeId_productId: { storeId: storeA.id, productId: productA.id } },
      });
      assert.strictEqual(invBefore?.quantityOnHand.toString(), '98');

      // Launch 20 concurrent requests simultaneously into PostgreSQL!
      console.log('    -> Dispatching 20 parallel requests to SalesService.create()...');
      const results = await Promise.all(
        Array.from({ length: 20 }, () => salesService.create(tenantA.id, userA.id, concurrentDto))
      );

      // Verify all 20 callers received successful responses
      assert.strictEqual(results.length, 20);
      const firstSaleNumber = results[0].saleNumber;
      assert.ok(firstSaleNumber);

      for (const res of results) {
        assert.strictEqual(res.saleNumber, firstSaleNumber, 'Scenario 3: Every concurrent retry response must match winning sale');
        assert.strictEqual(res.grandTotal, '120');
      }

      // Verify Database: Exactly 1 Sale record in PostgreSQL
      const salesCount: any = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int as count FROM "sales" WHERE "tenant_id" = '${tenantA.id}'::uuid AND "idempotency_key" = '${concurrentKey}';`
      );
      assert.strictEqual(salesCount[0].count, 1, 'Scenario 2: Database contains exactly 1 sale row for the key');

      // Verify Database: Exactly 1 Payment record
      const winningSaleId = results[0].id;
      const paymentsCount = await prisma.payment.count({
        where: { saleId: winningSaleId },
      });
      assert.strictEqual(paymentsCount, 1, 'Scenario 5: Payments row is not duplicated');

      // Verify Database: Exactly 1 StockMovement record
      const movementsCount = await prisma.stockMovement.count({
        where: { referenceId: winningSaleId },
      });
      assert.strictEqual(movementsCount, 1, 'Scenario 5: Stock movement is not duplicated');

      // Verify Database: Inventory decreased exactly once (98 - 2 = 96)
      const invAfter = await prisma.inventory.findUnique({
        where: { storeId_productId: { storeId: storeA.id, productId: productA.id } },
      });
      assert.strictEqual(invAfter?.quantityOnHand.toString(), '96', 'Scenario 4: Inventory decreased exactly once across 20 threads');
    });

    // =========================================================================
    // SCENARIO 6: REUSING KEY WITH DIFFERENT PAYLOAD RETURNS 409
    // =========================================================================
    await test('Scenario 6: Reusing key with different payload returns HTTP 409 ConflictException', async () => {
      const conflictingDto: any = {
        idempotencyKey: concurrentKey, // Same key as 20 concurrent requests
        shiftId: shiftA.id,
        storeId: storeA.id,
        items: [{ productId: productA.id, quantity: 5 }], // DIFFERENT quantity
        payments: [{ paymentMethod: PaymentMethod.CASH, amount: 300.00 }],
      };

      await assert.rejects(
        async () => {
          await salesService.create(tenantA.id, userA.id, conflictingDto);
        },
        (err: any) => {
          assert.ok(err instanceof ConflictException, 'Must throw ConflictException');
          assert.match(err.message, /Idempotency key has already been used for a different checkout operation/i);
          return true;
        }
      );

      // Verify inventory untouched at 96
      const invCheck = await prisma.inventory.findUnique({
        where: { storeId_productId: { storeId: storeA.id, productId: productA.id } },
      });
      assert.strictEqual(invCheck?.quantityOnHand.toString(), '96');
    });

    // =========================================================================
    // SCENARIO 7: SAME KEY CAN BE USED INDEPENDENTLY BY TWO TENANTS
    // =========================================================================
    await test('Scenario 7: Same key can be used independently by Tenant A and Tenant B in PostgreSQL', async () => {
      const crossTenantKey = `PG-MULTI-TENANT-${crypto.randomUUID()}`;

      const dtoTenantA: any = {
        idempotencyKey: crossTenantKey,
        shiftId: shiftA.id,
        storeId: storeA.id,
        items: [{ productId: productA.id, quantity: 1 }],
        payments: [{ paymentMethod: PaymentMethod.CASH, amount: 60.00 }],
      };

      const dtoTenantB: any = {
        idempotencyKey: crossTenantKey,
        shiftId: shiftB.id,
        storeId: storeB.id,
        items: [{ productId: productB.id, quantity: 2 }], // 2 * 30 = 60 + 20% VAT = 72
        payments: [{ paymentMethod: PaymentMethod.CASH, amount: 72.00 }],
      };

      const resA = await salesService.create(tenantA.id, userA.id, dtoTenantA);
      const resB = await salesService.create(tenantB.id, userB.id, dtoTenantB);

      assert.notStrictEqual(resA.saleNumber, resB.saleNumber, 'Each tenant receives distinct saleNumber');
      assert.strictEqual(resA.grandTotal, '60');
      assert.strictEqual(resB.grandTotal, '72');

      // Verify database contains 2 distinct sales with same idempotency key
      const dbSalesCount: any = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int as count FROM "sales" WHERE "idempotency_key" = '${crossTenantKey}';`
      );
      assert.strictEqual(dbSalesCount[0].count, 2, 'Two separate rows exist in PostgreSQL scoped by tenant');
    });

    // =========================================================================
    // SCENARIO 8: UNRELATED UNIQUE-CONSTRAINT FAILURE IS NOT MASKED
    // =========================================================================
    await test('Scenario 8: Unrelated unique-constraint collision (saleNumber) is rethrown and not mistaken for idempotency', async () => {
      const freshKey = `PG-SALE-NUM-COLLISION-${crypto.randomUUID()}`;

      // Insert existing sale with predetermined saleNumber
      const existingSaleNum = `INV-COLLIDE-TEST-9999`;
      await prisma.sale.create({
        data: {
          tenantId: tenantA.id,
          storeId: storeA.id,
          userId: userA.id,
          saleNumber: existingSaleNum,
          subtotal: new Prisma.Decimal(50),
          taxAmount: new Prisma.Decimal(10),
          grandTotal: new Prisma.Decimal(60),
          status: 'COMPLETED',
          shiftId: shiftA.id,
          idempotencyKey: `OLD-KEY-${crypto.randomUUID()}`,
          requestHash: 'hash-99',
        },
      });

      // Directly test SalesService handling when tx.sale.create triggers real PostgreSQL P2002 on (tenant_id, sale_number)
      const mockPrismaWithCollision: any = {
        ...prisma,
        $transaction: async (cb: any) => {
          return await cb({
            ...prisma,
            product: prisma.product,
            inventory: prisma.inventory,
            sale: {
              ...prisma.sale,
              create: async (args: any) => {
                // Force collision with existing saleNumber in PostgreSQL
                return await prisma.sale.create({
                  ...args,
                  data: {
                    ...args.data,
                    saleNumber: existingSaleNum,
                  },
                });
              },
            },
            stockMovement: prisma.stockMovement,
          });
        },
      };

      const failingService = new SalesService(mockPrismaWithCollision);
      (failingService as any).logger = { log: () => {}, warn: () => {}, error: () => {} };

      const dto: any = {
        idempotencyKey: freshKey,
        shiftId: shiftA.id,
        storeId: storeA.id,
        items: [{ productId: productA.id, quantity: 1 }],
        payments: [{ paymentMethod: PaymentMethod.CASH, amount: 60.00 }],
      };

      await assert.rejects(
        async () => {
          await failingService.create(tenantA.id, userA.id, dto);
        },
        (err: any) => {
          // Must NOT be swallowed or converted to winning sale
          assert.strictEqual(err.code, 'P2002');
          assert.ok(
            (Array.isArray(err.meta?.target) && err.meta.target.includes('sale_number')) ||
            (typeof err.meta?.target === 'string' && err.meta.target.includes('sale_number')) ||
            err.message.includes('sale_number'),
            'Must preserve original P2002 target metadata for sale_number'
          );
          return true;
        }
      );
    });

    // =========================================================================
    // SCENARIO 9: FAILED TRANSACTION LEAVES NO PARTIAL MUTATIONS
    // =========================================================================
    await test('Scenario 9: Failed transaction leaves zero partial sale, payment, or stock mutations in PostgreSQL', async () => {
      const countBefore: any = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "sales";`);
      const invBefore = await prisma.inventory.findUnique({
        where: { storeId_productId: { storeId: storeA.id, productId: productA.id } },
      });

      const invalidDto: any = {
        idempotencyKey: `PG-FAIL-KEY-${crypto.randomUUID()}`,
        shiftId: shiftA.id,
        storeId: storeA.id,
        items: [{ productId: productA.id, quantity: 1 }],
        payments: [{ paymentMethod: PaymentMethod.CASH, amount: 999.00 }], // Under/Overpayment tender mismatch!
      };

      await assert.rejects(
        async () => {
          await salesService.create(tenantA.id, userA.id, invalidDto);
        },
        (err: any) => {
          assert.ok(err instanceof BadRequestException);
          assert.match(err.message, /do not match the required grand total/);
          return true;
        }
      );

      // Verify PostgreSQL state is completely untouched
      const countAfter: any = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "sales";`);
      const invAfter = await prisma.inventory.findUnique({
        where: { storeId_productId: { storeId: storeA.id, productId: productA.id } },
      });

      assert.strictEqual(countAfter[0].count, countBefore[0].count, 'Zero new sale rows created');
      assert.strictEqual(invAfter?.quantityOnHand.toString(), invBefore?.quantityOnHand.toString(), 'Inventory completely unchanged');
    });

    console.log(`\n========================================`);
    console.log(`PostgreSQL Integration Results: ${passed}/${total} scenarios passed (${Math.round((passed / total) * 100)}%)`);
    console.log(`========================================\n`);

  } finally {
    await prisma.$disconnect();
  }

  if (passed !== total) {
    process.exit(1);
  }
}

runPostgresIntegrationTests();
