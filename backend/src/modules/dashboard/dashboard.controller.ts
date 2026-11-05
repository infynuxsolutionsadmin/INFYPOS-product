import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsOptional, IsString } from 'class-validator';

export class DashboardQueryDto {
  @IsString()
  @IsOptional()
  storeId?: string;

  @IsString()
  @IsOptional()
  fromDate?: string;

  @IsString()
  @IsOptional()
  toDate?: string;
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Permissions('dashboard.read')
  @Get('summary')
  getSummary(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('storeId') userStoreId: string | null,
    @CurrentUser('roleCode') roleCode: string,
    @Query() query: DashboardQueryDto,
  ) {
    if (userStoreId && roleCode !== 'OWNER' && roleCode !== 'SYSTEM_ADMIN') {
      query.storeId = userStoreId;
    }
    return this.dashboardService.getSummary(tenantId, query);
  }
}
