import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
    @CurrentUser('storeId') userStoreId: string | null,
    @CurrentUser('roleCode') roleCode: string,
    @Body() dto: CreateInventoryDto,
  ) {
    if (userStoreId && roleCode !== 'OWNER' && roleCode !== 'SYSTEM_ADMIN') {
      if (dto.storeId !== userStoreId) {
        throw new ForbiddenException('You can only create inventory for your assigned store');
      }
    }
    return this.inventoryService.create(tenantId, dto);
  }

  @Permissions('inventory.read')
  @Get()
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('storeId') userStoreId: string | null,
    @CurrentUser('roleCode') roleCode: string,
    @Query() query: FindInventoryQueryDto,
  ) {
    // If user is scoped to a specific store (e.g. store inventory manager), strictly enforce their store
    if (userStoreId && roleCode !== 'OWNER' && roleCode !== 'SYSTEM_ADMIN') {
      query.storeId = userStoreId;
    }
    return this.inventoryService.findAll(tenantId, query);
  }

  @Permissions('inventory.read')
  @Get('export')
  async getExportData(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('storeId') userStoreId: string | null,
    @CurrentUser('roleCode') roleCode: string,
    @Query('storeId') storeId?: string,
  ) {
    const effectiveStoreId = (userStoreId && roleCode !== 'OWNER' && roleCode !== 'SYSTEM_ADMIN')
      ? userStoreId
      : storeId;
    return this.inventoryService.getExportData(tenantId, effectiveStoreId);
  }

  @Permissions('inventory.update')
  @Post('bulk-import')
  async bulkImport(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') currentUserId: string,
    @CurrentUser('storeId') userStoreId: string | null,
    @CurrentUser('roleCode') roleCode: string,
    @Body() dto: { items: any[]; mode?: 'ADD' | 'SET'; defaultStoreId?: string },
  ) {
    const effectiveStoreId = (userStoreId && roleCode !== 'OWNER' && roleCode !== 'SYSTEM_ADMIN')
      ? userStoreId
      : dto.defaultStoreId;
    return this.inventoryService.bulkImport(
      tenantId,
      currentUserId,
      dto.items || [],
      dto.mode || 'ADD',
      effectiveStoreId,
    );
  }

  @Permissions('inventory.read')
  @Get(':id')
  async findOne(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('storeId') userStoreId: string | null,
    @CurrentUser('roleCode') roleCode: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const item = await this.inventoryService.findOne(tenantId, id);
    if (userStoreId && roleCode !== 'OWNER' && roleCode !== 'SYSTEM_ADMIN' && item.storeId !== userStoreId) {
      throw new ForbiddenException('You do not have permission to view inventory for another store');
    }
    return item;
  }

  @Permissions('inventory.update')
  @Patch(':id')
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('storeId') userStoreId: string | null,
    @CurrentUser('roleCode') roleCode: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInventoryDto,
  ) {
    const item = await this.inventoryService.findOne(tenantId, id);
    if (userStoreId && roleCode !== 'OWNER' && roleCode !== 'SYSTEM_ADMIN' && item.storeId !== userStoreId) {
      throw new ForbiddenException('You do not have permission to modify inventory for another store');
    }
    return this.inventoryService.update(tenantId, id, dto);
  }

  @Permissions('inventory.delete')
  @Delete(':id')
  async remove(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('storeId') userStoreId: string | null,
    @CurrentUser('roleCode') roleCode: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const item = await this.inventoryService.findOne(tenantId, id);
    if (userStoreId && roleCode !== 'OWNER' && roleCode !== 'SYSTEM_ADMIN' && item.storeId !== userStoreId) {
      throw new ForbiddenException('You do not have permission to delete inventory for another store');
    }
    return this.inventoryService.remove(tenantId, id);
  }
}
