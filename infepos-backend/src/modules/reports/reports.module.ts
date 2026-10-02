import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { DateUtilsService } from '../../common/utils/date-utils.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ReportsController],
  providers: [ReportsService, DateUtilsService],
})
export class ReportsModule {}
