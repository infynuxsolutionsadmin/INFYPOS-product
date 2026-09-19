import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configurations } from './config/configuration';
import { validate } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { StoresModule } from './modules/stores/stores.module';
import { TenantsModule } from './modules/tenants/tenants.module';

import { AuthModule } from './modules/auth/auth.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { ProductsModule } from './modules/products/products.module';
import { RolesModule } from './modules/roles/roles.module';
import { SalesModule } from './modules/sales/sales.module';
import { UsersModule } from './modules/users/users.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { GoodsReceiptsModule } from './modules/goods-receipts/goods-receipts.module';
import { InventoryAdjustmentsModule } from './modules/inventory-adjustments/inventory-adjustments.module';
import { StockTransfersModule } from './modules/stock-transfers/stock-transfers.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SalesReturnsModule } from './modules/sales-returns/sales-returns.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReportsModule } from './modules/reports/reports.module';
import { CustomerPortalModule } from './modules/customer-portal/customer-portal.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuditModule } from './modules/audit/audit.module';
import { AwsModule } from './modules/aws/aws.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SyncModule } from './modules/sync/sync.module';
import { SettingsModule } from './modules/settings/settings.module';
import { ShiftsModule } from './modules/shifts/shifts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configurations,
      validate,
      envFilePath: [
        `.env.${process.env.NODE_ENV || 'development'}`,
        '.env',
      ],
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10, // Default 10 requests per minute
    }]),
    DatabaseModule,
    AuthModule,
    TenantsModule,
    StoresModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    ProductsModule,
    InventoryModule,
    SalesModule,
    SuppliersModule,
    PurchasesModule,
    GoodsReceiptsModule,
    InventoryAdjustmentsModule,
    StockTransfersModule,
    CustomersModule,
    SalesReturnsModule,
    DashboardModule,
    ReportsModule,
    CustomerPortalModule,
    AuditModule,
    AwsModule,
    NotificationsModule,
    SyncModule,
    SettingsModule,
    ShiftsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
