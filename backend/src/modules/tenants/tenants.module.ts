import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
