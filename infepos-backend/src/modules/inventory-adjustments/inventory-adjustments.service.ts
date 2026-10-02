import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  AdjustmentStatus,
  MovementType,
  ReferenceType,
  StoreStatus,
  ProductStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateInventoryAdjustmentDto } from './dto/create-inventory-adjustment.dto';
import { FindInventoryAdjustmentsQueryDto } from './dto/find-inventory-adjustments-query.dto';
import { UpdateInventoryAdjustmentDto } from './dto/update-inventory-adjustment.dto';

@Injectable()
export class InventoryAdjustmentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateAdjustmentNumber(tenantId: string): Promise<string> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const count = await this.prisma.inventoryAdjustment.count({
      where: {
        tenantId,
        createdAt: { gte: startOfDay },
      },
    });

    const sequence = (count + 1).toString().padStart(6, '0');
    return `ADJ-${dateStr}-${sequence}`;
  }

  async create(tenantId: string, userId: string, dto: CreateInventoryAdjustmentDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Adjustment must contain at least one item');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Validate Store
      const store = await tx.store.findFirst({
        where: { id: dto.storeId, tenantId },
      });
      if (!store) throw new NotFoundException('Store not found');
      if (store.status !== StoreStatus.ACTIVE) throw new BadRequestException('Store is not active');

      // 2. Fetch Products & Inventories
      const productIds = dto.items.map((i) => i.productId);
      
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, tenantId },
      });
      if (products.length !== productIds.length) {
        throw new NotFoundException('One or more products not found');
      }

      const productMap = new Map(products.map((p) => [p.id, p]));

      const inventories = await tx.inventory.findMany({
        where: {
          tenantId,
          storeId: dto.storeId,
          productId: { in: productIds },
        },
      });
      const inventoryMap = new Map(inventories.map((inv) => [inv.productId, inv]));

      const adjustmentNumber = await this.generateAdjustmentNumber(tenantId);

      // Create Adjustment header
      const adjustment = await tx.inventoryAdjustment.create({
        data: {
          tenantId,
          storeId: store.id,
          adjustmentNumber,
          reason: dto.reason,
          status: AdjustmentStatus.COMPLETED, // Mark as processed right away
          notes: dto.notes,
          createdBy: userId,
        },
      });

      const adjustmentItemsData = [];
      const stockMovementsData = [];

      for (const itemDto of dto.items) {
        const product = productMap.get(itemDto.productId);
        if (product.status !== ProductStatus.ACTIVE) {
          throw new BadRequestException(`Product ${product.name} is not active`);
        }

        let inventory = inventoryMap.get(itemDto.productId);
        if (!inventory) {
          throw new BadRequestException(`Inventory record for product ${product.name} not found`);
        }
        
        // Some systems allow soft-deleted inventory to be adjusted if it was found, but usually must be active.
        // Assuming inventory is active if product is active.
        const quantityChange = new Prisma.Decimal(itemDto.quantityChange);
        if (quantityChange.isZero()) {
          throw new BadRequestException(`Quantity change for ${product.name} cannot be zero`);
        }

        const balanceBefore = inventory.quantityOnHand;
        const balanceAfter = balanceBefore.add(quantityChange);

        if (balanceAfter.isNegative()) {
          throw new ConflictException(`Insufficient stock for ${product.name}. Current stock: ${balanceBefore.toString()}`);
        }

        const unitCost = product.costPrice || new Prisma.Decimal(0);
        const totalValue = quantityChange.mul(unitCost); // Gain/Loss value

        adjustmentItemsData.push({
          adjustmentId: adjustment.id,
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantityChange,
          unitCost,
          totalValue,
        });

        stockMovementsData.push({
          tenantId,
          storeId: store.id,
          productId: product.id,
          inventoryId: inventory.id,
          referenceType: ReferenceType.ADJUSTMENT,
          referenceId: adjustment.id,
          movementType: MovementType.ADJUSTMENT,
          quantity: quantityChange,
          balanceBefore,
          balanceAfter,
          performedBy: userId,
          remarks: `Reason: ${dto.reason}`,
        });

        // Apply inventory update immediately
        await tx.inventory.update({
          where: { id: inventory.id },
          data: { quantityOnHand: balanceAfter },
        });
      }

      await tx.inventoryAdjustmentItem.createMany({
        data: adjustmentItemsData,
      });

      await tx.stockMovement.createMany({
        data: stockMovementsData,
      });

      return await tx.inventoryAdjustment.findUnique({
        where: { id: adjustment.id },
        include: { items: true },
      });
    });
  }

  async findAll(tenantId: string, query: FindInventoryAdjustmentsQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      storeId,
      reason,
      status,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: any = { tenantId };

    if (storeId) where.storeId = storeId;
    if (reason) where.reason = reason;
    if (status) where.status = status;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { adjustmentNumber: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        {
          items: {
            some: {
              OR: [
                { productName: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.inventoryAdjustment.count({ where }),
      this.prisma.inventoryAdjustment.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: {
          store: { select: { name: true, code: true } },
          createdByUser: { select: { firstName: true, lastName: true } },
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
    const adjustment = await this.prisma.inventoryAdjustment.findFirst({
      where: { id, tenantId },
      include: {
        items: true,
        store: true,
        createdByUser: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    if (!adjustment) {
      throw new NotFoundException('Inventory adjustment not found');
    }

    return adjustment;
  }

  async update(tenantId: string, id: string, dto: UpdateInventoryAdjustmentDto) {
    const adjustment = await this.prisma.inventoryAdjustment.findFirst({
      where: { id, tenantId },
    });

    if (!adjustment) {
      throw new NotFoundException('Inventory adjustment not found');
    }

    if (adjustment.status === AdjustmentStatus.COMPLETED) {
      throw new ConflictException('Cannot edit a completed adjustment');
    }
    
    if (adjustment.status === AdjustmentStatus.CANCELLED) {
      throw new ConflictException('Cannot edit a cancelled adjustment');
    }

    // In a full ERP, updating a DRAFT adjustment allows modifying items before committing.
    // Since our create instantly marks as COMPLETED per workflow instructions,
    // this endpoint mostly serves future features (e.g., if we allow DRAFT creations).

    return this.prisma.inventoryAdjustment.update({
      where: { id },
      data: {
        reason: dto.reason,
        notes: dto.notes,
        status: dto.status,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const adjustment = await this.prisma.inventoryAdjustment.findFirst({
      where: { id, tenantId },
    });

    if (!adjustment) {
      throw new NotFoundException('Inventory adjustment not found');
    }

    if (adjustment.status === AdjustmentStatus.COMPLETED) {
      throw new ConflictException('Cannot cancel a completed adjustment');
    }

    if (adjustment.status === AdjustmentStatus.CANCELLED) {
      return adjustment; // Already cancelled
    }

    return this.prisma.inventoryAdjustment.update({
      where: { id },
      data: { status: AdjustmentStatus.CANCELLED },
    });
  }
}
