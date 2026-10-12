import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, ParseUUIDPipe, BadRequestException } from '@nestjs/common';
import { CustomerPortalService } from './customer-portal.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('admin/portal/customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomerPortalAdminController {
  constructor(private readonly customerPortalService: CustomerPortalService) {}

  @Post()
  @Permissions('portal.customers.manage')
  async createAuthorizedCustomer(
    @CurrentUser('userId') adminId: string,
    @Body('email') email?: string,
    @Body('phone') phone?: string,
    @Body('plan') plan?: string,
  ) {
    if (!plan) throw new BadRequestException('Plan is required');
    return this.customerPortalService.createAuthorizedCustomer(adminId, email || null, phone || null, plan);
  }

  @Get()
  @Permissions('portal.customers.manage')
  async listAuthorizedCustomers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.customerPortalService.listAuthorizedCustomers(Number(page), Number(limit), search);
  }

  @Get(':id')
  @Permissions('portal.customers.manage')
  async getCustomerDetails(@Param('id', ParseUUIDPipe) id: string) {
    return this.customerPortalService.getCustomerDetails(id);
  }

  @Patch(':id/revoke')
  @Permissions('portal.customers.manage')
  async revokeCustomer(
    @CurrentUser('userId') adminId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.customerPortalService.revokeCustomer(adminId, id);
  }
}
