import { Module } from '@nestjs/common';
import { CustomerPortalAdminController } from './customer-portal-admin.controller';
import { CustomerPortalPublicController } from './customer-portal-public.controller';
import { CustomerPortalService } from './customer-portal.service';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { AwsModule } from '../aws/aws.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuditModule, AwsModule, NotificationsModule, AuthModule],
  controllers: [CustomerPortalAdminController, CustomerPortalPublicController],
  providers: [CustomerPortalService],
})
export class CustomerPortalModule {}
