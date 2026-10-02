import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DateUtilsService } from '../../common/utils/date-utils.service';
import { Prisma, SaleStatus, ReturnStatus, PurchaseStatus, InventoryStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dateUtils: DateUtilsService,
  ) {}

  // =========================================================================
  // SALES REPORTS
  // =========================================================================
  async getSales(tenantId: string, query: any) {
    const { start, end } = this.dateUtils.normalizeDateRange(query.fromDate, query.toDate);
    const { page = 1, limit = 20, storeId, userId, paymentMethod } = query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const where: any = {
      tenantId,
      status: SaleStatus.COMPLETED,
      createdAt: { gte: start, lte: end }
    };
    if (storeId) where.storeId = storeId;
    if (userId) where.userId = userId;
    if (paymentMethod) where.paymentMethod = paymentMethod;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.sale.count({ where }),
      this.prisma.sale.findMany({
        where, skip, take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { store: { select: { code: true, name: true } }, user: { select: { firstName: true, lastName: true } } }
      })
    ]);

    return { items, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
  }

  async getSalesSummary(tenantId: string, query: any) {
    const { start, end } = this.dateUtils.normalizeDateRange(query.fromDate, query.toDate);
    const storeIdFilter = query.storeId ? { storeId: query.storeId } : {};

    const [salesAgg, returnsAgg, salesCount] = await this.prisma.$transaction([
      this.prisma.sale.aggregate({
        _sum: { grandTotal: true },
        where: { tenantId, status: SaleStatus.COMPLETED, createdAt: { gte: start, lte: end }, ...storeIdFilter }
      }),
      this.prisma.saleReturn.aggregate({
        _sum: { refundTotal: true },
        where: { tenantId, status: ReturnStatus.COMPLETED, createdAt: { gte: start, lte: end }, ...storeIdFilter }
      }),
      this.prisma.sale.count({
        where: { tenantId, status: SaleStatus.COMPLETED, createdAt: { gte: start, lte: end }, ...storeIdFilter }
      })
    ]);

    const grossSales = salesAgg._sum.grandTotal || new Prisma.Decimal(0);
    const totalReturns = returnsAgg._sum.refundTotal || new Prisma.Decimal(0);
    const netSales = grossSales.sub(totalReturns);
    let averageBasket = new Prisma.Decimal(0);
    if (salesCount > 0) averageBasket = grossSales.div(salesCount);

    return {
      totalSales: salesCount,
      grossSales: grossSales.toFixed(2),
      totalReturns: totalReturns.toFixed(2),
      netSales: netSales.toFixed(2),
      averageBasket: averageBasket.toFixed(2),
    };
  }

  async getSalesByProduct(tenantId: string, query: any) {
    const { start, end } = this.dateUtils.normalizeDateRange(query.fromDate, query.toDate);
    const storeIdFilter = query.storeId ? { storeId: query.storeId } : {};

    const matchingSales = await this.prisma.sale.findMany({
      where: { tenantId, status: SaleStatus.COMPLETED, createdAt: { gte: start, lte: end }, ...storeIdFilter },
      select: { id: true }
    });
    const saleIds = matchingSales.map(s => s.id);

    const items = saleIds.length > 0 ? await this.prisma.saleItem.groupBy({
      by: ['productId', 'productName', 'sku'],
      _sum: { quantity: true, lineTotal: true },
      where: {
        saleId: { in: saleIds }
      },
      orderBy: { _sum: { quantity: 'desc' } }
    }) : [];

    return items.map(item => {
      const quantitySold = item._sum.quantity || new Prisma.Decimal(0);
      const grossSales = item._sum.lineTotal || new Prisma.Decimal(0);
      let averageSellingPrice = new Prisma.Decimal(0);
      if (quantitySold.gt(0)) averageSellingPrice = grossSales.div(quantitySold);

      return {
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        quantitySold: quantitySold.toFixed(2),
        grossSales: grossSales.toFixed(2),
        averageSellingPrice: averageSellingPrice.toFixed(2),
      };
    });
  }

  async getSalesByPaymentMethod(tenantId: string, query: any) {
    const { start, end } = this.dateUtils.normalizeDateRange(query.fromDate, query.toDate);
    const storeIdFilter = query.storeId ? { storeId: query.storeId } : {};

    const items = await this.prisma.sale.groupBy({
      by: ['paymentMethod'],
      _count: { id: true },
      _sum: { grandTotal: true },
      where: { tenantId, status: SaleStatus.COMPLETED, createdAt: { gte: start, lte: end }, ...storeIdFilter }
    });

    return items.map(item => ({
      paymentMethod: item.paymentMethod,
      transactionCount: item._count.id,
      amount: (item._sum.grandTotal || new Prisma.Decimal(0)).toFixed(2)
    }));
  }

  async getSalesByStore(tenantId: string, query: any) {
    const { start, end } = this.dateUtils.normalizeDateRange(query.fromDate, query.toDate);
    
    // Group sales by store
    const salesAgg = await this.prisma.sale.groupBy({
      by: ['storeId'],
      _count: { id: true },
      _sum: { grandTotal: true },
      where: { tenantId, status: SaleStatus.COMPLETED, createdAt: { gte: start, lte: end } }
    });

    // Group returns by store
    const returnsAgg = await this.prisma.saleReturn.groupBy({
      by: ['storeId'],
      _sum: { refundTotal: true },
      where: { tenantId, status: ReturnStatus.COMPLETED, createdAt: { gte: start, lte: end } }
    });

    // Get stores mapping
    const storeIds = salesAgg.map(s => s.storeId);
    const stores = await this.prisma.store.findMany({ where: { id: { in: storeIds } } });
    const storeMap = new Map(stores.map(s => [s.id, s]));

    const returnMap = new Map(returnsAgg.map(r => [r.storeId, r._sum.refundTotal || new Prisma.Decimal(0)]));

    return salesAgg.map(s => {
      const store = storeMap.get(s.storeId);
      const grossSales = s._sum.grandTotal || new Prisma.Decimal(0);
      const returns = returnMap.get(s.storeId) || new Prisma.Decimal(0);
      const netSales = grossSales.sub(returns);
      const transactionCount = s._count.id;
      let averageBasket = new Prisma.Decimal(0);
      if (transactionCount > 0) averageBasket = grossSales.div(transactionCount);

      return {
        storeId: s.storeId,
        storeCode: store?.code || 'UNKNOWN',
        storeName: store?.name || 'Unknown Store',
        grossSales: grossSales.toFixed(2),
        returns: returns.toFixed(2),
        netSales: netSales.toFixed(2),
        transactionCount,
        averageBasket: averageBasket.toFixed(2)
      };
    });
  }

  // =========================================================================
  // PURCHASE REPORTS
  // =========================================================================
  async getPurchases(tenantId: string, query: any) {
    const { start, end } = this.dateUtils.normalizeDateRange(query.fromDate, query.toDate);
    const { page = 1, limit = 20, storeId, supplierId, status } = query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const where: any = { tenantId, createdAt: { gte: start, lte: end } };
    if (storeId) where.storeId = storeId;
    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.purchase.count({ where }),
      this.prisma.purchase.findMany({
        where, skip, take: Number(limit),
        orderBy: { createdAt: 'desc' },
      })
    ]);

    return { items, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
  }

  async getPurchasesSummary(tenantId: string, query: any) {
    const { start, end } = this.dateUtils.normalizeDateRange(query.fromDate, query.toDate);
    const storeIdFilter = query.storeId ? { storeId: query.storeId } : {};

    const agg = await this.prisma.purchase.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { grandTotal: true },
      where: { tenantId, createdAt: { gte: start, lte: end }, ...storeIdFilter }
    });

    let totalPurchaseOrders = 0;
    let totalPurchaseValue = new Prisma.Decimal(0);
    const summary = {
      totalPurchaseOrders: 0,
      totalPurchaseValue: "0.00",
      draftOrders: 0,
      approvedOrders: 0,
      orderedOrders: 0,
      partiallyReceivedOrders: 0,
      receivedOrders: 0,
      cancelledOrders: 0
    };

    agg.forEach(group => {
      const count = group._count.id;
      const value = group._sum.grandTotal || new Prisma.Decimal(0);
      totalPurchaseOrders += count;
      totalPurchaseValue = totalPurchaseValue.add(value);

      if (group.status === PurchaseStatus.DRAFT) summary.draftOrders = count;
      if (group.status === PurchaseStatus.APPROVED) summary.approvedOrders = count;
      if (group.status === PurchaseStatus.ORDERED) summary.orderedOrders = count;
      if (group.status === PurchaseStatus.PARTIALLY_RECEIVED) summary.partiallyReceivedOrders = count;
      if (group.status === PurchaseStatus.RECEIVED) summary.receivedOrders = count;
      if (group.status === PurchaseStatus.CANCELLED) summary.cancelledOrders = count;
    });

    summary.totalPurchaseOrders = totalPurchaseOrders;
    summary.totalPurchaseValue = totalPurchaseValue.toFixed(2);
    return summary;
  }

  async getPurchasesBySupplier(tenantId: string, query: any) {
    const { start, end } = this.dateUtils.normalizeDateRange(query.fromDate, query.toDate);
    const storeIdFilter = query.storeId ? { storeId: query.storeId } : {};

    const items = await this.prisma.purchase.groupBy({
      by: ['supplierId', 'supplierName', 'supplierCode'],
      _count: { id: true },
      _sum: { grandTotal: true },
      where: { tenantId, createdAt: { gte: start, lte: end }, ...storeIdFilter },
      orderBy: { _sum: { grandTotal: 'desc' } }
    });

    return items.map(i => ({
      supplierId: i.supplierId,
      supplierName: i.supplierName,
      supplierCode: i.supplierCode,
      purchaseOrders: i._count.id,
      totalPurchaseValue: (i._sum.grandTotal || new Prisma.Decimal(0)).toFixed(2)
    }));
  }

  // =========================================================================
  // INVENTORY REPORTS
  // =========================================================================
  async getInventory(tenantId: string, query: any) {
    const { page = 1, limit = 20, storeId, status, search } = query;
    const skip = (Number(page) - 1) * Number(limit);
    
    let whereQuery: string = `WHERE i."tenant_id" = '${tenantId}'::uuid`;
    if (storeId) whereQuery += ` AND i."store_id" = '${storeId}'::uuid`;
    if (status) whereQuery += ` AND i."status" = '${status}'`;
    if (search) whereQuery += ` AND (p."name" ILIKE '%${search}%' OR p."sku" ILIKE '%${search}%')`;

    // Calculate Available Stock safely using Raw Query
    const totalRaw: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count 
      FROM "inventories" i 
      INNER JOIN "products" p ON p."id" = i."product_id"
      ${whereQuery}
    `);

    const total = Number(totalRaw[0]?.count || 0);

    const itemsRaw: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT i.*, 
             p."name" as "productName", 
             p."sku" as "productSku",
             (i."quantity_on_hand" - i."reserved_quantity") as "availableStock"
      FROM "inventories" i 
      INNER JOIN "products" p ON p."id" = i."product_id"
      ${whereQuery}
      ORDER BY p."name" ASC
      LIMIT ${Number(limit)} OFFSET ${skip}
    `);

    return {
      items: itemsRaw.map(r => ({
        ...r,
        quantityOnHand: Number(r.quantity_on_hand),
        reservedQuantity: Number(r.reserved_quantity),
        availableStock: Number(r.availableStock)
      })),
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) }
    };
  }

  async getInventoryLowStock(tenantId: string, query: any) {
    const storeIdFilter = query.storeId ? Prisma.sql`AND "store_id" = ${query.storeId}::uuid` : Prisma.empty;
    const itemsRaw: any[] = await this.prisma.$queryRaw`
      SELECT i.*, 
             p."name" as "productName", 
             p."sku" as "productSku",
             (i."quantity_on_hand" - i."reserved_quantity") as "availableStock"
      FROM "inventories" i 
      INNER JOIN "products" p ON p."id" = i."product_id"
      WHERE i."tenant_id" = ${tenantId}::uuid
      AND i."status" = 'ACTIVE'
      AND (i."quantity_on_hand" - i."reserved_quantity") <= i."reorder_level"
      AND (i."quantity_on_hand" - i."reserved_quantity") > 0
      ${storeIdFilter}
      ORDER BY p."name" ASC
    `;

    return itemsRaw.map(r => ({
      ...r,
      quantityOnHand: Number(r.quantity_on_hand),
      reservedQuantity: Number(r.reserved_quantity),
      availableStock: Number(r.availableStock),
      reorderLevel: Number(r.reorder_level)
    }));
  }

  async getInventoryOutOfStock(tenantId: string, query: any) {
    const storeIdFilter = query.storeId ? Prisma.sql`AND "store_id" = ${query.storeId}::uuid` : Prisma.empty;
    const itemsRaw: any[] = await this.prisma.$queryRaw`
      SELECT i.*, 
             p."name" as "productName", 
             p."sku" as "productSku",
             (i."quantity_on_hand" - i."reserved_quantity") as "availableStock"
      FROM "inventories" i 
      INNER JOIN "products" p ON p."id" = i."product_id"
      WHERE i."tenant_id" = ${tenantId}::uuid
      AND i."status" = 'ACTIVE'
      AND (i."quantity_on_hand" - i."reserved_quantity") <= 0
      ${storeIdFilter}
      ORDER BY p."name" ASC
    `;

    return itemsRaw.map(r => ({
      ...r,
      quantityOnHand: Number(r.quantity_on_hand),
      reservedQuantity: Number(r.reserved_quantity),
      availableStock: Number(r.availableStock)
    }));
  }

  async getInventoryValuation(tenantId: string, query: any) {
    const storeIdFilter = query.storeId ? Prisma.sql`AND i."store_id" = ${query.storeId}::uuid` : Prisma.empty;
    
    // Group by store and sum(quantityOnHand * costPrice)
    const storesRaw: any[] = await this.prisma.$queryRaw`
      SELECT i."store_id", 
             s."name" as "storeName",
             SUM(i."quantity_on_hand") as "totalQuantity",
             SUM(i."quantity_on_hand" * p."cost_price") as "inventoryValue"
      FROM "inventories" i
      INNER JOIN "products" p ON p."id" = i."product_id"
      INNER JOIN "stores" s ON s."id" = i."store_id"
      WHERE i."tenant_id" = ${tenantId}::uuid
      AND i."status" = 'ACTIVE'
      ${storeIdFilter}
      GROUP BY i."store_id", s."name"
      ORDER BY s."name" ASC
    `;

    return storesRaw.map(r => ({
      storeId: r.store_id,
      storeName: r.storeName,
      totalQuantity: Number(r.totalQuantity || 0).toFixed(2),
      inventoryValue: Number(r.inventoryValue || 0).toFixed(2)
    }));
  }

  // =========================================================================
  // LEDGER REPORTS
  // =========================================================================
  async getStockMovements(tenantId: string, query: any) {
    const { start, end } = this.dateUtils.normalizeDateRange(query.fromDate, query.toDate);
    const { page = 1, limit = 20, storeId, productId, movementType, referenceType } = query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const where: any = { tenantId, createdAt: { gte: start, lte: end } };
    if (storeId) where.storeId = storeId;
    if (productId) where.productId = productId;
    if (movementType) where.movementType = movementType;
    if (referenceType) where.referenceType = referenceType;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.stockMovement.count({ where }),
      this.prisma.stockMovement.findMany({
        where, skip, take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { name: true, sku: true } },
          store: { select: { name: true, code: true } }
        }
      })
    ]);

    return { 
      items: items.map(i => ({
        ...i,
        referenceNumber: i.referenceId // Exposing as referenceNumber for clarity
      })), 
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } 
    };
  }

  async getInventoryAdjustments(tenantId: string, query: any) {
    const { start, end } = this.dateUtils.normalizeDateRange(query.fromDate, query.toDate);
    const { page = 1, limit = 20, storeId, reason, status } = query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const where: any = { tenantId, createdAt: { gte: start, lte: end } };
    if (storeId) where.storeId = storeId;
    if (reason) where.reason = reason;
    if (status) where.status = status;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.inventoryAdjustment.count({ where }),
      this.prisma.inventoryAdjustment.findMany({
        where, skip, take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { store: { select: { name: true } }, items: true }
      })
    ]);

    return { items, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } };
  }

  async getStockTransfers(tenantId: string, query: any) {
    const { start, end } = this.dateUtils.normalizeDateRange(query.fromDate, query.toDate);
    const { page = 1, limit = 20, sourceStoreId, destinationStoreId, status } = query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const where: any = { tenantId, createdAt: { gte: start, lte: end } };
    if (sourceStoreId) where.sourceStoreId = sourceStoreId;
    if (destinationStoreId) where.destinationStoreId = destinationStoreId;
    if (status) where.status = status;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.stockTransfer.count({ where }),
      this.prisma.stockTransfer.findMany({
        where, skip, take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          sourceStore: { select: { name: true } },
          destinationStore: { select: { name: true } },
          items: true
        }
      })
    ]);

    return { 
      items: items.map(i => {
        let itemCount = i.items.length;
        let totalQuantity = new Prisma.Decimal(0);
        let totalValue = new Prisma.Decimal(0);
        for (const item of i.items) {
          totalQuantity = totalQuantity.add(item.quantity);
          totalValue = totalValue.add(item.totalValue);
        }
        return {
          id: i.id,
          transferNumber: i.transferNumber,
          sourceStore: i.sourceStore.name,
          destinationStore: i.destinationStore.name,
          status: i.status,
          itemCount,
          totalQuantity: totalQuantity.toFixed(2),
          totalValue: totalValue.toFixed(2),
          shippedAt: i.shippedAt,
          receivedAt: i.receivedAt,
          createdAt: i.createdAt
        };
      }), 
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } 
    };
  }

  // =========================================================================
  // ENTITY REPORTS
  // =========================================================================
  async getCustomers(tenantId: string, query: any) {
    const { start, end } = this.dateUtils.normalizeDateRange(query.fromDate, query.toDate);
    const { page = 1, limit = 20, search } = query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const where: any = { tenantId, createdAt: { lte: end } };
    if (search) {
      where.OR = [
        { customerCode: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, customers] = await this.prisma.$transaction([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where, skip, take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { sales: { orderBy: { createdAt: 'desc' } } } // To get last purchase date easily, though subqueries are better for scale. Since Prisma lacks a simple lateral join, this is acceptable for paginated lists of 20 items.
      })
    ]);

    return { 
      items: customers.map(c => {
        const totalPurchases = c.sales.length;
        const totalSpent = c.sales.reduce((acc, s) => acc.add(s.grandTotal), new Prisma.Decimal(0));
        const lastPurchaseDate = c.sales[0]?.createdAt || null;

        return {
          customerId: c.id,
          customerCode: c.customerCode,
          customerName: `${c.firstName} ${c.lastName || ''}`.trim(),
          totalPurchases,
          totalSpent: totalSpent.toFixed(2),
          lastPurchaseDate,
          currentPoints: c.currentPoints.toFixed(2),
          tier: c.tier
        };
      }), 
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } 
    };
  }

  async getSuppliers(tenantId: string, query: any) {
    const { page = 1, limit = 20, search } = query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const where: any = { tenantId };
    if (search) {
      where.OR = [
        { supplierCode: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, suppliers] = await this.prisma.$transaction([
      this.prisma.supplier.count({ where }),
      this.prisma.supplier.findMany({
        where, skip, take: Number(limit),
        orderBy: { name: 'asc' },
        include: { purchases: { orderBy: { createdAt: 'desc' } } }
      })
    ]);

    return { 
      items: suppliers.map(s => {
        const purchaseOrderCount = s.purchases.length;
        let totalPurchaseValue = new Prisma.Decimal(0);
        let pendingPurchaseOrders = 0;
        let completedPurchaseOrders = 0;

        for (const p of s.purchases) {
          totalPurchaseValue = totalPurchaseValue.add(p.grandTotal);
          if (p.status === PurchaseStatus.DRAFT || p.status === PurchaseStatus.APPROVED || p.status === PurchaseStatus.ORDERED || p.status === PurchaseStatus.PARTIALLY_RECEIVED) {
            pendingPurchaseOrders++;
          }
          if (p.status === PurchaseStatus.RECEIVED) {
            completedPurchaseOrders++;
          }
        }
        
        return {
          supplierId: s.id,
          supplierCode: s.supplierCode,
          supplierName: s.name,
          purchaseOrderCount,
          pendingPurchaseOrders,
          completedPurchaseOrders,
          totalPurchaseValue: totalPurchaseValue.toFixed(2),
          lastPurchaseDate: s.purchases[0]?.createdAt || null
        };
      }), 
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } 
    };
  }

  // =========================================================================
  // RETURNS REPORTS
  // =========================================================================
  async getSalesReturns(tenantId: string, query: any) {
    const { start, end } = this.dateUtils.normalizeDateRange(query.fromDate, query.toDate);
    const { page = 1, limit = 20, storeId, customerId, reason } = query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const where: any = { tenantId, createdAt: { gte: start, lte: end } };
    if (storeId) where.storeId = storeId;
    if (customerId) where.customerId = customerId;

    if (reason) {
      where.items = { some: { reason } };
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.saleReturn.count({ where }),
      this.prisma.saleReturn.findMany({
        where, skip, take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          originalSale: { select: { saleNumber: true } },
          store: { select: { name: true } },
          customer: { select: { firstName: true, lastName: true, customerCode: true } },
          items: true
        }
      })
    ]);

    return { 
      items: items.map(i => {
        let returnedQuantity = new Prisma.Decimal(0);
        let reasonStr = i.items[0]?.reason || 'N/A'; // just take first reason for simple listing
        for (const item of i.items) returnedQuantity = returnedQuantity.add(item.quantity);

        return {
          id: i.id,
          returnNumber: i.returnNumber,
          originalSaleNumber: i.originalSale.saleNumber,
          customer: i.customer ? `${i.customer.firstName} ${i.customer.lastName || ''}`.trim() : 'Walk-in',
          store: i.store.name,
          refundTotal: i.refundTotal.toFixed(2),
          returnedQuantity: returnedQuantity.toFixed(2),
          refundMethod: i.refundMethod,
          reason: reasonStr,
          status: i.status,
          createdAt: i.createdAt
        };
      }), 
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } 
    };
  }

  async getSalesReturnsSummary(tenantId: string, query: any) {
    const { start, end } = this.dateUtils.normalizeDateRange(query.fromDate, query.toDate);
    const storeIdFilter = query.storeId ? { storeId: query.storeId } : {};

    const matchingReturns = await this.prisma.saleReturn.findMany({
      where: { tenantId, status: ReturnStatus.COMPLETED, createdAt: { gte: start, lte: end }, ...storeIdFilter },
      select: { id: true }
    });
    const returnIds = matchingReturns.map(r => r.id);

    const totalReturnsAgg = await this.prisma.saleReturn.aggregate({
      _count: { id: true },
      _sum: { refundTotal: true },
      where: { tenantId, status: ReturnStatus.COMPLETED, createdAt: { gte: start, lte: end }, ...storeIdFilter }
    });

    const reasonAgg = returnIds.length > 0 ? await this.prisma.saleReturnItem.groupBy({
      by: ['reason'],
      _sum: { quantity: true, lineTotal: true },
      where: {
        saleReturnId: { in: returnIds }
      }
    }) : [];

    return {
      totalReturns: totalReturnsAgg._count.id,
      totalRefundAmount: (totalReturnsAgg._sum.refundTotal || new Prisma.Decimal(0)).toFixed(2),
      byReason: reasonAgg.map(r => ({
        reason: r.reason,
        quantityReturned: (r._sum.quantity || new Prisma.Decimal(0)).toFixed(2),
        refundValue: (r._sum.lineTotal || new Prisma.Decimal(0)).toFixed(2)
      }))
    };
  }

  // =========================================================================
  // VAT REPORTS
  // =========================================================================
  async getVatSummary(tenantId: string, query: any) {
    const { start, end } = this.dateUtils.normalizeDateRange(query.fromDate, query.toDate);

    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        status: SaleStatus.COMPLETED,
        createdAt: { gte: start, lte: end },
      },
      include: {
        items: true,
      },
    });

    const returns = await this.prisma.saleReturn.findMany({
      where: {
        tenantId,
        status: ReturnStatus.COMPLETED,
        createdAt: { gte: start, lte: end },
      },
      include: {
        items: true,
      },
    });

    const vatRatesMap = new Map<string, { net: Prisma.Decimal, vat: Prisma.Decimal, gross: Prisma.Decimal }>();

    const initializeRate = (rate: string) => {
      if (!vatRatesMap.has(rate)) {
        vatRatesMap.set(rate, { net: new Prisma.Decimal(0), vat: new Prisma.Decimal(0), gross: new Prisma.Decimal(0) });
      }
      return vatRatesMap.get(rate)!;
    };

    // Process Sales (Output Tax)
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const rate = item.vatRate.toString();
        const stats = initializeRate(rate);
        const itemTax = item.lineTotal.mul(item.vatRate.div(100));
        
        stats.net = stats.net.add(item.lineTotal);
        stats.vat = stats.vat.add(itemTax);
        stats.gross = stats.gross.add(item.lineTotal.add(itemTax));
      });
    });

    // Process Returns (Negative Output Tax)
    returns.forEach(ret => {
      ret.items.forEach(item => {
        const rate = item.vatRate.toString();
        const stats = initializeRate(rate);
        const itemTax = item.lineTotal.mul(item.vatRate.div(100));
        
        stats.net = stats.net.sub(item.lineTotal);
        stats.vat = stats.vat.sub(itemTax);
        stats.gross = stats.gross.sub(item.lineTotal.add(itemTax));
      });
    });

    const summary = Array.from(vatRatesMap.entries()).map(([rate, stats]) => ({
      vatRate: rate,
      netSales: stats.net.toFixed(2),
      vatCollected: stats.vat.toFixed(2),
      grossSales: stats.gross.toFixed(2),
    }));

    return {
      success: true,
      statusCode: 200,
      timestamp: new Date().toISOString(),
      data: summary,
      meta: {
        period: { start, end },
      }
    };
  }

  async getVatMtdExport(tenantId: string, query: any) {
    const summaryResponse = await this.getVatSummary(tenantId, query);
    const summaryData = summaryResponse.data;

    let totalOutputVat = new Prisma.Decimal(0);
    let totalNetSales = new Prisma.Decimal(0);

    summaryData.forEach((row: any) => {
      totalOutputVat = totalOutputVat.add(new Prisma.Decimal(row.vatCollected));
      totalNetSales = totalNetSales.add(new Prisma.Decimal(row.netSales));
    });

    return {
      success: true,
      statusCode: 200,
      timestamp: new Date().toISOString(),
      data: {
        box1_vatDueOnSales: totalOutputVat.toFixed(2),
        box2_vatDueOnAcquisitions: "0.00",
        box3_totalVatDue: totalOutputVat.toFixed(2),
        box4_vatReclaimedOnPurchases: "0.00",
        box5_netVat: totalOutputVat.toFixed(2),
        box6_totalValueSalesExVAT: totalNetSales.toFixed(2),
        box7_totalValuePurchasesExVAT: "0.00",
        box8_totalValueSuppliesExVAT: "0.00",
        box9_totalValueAcquisitionsExVAT: "0.00"
      },
      meta: {
        note: "HMRC MTD Export Summary (Output Tax Only). Exact box mapping is generalized pending explicitly defined MTD schema in PRD.",
        period: summaryResponse.meta.period,
      }
    };
  }
}
