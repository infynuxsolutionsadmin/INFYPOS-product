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
import { CreateProductDto } from './dto/create-product.dto';
import { FindProductsQueryDto } from './dto/find-products-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Permissions('products.create')
  @Post()
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') currentUserId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(tenantId, currentUserId, dto);
  }

  @Permissions('products.read')
  @Get()
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: FindProductsQueryDto,
  ) {
    return this.productsService.findAll(tenantId, query);
  }

  @Permissions('products.read')
  @Get(':id')
  async findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productsService.findOne(tenantId, id);
  }

  @Permissions('products.update')
  @Patch(':id')
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') currentUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(tenantId, id, currentUserId, dto);
  }

  @Permissions('products.delete')
  @Delete(':id')
  async remove(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productsService.remove(tenantId, id);
  }
}
