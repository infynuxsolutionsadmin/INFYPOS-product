import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PurchaseStatus, StoreStatus, SupplierStatus, ProductStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { FindPurchasesQueryDto } from './dto/find-purchases-query.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  private async generatePurchaseNumber(tenantId: string): Promise<string> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    
    // Count today's purchases for this tenant
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const count = await this.prisma.purchase.count({
      where: {
        tenantId,
        createdAt: {
          gte: startOfDay,
        },
      },
    });

    const sequence = (count + 1).toString().padStart(6, '0');
    return `PO-${dateStr}-${sequence}`;
  }

  async create(tenantId: string, userId: string, dto: CreatePurchaseDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Purchase must contain at least one item');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Validate Store
      const store = await tx.store.findFirst({
        where: { id: dto.storeId, tenantId },
      });
      if (!store) throw new NotFoundException('Store not found');
      if (store.status !== StoreStatus.ACTIVE) throw new BadRequestException('Store is not active');

      // 2. Validate Supplier
      const supplier = await tx.supplier.findFirst({
        where: { id: dto.supplierId, tenantId },
      });
      if (!supplier) throw new NotFoundException('Supplier not found');
      if (supplier.status !== SupplierStatus.ACTIVE) throw new BadRequestException('Supplier is not active');

      // 3. Process Items & Calculate Totals
      const productIds = dto.items.map((item) => item.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, tenantId },
      });

      if (products.length !== productIds.length) {
        throw new NotFoundException('One or more products not found');
      }

      const productMap = new Map(products.map((p) => [p.id, p]));

      let subtotal = new Prisma.Decimal(0);
      let taxAmount = new Prisma.Decimal(0);
      const purchaseItemsData = [];

      for (const itemDto of dto.items) {
        const product = productMap.get(itemDto.productId);
        if (product.status !== ProductStatus.ACTIVE) {
          throw new BadRequestException(`Product ${product.name} is not active`);
        }

        const quantity = new Prisma.Decimal(itemDto.orderedQuantity);
        const unitCost = new Prisma.Decimal(itemDto.unitCost);
        const taxRate = itemDto.taxRate !== undefined ? new Prisma.Decimal(itemDto.taxRate) : product.vatRate;

        // Line Total = (Qty * Cost)
        const lineSubtotal = quantity.mul(unitCost);
        
        // Tax = Line Total * (Tax Rate / 100)
        const lineTax = lineSubtotal.mul(taxRate).div(100);
        
        // Line Total + Tax
        const lineTotal = lineSubtotal.add(lineTax);

        subtotal = subtotal.add(lineSubtotal);
        taxAmount = taxAmount.add(lineTax);

        purchaseItemsData.push({
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          unit: product.unit,
          orderedQuantity: quantity,
          receivedQuantity: 0,
          unitCost: unitCost,
          vatRate: taxRate,
          lineTotal: lineTotal,
        });
      }

      const discount = new Prisma.Decimal(dto.discountAmount || 0);
      const grandTotal = subtotal.add(taxAmount).sub(discount);

      if (grandTotal.isNegative()) {
        throw new BadRequestException('Grand total cannot be negative');
      }

      const purchaseNumber = await this.generatePurchaseNumber(tenantId);

      const purchase = await tx.purchase.create({
        data: {
          tenantId,
          storeId: store.id,
          supplierId: supplier.id,
          supplierName: supplier.name,
          supplierCode: supplier.supplierCode,
          userId,
          purchaseNumber,
          currency: store.currency || 'USD',
          orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
          expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
          subtotal,
          taxAmount,
          discountAmount: discount,
          grandTotal,
          status: PurchaseStatus.DRAFT,
          notes: dto.notes,
          items: {
            create: purchaseItemsData,
          },
        },
        include: {
          items: true,
        },
      });

      return purchase;
    });
  }

  async findAll(tenantId: string, query: FindPurchasesQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      storeId,
      supplierId,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: any = { tenantId };

    if (storeId) where.storeId = storeId;
    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { purchaseNumber: { contains: search, mode: 'insensitive' } },
        { supplierName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.purchase.count({ where }),
      this.prisma.purchase.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: {
          supplier: {
            select: { name: true, supplierCode: true },
          },
          store: {
            select: { name: true, code: true },
          },
        },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(tenantId: string, id: string) {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id, tenantId },
      include: {
        items: true,
        supplier: true,
        store: true,
      },
    });

    if (!purchase) {
      throw new NotFoundException('Purchase not found');
    }

    return purchase;
  }

  async update(tenantId: string, id: string, dto: UpdatePurchaseDto) {
    // Basic status transition or fields update for drafts
    const purchase = await this.prisma.purchase.findFirst({
      where: { id, tenantId },
    });

    if (!purchase) {
      throw new NotFoundException('Purchase not found');
    }

    if (purchase.status !== PurchaseStatus.DRAFT && dto.status !== PurchaseStatus.CANCELLED) {
      // In a full ERP, we'd allow specific transitions (e.g. DRAFT -> APPROVED).
      // If we are modifying fields (like notes) on a non-draft, we'd restrict it.
      // For now, allow status changes, but if it's items modification, that should only be in DRAFT.
    }

    return this.prisma.purchase.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes,
        orderDate: dto.orderDate ? new Date(dto.orderDate) : undefined,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id, tenantId },
    });

    if (!purchase) {
      throw new NotFoundException('Purchase not found');
    }

    if (purchase.status !== PurchaseStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT purchases can be cancelled via delete endpoint');
    }

    return this.prisma.purchase.update({
      where: { id },
      data: { status: PurchaseStatus.CANCELLED },
    });
  }
}
