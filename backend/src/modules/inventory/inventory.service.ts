import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InventoryStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { FindInventoryQueryDto } from './dto/find-inventory-query.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateInventoryDto) {
    if (dto.maximumStock < dto.minimumStock) {
      throw new BadRequestException('Maximum stock cannot be less than minimum stock');
    }
    if (dto.reorderLevel > dto.maximumStock) {
      throw new BadRequestException('Reorder level cannot exceed maximum stock');
    }

    const store = await this.prisma.store.findFirst({
      where: { id: dto.storeId, tenantId },
    });
    if (!store) {
      throw new NotFoundException('Store not found or does not belong to tenant');
    }

    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId },
    });
    if (!product) {
      throw new NotFoundException('Product not found or does not belong to tenant');
    }

    const exists = await this.prisma.inventory.findUnique({
      where: {
        storeId_productId: {
          storeId: dto.storeId,
          productId: dto.productId,
        },
      },
    });

    if (exists) {
      if (exists.status === InventoryStatus.ACTIVE) {
        throw new ConflictException('Inventory record already exists for this product in this store');
      }

      // Reactivate
      const reactivated = await this.prisma.inventory.update({
        where: { id: exists.id },
        data: {
          quantityOnHand: dto.quantityOnHand,
          minimumStock: dto.minimumStock,
          maximumStock: dto.maximumStock,
          reorderLevel: dto.reorderLevel,
          reservedQuantity: 0,
          status: InventoryStatus.ACTIVE,
        },
      });

      return this.findOne(tenantId, reactivated.id);
    }

    const created = await this.prisma.inventory.create({
      data: {
        tenantId,
        storeId: dto.storeId,
        productId: dto.productId,
        quantityOnHand: dto.quantityOnHand,
        minimumStock: dto.minimumStock,
        maximumStock: dto.maximumStock,
        reorderLevel: dto.reorderLevel,
      },
    });

    return this.findOne(tenantId, created.id);
  }

  async findAll(tenantId: string, query: FindInventoryQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      storeId,
      productId,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: any = { tenantId };

    if (status) {
      where.status = status;
    }
    if (storeId) {
      where.storeId = storeId;
    }
    if (productId) {
      where.productId = productId;
    }

    if (search) {
      where.OR = [
        { product: { name: { contains: search, mode: 'insensitive' } } },
        { product: { sku: { contains: search, mode: 'insensitive' } } },
        { product: { barcode: { contains: search, mode: 'insensitive' } } },
        { store: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.inventory.count({ where }),
      this.prisma.inventory.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: this.getIncludeFields(),
      }),
    ]);

    const pages = Math.ceil(total / limit);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    };
  }

  async findOne(tenantId: string, id: string) {
    const inventory = await this.prisma.inventory.findFirst({
      where: { id, tenantId },
      include: this.getIncludeFields(),
    });

    if (!inventory) {
      throw new NotFoundException('Inventory record not found');
    }

    return inventory;
  }

  async update(tenantId: string, id: string, dto: UpdateInventoryDto) {
    const inventory = await this.prisma.inventory.findFirst({
      where: { id, tenantId },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory record not found');
    }

    const minStock = dto.minimumStock !== undefined ? dto.minimumStock : Number(inventory.minimumStock);
    const maxStock = dto.maximumStock !== undefined ? dto.maximumStock : Number(inventory.maximumStock);
    const reorder = dto.reorderLevel !== undefined ? dto.reorderLevel : Number(inventory.reorderLevel);

    if (maxStock < minStock) {
      throw new BadRequestException('Maximum stock cannot be less than minimum stock');
    }
    if (reorder > maxStock) {
      throw new BadRequestException('Reorder level cannot exceed maximum stock');
    }

    await this.prisma.inventory.update({
      where: { id },
      data: {
        quantityOnHand: dto.quantityOnHand,
        reservedQuantity: dto.reservedQuantity,
        minimumStock: dto.minimumStock,
        maximumStock: dto.maximumStock,
        reorderLevel: dto.reorderLevel,
        status: dto.status,
      },
    });

    return this.findOne(tenantId, id);
  }

  async remove(tenantId: string, id: string) {
    const inventory = await this.prisma.inventory.findFirst({
      where: { id, tenantId },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory record not found');
    }

    await this.prisma.inventory.update({
      where: { id },
      data: { status: InventoryStatus.INACTIVE },
    });

    return this.findOne(tenantId, id);
  }

  private getIncludeFields() {
    return {
      store: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
          unit: true,
        },
      },
    };
  }
}
