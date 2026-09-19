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
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { FindPurchasesQueryDto } from './dto/find-purchases-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Permissions('purchases.create')
  @Post()
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreatePurchaseDto,
  ) {
    return this.purchasesService.create(tenantId, userId, dto);
  }

  @Permissions('purchases.read')
  @Get()
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: FindPurchasesQueryDto,
  ) {
    return this.purchasesService.findAll(tenantId, query);
  }

  @Permissions('purchases.read')
  @Get(':id')
  findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.purchasesService.findOne(tenantId, id);
  }

  @Permissions('purchases.update')
  @Patch(':id')
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseDto,
  ) {
    return this.purchasesService.update(tenantId, id, dto);
  }

  @Permissions('purchases.delete')
  @Delete(':id')
  remove(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.purchasesService.remove(tenantId, id);
  }
}
