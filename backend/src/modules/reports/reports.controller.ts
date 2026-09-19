import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('reports.read')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // SALES REPORTS
  @Get('sales')
  getSales(@CurrentUser('tenantId') tenantId: string, @Query() query: any) {
    return this.reportsService.getSales(tenantId, query);
  }

  @Get('sales/summary')
  getSalesSummary(@CurrentUser('tenantId') tenantId: string, @Query() query: any) {
    return this.reportsService.getSalesSummary(tenantId, query);
  }

  @Get('sales/by-product')
  getSalesByProduct(@CurrentUser('tenantId') tenantId: string, @Query() query: any) {
    return this.reportsService.getSalesByProduct(tenantId, query);
  }

  @Get('sales/by-payment-method')
  getSalesByPaymentMethod(@CurrentUser('tenantId') tenantId: string, @Query() query: any) {
    return this.reportsService.getSalesByPaymentMethod(tenantId, query);
  }

  @Get('sales/by-store')
  getSalesByStore(@CurrentUser('tenantId') tenantId: string, @Query() query: any) {
    return this.reportsService.getSalesByStore(tenantId, query);
  }

  // PURCHASE REPORTS
  @Get('purchases')
  getPurchases(@CurrentUser('tenantId') tenantId: string, @Query() query: any) {
    return this.reportsService.getPurchases(tenantId, query);
  }

  @Get('purchases/summary')
  getPurchasesSummary(@CurrentUser('tenantId') tenantId: string, @Query() query: any) {
    return this.reportsService.getPurchasesSummary(tenantId, query);
  }

  @Get('purchases/by-supplier')
  getPurchasesBySupplier(@CurrentUser('tenantId') tenantId: string, @Query() query: any) {
    return this.reportsService.getPurchasesBySupplier(tenantId, query);
  }

  // INVENTORY REPORTS
  @Get('inventory')
  getInventory(@CurrentUser('tenantId') tenantId: string, @Query() query: any) {
    return this.reportsService.getInventory(tenantId, query);
  }

  @Get('inventory/low-stock')
  getInventoryLowStock(@CurrentUser('tenantId') tenantId: string, @Query() query: any) {
    return this.reportsService.getInventoryLowStock(tenantId, query);
  }

  @Get('inventory/out-of-stock')
  getInventoryOutOfStock(@CurrentUser('tenantId') tenantId: string, @Query() query: any) {
    return this.reportsService.getInventoryOutOfStock(tenantId, query);
  }

  @Get('inventory/valuation')
  getInventoryValuation(@CurrentUser('tenantId') tenantId: string, @Query() query: any) {
    return this.reportsService.getInventoryValuation(tenantId, query);
  }

  // STOCK MOVEMENTS
  @Get('stock-movements')
  getStockMovements(@CurrentUser('tenantId') tenantId: string, @Query() query: any) {
    return this.reportsService.getStockMovements(tenantId, query);
  }

  @Get('inventory-adjustments')
  getInventoryAdjustments(@CurrentUser('tenantId') tenantId: string, @Query() query: any) {
    return this.reportsService.getInventoryAdjustments(tenantId, query);
  }

  @Get('stock-transfers')
  getStockTransfers(@CurrentUser('tenantId') tenantId: string, @Query() query: any) {
    return this.reportsService.getStockTransfers(tenantId, query);
  }

  // =========================================================================
  // VAT REPORTS
  // =========================================================================
  @Get('vat-summary')
  getVatSummary(@CurrentUser('tenantId') tenantId: string, @Query() query: any) {
    return this.reportsService.getVatSummary(tenantId, query);
  }

  @Get('vat-mtd-export')
  getVatMtdExport(@CurrentUser('tenantId') tenantId: string, @Query() query: any) {
    return this.reportsService.getVatMtdExport(tenantId, query);
  }

  // ENTITY REPORTS
  @Get('customers')
  getCustomers(@CurrentUser('tenantId') tenantId: string, @Query() query: any) {
    return this.reportsService.getCustomers(tenantId, query);
  }

  @Get('suppliers')
  getSuppliers(@CurrentUser('tenantId') tenantId: string, @Query() query: any) {
    return this.reportsService.getSuppliers(tenantId, query);
  }

  // SALES RETURNS
  @Get('sales-returns')
  getSalesReturns(@CurrentUser('tenantId') tenantId: string, @Query() query: any) {
    return this.reportsService.getSalesReturns(tenantId, query);
  }

  @Get('sales-returns/summary')
  getSalesReturnsSummary(@CurrentUser('tenantId') tenantId: string, @Query() query: any) {
    return this.reportsService.getSalesReturnsSummary(tenantId, query);
  }
}
