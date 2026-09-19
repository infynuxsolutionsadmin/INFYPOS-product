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
  Put,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { FindSuppliersQueryDto } from './dto/find-suppliers-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Permissions('suppliers.create')
  @Post()
  create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateSupplierDto,
  ) {
    return this.suppliersService.create(tenantId, dto);
  }

  @Permissions('suppliers.read')
  @Get()
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: FindSuppliersQueryDto,
  ) {
    return this.suppliersService.findAll(tenantId, query);
  }

  @Permissions('suppliers.read')
  @Get(':id')
  findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.suppliersService.findOne(tenantId, id);
  }

  @Permissions('suppliers.update')
  @Patch(':id')
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(tenantId, id, dto);
  }

  @Permissions('suppliers.delete')
  @Delete(':id')
  remove(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.suppliersService.remove(tenantId, id);
  }
}
