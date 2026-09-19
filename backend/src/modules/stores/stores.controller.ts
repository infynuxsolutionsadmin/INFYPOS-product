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
import { CreateStoreDto } from './dto/create-store.dto';
import { FindStoresQueryDto } from './dto/find-stores-query.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { StoresService } from './stores.service';

@Controller('stores')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Permissions('stores.create')
  @Post()
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateStoreDto,
  ) {
    return this.storesService.create(tenantId, dto);
  }

  @Permissions('stores.read')
  @Get()
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: FindStoresQueryDto,
  ) {
    return this.storesService.findAll(tenantId, query);
  }

  @Permissions('stores.read')
  @Get(':id')
  async findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.storesService.findOne(tenantId, id);
  }

  @Permissions('stores.update')
  @Patch(':id')
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStoreDto,
  ) {
    return this.storesService.update(tenantId, id, dto);
  }

  @Permissions('stores.delete')
  @Delete(':id')
  async remove(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.storesService.remove(tenantId, id);
  }
}
