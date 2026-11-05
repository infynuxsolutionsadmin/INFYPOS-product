import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../database/database.module';
import { BillingController } from './billing.controller';
import { StripeService } from './stripe.service';

@Module({
  imports: [DatabaseModule, ConfigModule],
  controllers: [BillingController],
  providers: [StripeService],
  exports: [StripeService],
})
export class BillingModule {}
