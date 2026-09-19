import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateRoleDto } from './dto/create-role.dto';
import { FindRolesQueryDto } from './dto/find-roles-query.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('roles.create')
  @Post()
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateRoleDto,
  ) {
    return this.rolesService.create(tenantId, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('roles.read')
  @Get()
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: FindRolesQueryDto,
  ) {
    return this.rolesService.findAll(tenantId, query);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('roles.read')
  @Get(':id')
  async findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.rolesService.findOne(tenantId, id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('roles.update')
  @Patch(':id')
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rolesService.update(tenantId, id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('roles.delete')
  @Delete(':id')
  async remove(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.rolesService.remove(tenantId, id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('roles.read')
  @Get(':id/permissions')
  async getPermissions(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.rolesService.getPermissions(tenantId, id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('roles.update')
  @Put(':id/permissions')
  async updatePermissions(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.rolesService.updatePermissions(tenantId, id, dto);
  }
}
