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
import { StockTransfersService } from './stock-transfers.service';
import { CreateStockTransferDto } from './dto/create-stock-transfer.dto';
import { UpdateStockTransferDto, ReceiveStockTransferDto } from './dto/update-stock-transfer.dto';
import { FindStockTransfersQueryDto } from './dto/find-stock-transfers-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('stock-transfers')
export class StockTransfersController {
  constructor(private readonly stockTransfersService: StockTransfersService) {}

  @Permissions('stockTransfers.create')
  @Post()
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateStockTransferDto,
  ) {
    return this.stockTransfersService.create(tenantId, userId, dto);
  }

  @Permissions('stockTransfers.read')
  @Get()
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: FindStockTransfersQueryDto,
  ) {
    return this.stockTransfersService.findAll(tenantId, query);
  }

  @Permissions('stockTransfers.read')
  @Get(':id')
  findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.stockTransfersService.findOne(tenantId, id);
  }

  @Permissions('stockTransfers.update')
  @Patch(':id')
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStockTransferDto,
  ) {
    return this.stockTransfersService.update(tenantId, id, dto);
  }

  @Permissions('stockTransfers.update')
  @Patch(':id/ship')
  ship(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.stockTransfersService.ship(tenantId, userId, id);
  }

  @Permissions('stockTransfers.update')
  @Patch(':id/receive')
  receive(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: ReceiveStockTransferDto,
  ) {
    return this.stockTransfersService.receive(tenantId, userId, id, dto);
  }

  @Permissions('stockTransfers.delete')
  @Delete(':id')
  remove(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.stockTransfersService.remove(tenantId, id);
  }
}
