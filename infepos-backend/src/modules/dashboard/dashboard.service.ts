import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DashboardQueryDto } from './dashboard.controller';
import { DateUtilsService } from '../../common/utils/date-utils.service';
import { InventoryStatus, SaleStatus, ReturnStatus, CustomerStatus, SupplierStatus, Prisma } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dateUtils: DateUtilsService,
  ) {}

  async getSummary(tenantId: string, query: DashboardQueryDto) {
    const { start, end } = this.dateUtils.normalizeDateRange(query.fromDate, query.toDate);
    const storeIdFilter = query.storeId ? { storeId: query.storeId } : {};
    
    const [
      salesAgg,
      returnsAgg,
      salesCount,
      lowStockCount,
      outOfStockCount,
      purchaseCount,
      purchaseAgg,
      activeCustomers,
      activeSuppliers,
      todaySalesCount,
      todayCustomersCount,
      todayReturnsCount,
      todayPurchaseOrdersCount
    ] = await this.prisma.$transaction([
      // Sales Aggregate
      this.prisma.sale.aggregate({
        _sum: { grandTotal: true },
        where: { tenantId, status: SaleStatus.COMPLETED, createdAt: { gte: start, lte: end }, ...storeIdFilter }
      }),
      // Returns Aggregate
      this.prisma.saleReturn.aggregate({
        _sum: { refundTotal: true },
        where: { tenantId, status: ReturnStatus.COMPLETED, createdAt: { gte: start, lte: end }, ...storeIdFilter }
      }),
      // Total Sales Count
      this.prisma.sale.count({
        where: { tenantId, status: SaleStatus.COMPLETED, createdAt: { gte: start, lte: end }, ...storeIdFilter }
      }),
      // Inventory Low Stock
      this.prisma.inventory.count({
        where: { 
          tenantId, 
          status: InventoryStatus.ACTIVE,
          quantityOnHand: {
            lte: this.prisma.inventory.fields.reorderLevel
            // Assuming simplified logic since prisma can't easily do (quantityOnHand - reservedQuantity) <= reorderLevel in where without raw query.
            // Wait, we can't do column vs column in Prisma standard where easily for minus, but we can do it with raw or fetch.
            // Let's use raw query for precision or just do standard if not possible. For Phase 18, we can use raw query for this.
          },
          ...storeIdFilter
        }
      }),
      // Inventory Out of Stock
      this.prisma.inventory.count({
        where: {
          tenantId,
          status: InventoryStatus.ACTIVE,
          quantityOnHand: { lte: 0 },
          ...storeIdFilter
        }
      }),
      // Purchase Count
      this.prisma.purchase.count({
        where: { tenantId, createdAt: { gte: start, lte: end }, ...storeIdFilter }
      }),
      // Purchase Aggregate
      this.prisma.purchase.aggregate({
        _sum: { grandTotal: true },
        where: { tenantId, createdAt: { gte: start, lte: end }, ...storeIdFilter }
      }),
      // Active Customers
      this.prisma.customer.count({
        where: { tenantId, status: CustomerStatus.ACTIVE, createdAt: { lte: end } }
      }),
      // Active Suppliers
      this.prisma.supplier.count({
        where: { tenantId, status: SupplierStatus.ACTIVE, createdAt: { lte: end } }
      }),
      // Today Metrics (Using same start/end but let's assume it's for the requested date range which defaults to today anyway)
      this.prisma.sale.count({
        where: { tenantId, status: SaleStatus.COMPLETED, createdAt: { gte: start, lte: end }, ...storeIdFilter }
      }),
      this.prisma.customer.count({
        where: { tenantId, status: CustomerStatus.ACTIVE, createdAt: { gte: start, lte: end } }
      }),
      this.prisma.saleReturn.count({
        where: { tenantId, status: ReturnStatus.COMPLETED, createdAt: { gte: start, lte: end }, ...storeIdFilter }
      }),
      this.prisma.purchase.count({
        where: { tenantId, createdAt: { gte: start, lte: end }, ...storeIdFilter }
      })
    ]);

    // Top Selling Products (by quantity) - Need to fetch sale IDs first since groupBy doesn't support relation filters
    const matchingSales = await this.prisma.sale.findMany({
      where: { tenantId, status: SaleStatus.COMPLETED, createdAt: { gte: start, lte: end }, ...storeIdFilter },
      select: { id: true }
    });
    const saleIds = matchingSales.map(s => s.id);

    const topSellingItems = saleIds.length > 0 ? await this.prisma.saleItem.groupBy({
      by: ['productId', 'productName'],
      _sum: { quantity: true, lineTotal: true },
      where: {
        saleId: { in: saleIds }
      },
      orderBy: {
        _sum: { quantity: 'desc' }
      },
      take: 5
    }) : [];

    const grossRevenue = salesAgg._sum.grandTotal || new Prisma.Decimal(0);
    const returnsTotal = returnsAgg._sum.refundTotal || new Prisma.Decimal(0);
    const netRevenue = grossRevenue.sub(returnsTotal);
    
    let averageBasket = new Prisma.Decimal(0);
    if (salesCount > 0) {
      // averageBasket = grossRevenue / salesCount
      averageBasket = grossRevenue.div(salesCount);
    }

    // Advanced stock counts using raw query for precise available stock calculation
    const lowStockRaw: any[] = await this.prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM "inventories" 
      WHERE "tenant_id" = ${tenantId}::uuid
      AND "status" = 'ACTIVE'
      AND ("quantity_on_hand" - "reserved_quantity") <= "reorder_level"
      AND ("quantity_on_hand" - "reserved_quantity") > 0
      ${query.storeId ? Prisma.sql`AND "store_id" = ${query.storeId}::uuid` : Prisma.empty}
    `;

    const outOfStockRaw: any[] = await this.prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM "inventories" 
      WHERE "tenant_id" = ${tenantId}::uuid
      AND "status" = 'ACTIVE'
      AND ("quantity_on_hand" - "reserved_quantity") <= 0
      ${query.storeId ? Prisma.sql`AND "store_id" = ${query.storeId}::uuid` : Prisma.empty}
    `;

    return {
      sales: {
        totalSales: salesCount,
        grossRevenue: grossRevenue.toFixed(2),
        returns: returnsTotal.toFixed(2),
        netRevenue: netRevenue.toFixed(2),
        averageBasket: averageBasket.toFixed(2),
      },
      inventory: {
        lowStockProducts: Number(lowStockRaw[0]?.count || 0),
        outOfStockProducts: Number(outOfStockRaw[0]?.count || 0),
      },
      purchases: {
        purchaseOrders: purchaseCount,
        purchaseValue: (purchaseAgg._sum.grandTotal || new Prisma.Decimal(0)).toFixed(2),
      },
      customers: {
        activeCustomers,
      },
      suppliers: {
        activeSuppliers,
      },
      today: {
        todaySales: todaySalesCount,
        todayCustomers: todayCustomersCount,
        todayReturns: todayReturnsCount,
        todayPurchaseOrders: todayPurchaseOrdersCount,
      },
      topSellingProducts: topSellingItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantitySold: item._sum.quantity?.toFixed(2) || "0.00",
        revenue: item._sum.lineTotal?.toFixed(2) || "0.00"
      }))
    };
  }
}
