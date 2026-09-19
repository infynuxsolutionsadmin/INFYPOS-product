import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncPayloadDto } from './dto/sync.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Permissions('sales.create') // Same permission used for normal sales
  @Post()
  async synchronize(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SyncPayloadDto,
  ) {
    return this.syncService.processSync(tenantId, userId, dto);
  }
}
