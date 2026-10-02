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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { FindCustomersQueryDto } from './dto/find-customers-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Permissions('customers.create')
  @Post()
  create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customersService.create(tenantId, dto);
  }

  @Permissions('customers.read')
  @Get()
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: FindCustomersQueryDto,
  ) {
    return this.customersService.findAll(tenantId, query);
  }
  
  @Permissions('customers.read')
  @Get('search')
  search(
    @CurrentUser('tenantId') tenantId: string,
    @Query('q') q: string,
  ) {
    return this.customersService.search(tenantId, q);
  }

  @Permissions('customers.read')
  @Get(':id')
  findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.customersService.findOne(tenantId, id);
  }

  @Permissions('customers.history')
  @Get(':id/history')
  history(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customersService.getHistory(tenantId, id, +(page || 1), +(limit || 10));
  }

  @Permissions('customers.history')
  @Get(':id/statistics')
  statistics(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.customersService.getStatistics(tenantId, id);
  }

  @Permissions('customers.update')
  @Patch(':id')
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(tenantId, id, dto);
  }

  @Permissions('customers.delete')
  @Delete(':id')
  remove(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.customersService.remove(tenantId, id);
  }
}
