import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SalesReturnsService } from './sales-returns.service';
import { CreateSaleReturnDto } from './dto/create-sale-return.dto';
import { FindSaleReturnsQueryDto } from './dto/find-sale-returns-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sales-returns')
export class SalesReturnsController {
  constructor(private readonly salesReturnsService: SalesReturnsService) {}

  @Permissions('salesReturns.create')
  @Post()
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateSaleReturnDto,
  ) {
    return this.salesReturnsService.create(tenantId, userId, dto);
  }

  @Permissions('salesReturns.read')
  @Get()
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: FindSaleReturnsQueryDto,
  ) {
    return this.salesReturnsService.findAll(tenantId, query);
  }

  @Permissions('salesReturns.read')
  @Get(':id')
  findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.salesReturnsService.findOne(tenantId, id);
  }
}
