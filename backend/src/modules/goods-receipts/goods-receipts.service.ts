import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  GoodsReceiptStatus,
  MovementType,
  ReferenceType,
  PurchaseStatus,
  ProductStatus,
  StoreStatus,
  SupplierStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';
import { FindGoodsReceiptsQueryDto } from './dto/find-goods-receipts-query.dto';

@Injectable()
export class GoodsReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateReceiptNumber(tenantId: string): Promise<string> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const count = await this.prisma.goodsReceipt.count({
      where: {
        tenantId,
        createdAt: { gte: startOfDay },
      },
    });

    const sequence = (count + 1).toString().padStart(6, '0');
    return `GRN-${dateStr}-${sequence}`;
  }

  async create(tenantId: string, userId: string, dto: CreateGoodsReceiptDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Goods receipt must contain at least one item');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch Purchase Order and its items
      const purchase = await tx.purchase.findFirst({
        where: { id: dto.purchaseId, tenantId },
        include: { items: true, store: true, supplier: true },
      });

      if (!purchase) throw new NotFoundException('Purchase order not found');

      // Reject if cancelled or draft
      if (
        purchase.status === PurchaseStatus.CANCELLED ||
        purchase.status === PurchaseStatus.DRAFT ||
        purchase.status === PurchaseStatus.APPROVED
      ) {
        throw new BadRequestException(`Cannot receive goods for purchase in ${purchase.status} status`);
      }

      if (purchase.status === PurchaseStatus.RECEIVED) {
        throw new BadRequestException('Purchase order is already fully received');
      }

      // Check Store & Supplier active status
      if (purchase.store.status !== StoreStatus.ACTIVE) {
        throw new BadRequestException('Target store is not active');
      }
      if (purchase.supplier.status !== SupplierStatus.ACTIVE) {
        throw new BadRequestException('Supplier is not active');
      }

      const receiptNumber = await this.generateReceiptNumber(tenantId);
      const purchaseItemsMap = new Map(purchase.items.map((i) => [i.id, i]));
      const productIds = purchase.items.map((i) => i.productId);

      // Verify Products are Active
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, tenantId },
      });
      const productMap = new Map(products.map((p) => [p.id, p]));

      // Verify Inventories exist or create them (wait, standard logic usually finds or creates inventory, or we assume they exist. Let's find/create)
      let inventories = await tx.inventory.findMany({
        where: {
          tenantId,
          storeId: purchase.storeId,
          productId: { in: productIds },
        },
      });
      const inventoryMap = new Map(inventories.map((inv) => [inv.productId, inv]));

      const receiptItemsData = [];
      const stockMovementsData = [];

      for (const itemDto of dto.items) {
        const pItem = purchaseItemsMap.get(itemDto.purchaseItemId);
        if (!pItem) {
          throw new NotFoundException(`Purchase item ${itemDto.purchaseItemId} not found on this PO`);
        }

        const product = productMap.get(pItem.productId);
        if (!product || product.status !== ProductStatus.ACTIVE) {
          throw new BadRequestException(`Product ${pItem.productName} is not active`);
        }

        const receivedQuantity = new Prisma.Decimal(itemDto.receivedQuantity);
        if (receivedQuantity.lte(0)) {
          throw new BadRequestException(`Received quantity must be positive for ${pItem.productName}`);
        }

        const ordered = pItem.orderedQuantity;
        const alreadyReceived = pItem.receivedQuantity;
        const remaining = ordered.sub(alreadyReceived);

        if (receivedQuantity.gt(remaining)) {
          throw new ConflictException(`Cannot receive more than ordered for ${pItem.productName}. Remaining: ${remaining.toString()}`);
        }

        const newReceivedTotal = alreadyReceived.add(receivedQuantity);

        // Calculate receipt line totals based on PO cost
        const lineSubtotal = receivedQuantity.mul(pItem.unitCost);
        const lineTax = lineSubtotal.mul(pItem.vatRate).div(100);
        const lineTotal = lineSubtotal.add(lineTax);

        receiptItemsData.push({
          purchaseItemId: pItem.id,
          productId: pItem.productId,
          productName: pItem.productName,
          sku: pItem.sku,
          receivedQuantity,
          unitCost: pItem.unitCost,
          vatRate: pItem.vatRate,
          lineTotal,
        });

        // 1. Update PurchaseItem
        await tx.purchaseItem.update({
          where: { id: pItem.id },
          data: { receivedQuantity: newReceivedTotal },
        });

        // 2. Update Inventory
        let inventory = inventoryMap.get(pItem.productId);
        if (!inventory) {
          inventory = await tx.inventory.create({
            data: {
              tenantId,
              storeId: purchase.storeId,
              productId: pItem.productId,
              quantityOnHand: new Prisma.Decimal(0),
              minimumStock: new Prisma.Decimal(0),
              maximumStock: new Prisma.Decimal(0),
              reorderLevel: new Prisma.Decimal(0),
            },
          });
          inventoryMap.set(pItem.productId, inventory);
        }

        const balanceBefore = inventory.quantityOnHand;
        const balanceAfter = balanceBefore.add(receivedQuantity);

        await tx.inventory.update({
          where: { id: inventory.id },
          data: { quantityOnHand: balanceAfter },
        });

        // 3. Prepare Stock Movement
        stockMovementsData.push({
          tenantId,
          storeId: purchase.storeId,
          productId: pItem.productId,
          inventoryId: inventory.id,
          referenceType: ReferenceType.PURCHASE,
          referenceId: purchase.id, // Using purchaseId as reference, or receiptId later. Let's use receiptNumber after receipt is created. We will do this below.
          movementType: MovementType.PURCHASE_RECEIPT,
          quantity: receivedQuantity,
          balanceBefore,
          balanceAfter,
          performedBy: userId,
          remarks: `Received against PO ${purchase.purchaseNumber}`,
        });
      }

      // Create GoodsReceipt
      const goodsReceipt = await tx.goodsReceipt.create({
        data: {
          tenantId,
          purchaseId: purchase.id,
          storeId: purchase.storeId,
          receivedBy: userId,
          receiptNumber,
          notes: dto.notes,
          status: GoodsReceiptStatus.COMPLETED,
          items: {
            create: receiptItemsData,
          },
        },
        include: { items: true },
      });

      // Inject GRN reference into stock movements and create them
      for (const sm of stockMovementsData) {
        sm.referenceId = goodsReceipt.id; // Correct reference is the GRN
      }
      
      await tx.stockMovement.createMany({
        data: stockMovementsData,
      });

      // Update Purchase Status
      // We must check if ALL items on the PO are now fully received.
      const updatedPurchaseItems = await tx.purchaseItem.findMany({
        where: { purchaseId: purchase.id },
      });

      const allReceived = updatedPurchaseItems.every((item) => item.receivedQuantity.gte(item.orderedQuantity));
      
      await tx.purchase.update({
        where: { id: purchase.id },
        data: {
          status: allReceived ? PurchaseStatus.RECEIVED : PurchaseStatus.PARTIALLY_RECEIVED,
        },
      });

      return goodsReceipt;
    });
  }

  async findAll(tenantId: string, query: FindGoodsReceiptsQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      storeId,
      purchaseId,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: any = { tenantId };

    if (storeId) where.storeId = storeId;
    if (purchaseId) where.purchaseId = purchaseId;
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { receiptNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.goodsReceipt.count({ where }),
      this.prisma.goodsReceipt.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: {
          store: { select: { name: true, code: true } },
          purchase: { select: { purchaseNumber: true } },
          receivedByUser: { select: { firstName: true, lastName: true } },
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
    const receipt = await this.prisma.goodsReceipt.findFirst({
      where: { id, tenantId },
      include: {
        items: true,
        store: true,
        purchase: true,
        receivedByUser: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    if (!receipt) {
      throw new NotFoundException('Goods receipt not found');
    }

    return receipt;
  }
}
