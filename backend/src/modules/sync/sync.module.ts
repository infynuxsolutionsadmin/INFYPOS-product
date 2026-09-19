import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { SalesModule } from '../sales/sales.module';
import { SalesReturnsModule } from '../sales-returns/sales-returns.module';
import { AuthModule } from '../auth/auth.module';

import { ShiftsModule } from '../shifts/shifts.module';

@Module({
  imports: [SalesModule, SalesReturnsModule, AuthModule, ShiftsModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
