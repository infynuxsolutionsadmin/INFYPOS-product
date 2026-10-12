import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateSaleDto } from './dto/create-sale.dto';
import { FindSalesQueryDto } from './dto/find-sales-query.dto';
import { SalesService } from './sales.service';

@Controller('sales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Permissions('sales.create')
  @Post()
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Headers('idempotency-key') idempotencyHeader: string | undefined,
    @Body() dto: CreateSaleDto,
  ) {
    if (idempotencyHeader) {
      if (typeof idempotencyHeader !== 'string' || idempotencyHeader.trim().length === 0) {
        throw new BadRequestException('Idempotency-Key header must be a non-empty string');
      }
      if (idempotencyHeader.length > 100) {
        throw new BadRequestException('Idempotency-Key header must not exceed 100 characters');
      }
      if (dto.idempotencyKey && dto.idempotencyKey !== idempotencyHeader) {
        throw new BadRequestException('Idempotency-Key header does not match body idempotencyKey');
      }
      if (!dto.idempotencyKey) {
        dto.idempotencyKey = idempotencyHeader;
      }
    }
    return this.salesService.create(tenantId, userId, dto);
  }

  @Permissions('sales.read')
  @Get()
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: FindSalesQueryDto,
  ) {
    return this.salesService.findAll(tenantId, query);
  }

  @Permissions('sales.read')
  @Get(':id')
  findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.salesService.findOne(tenantId, id);
  }

  @Permissions('sales.read')
  @Get(':id/returnable')
  getReturnable(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.salesService.getReturnable(tenantId, id);
  }
}
