import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InventoryAdjustmentsService } from './inventory-adjustments.service';
import { CreateInventoryAdjustmentDto } from './dto/create-inventory-adjustment.dto';
import { UpdateInventoryAdjustmentDto } from './dto/update-inventory-adjustment.dto';
import { FindInventoryAdjustmentsQueryDto } from './dto/find-inventory-adjustments-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory-adjustments')
export class InventoryAdjustmentsController {
  constructor(private readonly inventoryAdjustmentsService: InventoryAdjustmentsService) {}

  @Permissions('inventoryAdjustments.create')
  @Post()
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateInventoryAdjustmentDto,
  ) {
    return this.inventoryAdjustmentsService.create(tenantId, userId, dto);
  }

  @Permissions('inventoryAdjustments.read')
  @Get()
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: FindInventoryAdjustmentsQueryDto,
  ) {
    return this.inventoryAdjustmentsService.findAll(tenantId, query);
  }

  @Permissions('inventoryAdjustments.read')
  @Get(':id')
  findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.inventoryAdjustmentsService.findOne(tenantId, id);
  }

  @Permissions('inventoryAdjustments.update')
  @Patch(':id')
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInventoryAdjustmentDto,
  ) {
    return this.inventoryAdjustmentsService.update(tenantId, id, dto);
  }

  @Permissions('inventoryAdjustments.delete')
  @Delete(':id')
  remove(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.inventoryAdjustmentsService.remove(tenantId, id);
  }
}
