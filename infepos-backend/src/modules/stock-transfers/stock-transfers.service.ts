import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  TransferStatus,
  MovementType,
  ReferenceType,
  StoreStatus,
  ProductStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateStockTransferDto } from './dto/create-stock-transfer.dto';
import { FindStockTransfersQueryDto } from './dto/find-stock-transfers-query.dto';
import { UpdateStockTransferDto, ReceiveStockTransferDto } from './dto/update-stock-transfer.dto';

@Injectable()
export class StockTransfersService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateTransferNumber(tenantId: string): Promise<string> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const count = await this.prisma.stockTransfer.count({
      where: {
        tenantId,
        createdAt: { gte: startOfDay },
      },
    });

    const sequence = (count + 1).toString().padStart(6, '0');
    return `TRF-${dateStr}-${sequence}`;
  }

  async create(tenantId: string, userId: string, dto: CreateStockTransferDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Transfer must contain at least one item');
    }

    if (dto.sourceStoreId === dto.destinationStoreId) {
      throw new BadRequestException('Source and destination store cannot be the same');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Validate Stores
      const sourceStore = await tx.store.findFirst({
        where: { id: dto.sourceStoreId, tenantId },
      });
      if (!sourceStore || sourceStore.status !== StoreStatus.ACTIVE) {
        throw new BadRequestException('Source store is invalid or not active');
      }

      const destinationStore = await tx.store.findFirst({
        where: { id: dto.destinationStoreId, tenantId },
      });
      if (!destinationStore || destinationStore.status !== StoreStatus.ACTIVE) {
        throw new BadRequestException('Destination store is invalid or not active');
      }

      // 2. Fetch Products
      const productIds = dto.items.map((i) => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, tenantId },
      });
      if (products.length !== productIds.length) {
        throw new NotFoundException('One or more products not found');
      }

      const productMap = new Map(products.map((p) => [p.id, p]));
      const transferNumber = await this.generateTransferNumber(tenantId);
      const transferItemsData = [];

      for (const itemDto of dto.items) {
        const product = productMap.get(itemDto.productId);
        if (product.status !== ProductStatus.ACTIVE) {
          throw new BadRequestException(`Product ${product.name} is not active`);
        }

        const quantity = new Prisma.Decimal(itemDto.quantity);
        if (quantity.lte(0)) {
          throw new BadRequestException(`Quantity for ${product.name} must be positive`);
        }

        const unitCost = product.costPrice || new Prisma.Decimal(0);
        const totalValue = quantity.mul(unitCost);

        transferItemsData.push({
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          barcode: product.barcode,
          unit: product.unit,
          quantity,
          unitCost,
          totalValue,
        });
      }

      const transfer = await tx.stockTransfer.create({
        data: {
          tenantId,
          transferNumber,
          transferType: dto.transferType,
          sourceStoreId: sourceStore.id,
          destinationStoreId: destinationStore.id,
          status: TransferStatus.DRAFT,
          notes: dto.notes,
          carrier: dto.carrier,
          vehicleNumber: dto.vehicleNumber,
          trackingNumber: dto.trackingNumber,
          createdBy: userId,
          items: {
            create: transferItemsData,
          },
        },
        include: { items: true },
      });

      return transfer;
    });
  }

  async ship(tenantId: string, userId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findFirst({
        where: { id, tenantId },
        include: { items: true },
      });

      if (!transfer) throw new NotFoundException('Stock transfer not found');

      if (transfer.status === TransferStatus.SHIPPED) {
        throw new ConflictException('Transfer already shipped');
      }
      if (transfer.status !== TransferStatus.DRAFT) {
        throw new BadRequestException(`Cannot ship transfer in ${transfer.status} status`);
      }

      // Check available stock and deduct
      const stockMovementsData = [];

      for (const item of transfer.items) {
        const inventory = await tx.inventory.findFirst({
          where: { tenantId, storeId: transfer.sourceStoreId, productId: item.productId },
        });

        if (!inventory) {
          throw new BadRequestException(`Inventory record not found for product ${item.productName} in source store`);
        }

        const availableStock = inventory.quantityOnHand.sub(inventory.reservedQuantity);

        if (item.quantity.gt(availableStock)) {
          throw new ConflictException(`Insufficient available stock for ${item.productName}. Available: ${availableStock.toString()}`);
        }

        const balanceBefore = inventory.quantityOnHand;
        const balanceAfter = balanceBefore.sub(item.quantity);

        await tx.inventory.update({
          where: { id: inventory.id },
          data: { quantityOnHand: balanceAfter },
        });

        stockMovementsData.push({
          tenantId,
          storeId: transfer.sourceStoreId,
          productId: item.productId,
          inventoryId: inventory.id,
          referenceType: ReferenceType.TRANSFER,
          referenceId: transfer.id,
          movementType: MovementType.TRANSFER_OUT,
          quantity: item.quantity.mul(-1), // negative for deduction
          balanceBefore,
          balanceAfter,
          performedBy: userId,
          remarks: `Transfer OUT to store ${transfer.destinationStoreId}`,
        });
      }

      await tx.stockMovement.createMany({ data: stockMovementsData });

      return tx.stockTransfer.update({
        where: { id },
        data: {
          status: TransferStatus.SHIPPED,
          shippedBy: userId,
          shippedAt: new Date(),
        },
        include: { items: true },
      });
    });
  }

  async receive(tenantId: string, userId: string, id: string, dto: ReceiveStockTransferDto) {
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findFirst({
        where: { id, tenantId },
        include: { items: true },
      });

      if (!transfer) throw new NotFoundException('Stock transfer not found');

      if (transfer.status === TransferStatus.RECEIVED) {
        throw new ConflictException('Transfer already received');
      }
      if (transfer.status !== TransferStatus.SHIPPED) {
        throw new BadRequestException(`Cannot receive transfer in ${transfer.status} status. Must be SHIPPED.`);
      }

      const destinationStore = await tx.store.findFirst({
        where: { id: transfer.destinationStoreId, tenantId },
      });
      
      if (!destinationStore || destinationStore.status !== StoreStatus.ACTIVE) {
        throw new BadRequestException('Destination store is invalid or not active');
      }

      const stockMovementsData = [];

      for (const item of transfer.items) {
        let inventory = await tx.inventory.findFirst({
          where: { tenantId, storeId: transfer.destinationStoreId, productId: item.productId },
        });

        if (!inventory) {
          inventory = await tx.inventory.create({
            data: {
              tenantId,
              storeId: transfer.destinationStoreId,
              productId: item.productId,
              quantityOnHand: new Prisma.Decimal(0),
              minimumStock: new Prisma.Decimal(0),
              maximumStock: new Prisma.Decimal(0),
              reorderLevel: new Prisma.Decimal(0),
            },
          });
        }

        const balanceBefore = inventory.quantityOnHand;
        const balanceAfter = balanceBefore.add(item.quantity);

        await tx.inventory.update({
          where: { id: inventory.id },
          data: { quantityOnHand: balanceAfter },
        });

        stockMovementsData.push({
          tenantId,
          storeId: transfer.destinationStoreId,
          productId: item.productId,
          inventoryId: inventory.id,
          referenceType: ReferenceType.TRANSFER,
          referenceId: transfer.id,
          movementType: MovementType.TRANSFER_IN,
          quantity: item.quantity,
          balanceBefore,
          balanceAfter,
          performedBy: userId,
          remarks: `Transfer IN from store ${transfer.sourceStoreId}`,
        });
      }

      await tx.stockMovement.createMany({ data: stockMovementsData });

      return tx.stockTransfer.update({
        where: { id },
        data: {
          status: TransferStatus.RECEIVED,
          receivedBy: userId,
          receivedAt: new Date(),
          receivedNotes: dto.receivedNotes,
        },
        include: { items: true },
      });
    });
  }

  async findAll(tenantId: string, query: FindStockTransfersQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      sourceStoreId,
      destinationStoreId,
      status,
      date,
      createdBy,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: any = { tenantId };

    if (sourceStoreId) where.sourceStoreId = sourceStoreId;
    if (destinationStoreId) where.destinationStoreId = destinationStoreId;
    if (status) where.status = status;
    if (createdBy) where.createdBy = createdBy;

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      where.createdAt = { gte: startDate, lte: endDate };
    }

    if (search) {
      where.OR = [
        { transferNumber: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { trackingNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.stockTransfer.count({ where }),
      this.prisma.stockTransfer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          sourceStore: { select: { name: true, code: true } },
          destinationStore: { select: { name: true, code: true } },
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
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: { id, tenantId },
      include: {
        items: true,
        sourceStore: true,
        destinationStore: true,
        createdByUser: { select: { firstName: true, lastName: true, email: true } },
        shippedByUser: { select: { firstName: true, lastName: true, email: true } },
        receivedByUser: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    if (!transfer) {
      throw new NotFoundException('Stock transfer not found');
    }

    return transfer;
  }

  async update(tenantId: string, id: string, dto: UpdateStockTransferDto) {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: { id, tenantId },
    });

    if (!transfer) throw new NotFoundException('Stock transfer not found');

    if (transfer.status !== TransferStatus.DRAFT) {
      throw new ConflictException('Only draft transfers can be updated');
    }

    return this.prisma.stockTransfer.update({
      where: { id },
      data: {
        notes: dto.notes,
        carrier: dto.carrier,
        vehicleNumber: dto.vehicleNumber,
        trackingNumber: dto.trackingNumber,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: { id, tenantId },
    });

    if (!transfer) throw new NotFoundException('Stock transfer not found');

    if (transfer.status !== TransferStatus.DRAFT) {
      throw new ConflictException('Only draft transfers can be cancelled');
    }

    return this.prisma.stockTransfer.update({
      where: { id },
      data: { status: TransferStatus.CANCELLED },
    });
  }
}
