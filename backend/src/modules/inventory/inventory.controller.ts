import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { FindInventoryQueryDto } from './dto/find-inventory-query.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Permissions('inventory.create')
  @Post()
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateInventoryDto,
  ) {
    return this.inventoryService.create(tenantId, dto);
  }

  @Permissions('inventory.read')
  @Get()
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: FindInventoryQueryDto,
  ) {
    return this.inventoryService.findAll(tenantId, query);
  }

  @Permissions('inventory.read')
  @Get(':id')
  async findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inventoryService.findOne(tenantId, id);
  }

  @Permissions('inventory.update')
  @Patch(':id')
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInventoryDto,
  ) {
    return this.inventoryService.update(tenantId, id, dto);
  }

  @Permissions('inventory.delete')
  @Delete(':id')
  async remove(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inventoryService.remove(tenantId, id);
  }
}
