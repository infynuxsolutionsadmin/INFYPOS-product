import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { FindProductsQueryDto } from './dto/find-products-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, currentUserId: string, dto: CreateProductDto) {
    if (dto.sellingPrice < dto.costPrice) {
      throw new BadRequestException('Selling price cannot be less than cost price');
    }

    const skuExists = await this.prisma.product.findUnique({
      where: {
        tenantId_sku: {
          tenantId,
          sku: dto.sku,
        },
      },
    });

    if (skuExists) {
      throw new ConflictException('Product with this SKU already exists');
    }

    if (dto.barcode) {
      const barcodeExists = await this.prisma.product.findUnique({
        where: {
          tenantId_barcode: {
            tenantId,
            barcode: dto.barcode,
          },
        },
      });

      if (barcodeExists) {
        throw new ConflictException('Product with this barcode already exists');
      }
    }

    const resolvedVatRate = this.resolveVat(dto.vatBand, dto.vatRate);
    if (resolvedVatRate === undefined) {
      throw new BadRequestException('Either vatBand or vatRate is required');
    }

    const { vatBand, vatRate, ...dataToSave } = dto;

    return this.prisma.product.create({
      data: {
        tenantId,
        createdBy: currentUserId,
        ...dataToSave,
        vatRate: resolvedVatRate,
      },
      select: this.getSelectFields(),
    });
  }

  async findAll(tenantId: string, query: FindProductsQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      brand,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: any = { tenantId };

    if (status) {
      where.status = status;
    }
    if (category) {
      where.category = category;
    }
    if (brand) {
      where.brand = brand;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        select: this.getSelectFields(),
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
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
      select: this.getSelectFields(),
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(tenantId: string, id: string, currentUserId: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const costPrice = dto.costPrice !== undefined ? dto.costPrice : Number(product.costPrice);
    const sellingPrice = dto.sellingPrice !== undefined ? dto.sellingPrice : Number(product.sellingPrice);

    if (sellingPrice < costPrice) {
      throw new BadRequestException('Selling price cannot be less than cost price');
    }

    if (dto.sku && dto.sku !== product.sku) {
      const skuExists = await this.prisma.product.findUnique({
        where: {
          tenantId_sku: {
            tenantId,
            sku: dto.sku,
          },
        },
      });

      if (skuExists) {
        throw new ConflictException('Product with this SKU already exists');
      }
    }

    if (dto.barcode && dto.barcode !== product.barcode) {
      const barcodeExists = await this.prisma.product.findUnique({
        where: {
          tenantId_barcode: {
            tenantId,
            barcode: dto.barcode,
          },
        },
      });

      if (barcodeExists) {
        throw new ConflictException('Product with this barcode already exists');
      }
    }

    const resolvedVatRate = this.resolveVat(dto.vatBand, dto.vatRate);
    const { vatBand, vatRate, ...dataToUpdate } = dto;
    
    const updateData: any = {
      ...dataToUpdate,
      updatedBy: currentUserId,
    };
    
    if (resolvedVatRate !== undefined) {
      updateData.vatRate = resolvedVatRate;
    }

    await this.prisma.product.update({
      where: { id },
      data: updateData,
    });

    return this.findOne(tenantId, id);
  }

  async remove(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.prisma.product.update({
      where: { id },
      data: { status: ProductStatus.INACTIVE },
    });

    return this.findOne(tenantId, id);
  }

  private getSelectFields() {
    return {
      id: true,
      sku: true,
      barcode: true,
      name: true,
      description: true,
      category: true,
      brand: true,
      unit: true,
      costPrice: true,
      sellingPrice: true,
      vatRate: true,
      imageUrl: true,
      trackInventory: true,
      status: true,
      createdBy: true,
      updatedBy: true,
      createdAt: true,
      updatedAt: true,
    };
  }

  private resolveVat(vatBand?: string, vatRate?: number): number | undefined {
    if (vatBand !== undefined && vatRate !== undefined) {
      throw new BadRequestException('Provide either vatBand or vatRate, not both');
    }

    if (vatBand !== undefined) {
      switch (vatBand) {
        case 'STANDARD': return 20;
        case 'REDUCED': return 5;
        case 'ZERO': return 0;
        default: throw new BadRequestException('Invalid vatBand');
      }
    }

    if (vatRate !== undefined) {
      return vatRate;
    }

    return undefined;
  }
}
