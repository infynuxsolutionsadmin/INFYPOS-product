import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReturnStatus, MovementType, ReferenceType, ReturnType, InventoryStatus, SaleStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateSaleReturnDto } from './dto/create-sale-return.dto';
import { FindSaleReturnsQueryDto } from './dto/find-sale-returns-query.dto';

@Injectable()
export class SalesReturnsService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateReturnNumber(tenantId: string): Promise<string> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const count = await this.prisma.saleReturn.count({
      where: {
        tenantId,
        createdAt: { gte: startOfDay },
      },
    });

    const sequence = (count + 1).toString().padStart(6, '0');
    return `RET-${dateStr}-${sequence}`;
  }

  async create(tenantId: string, userId: string, dto: CreateSaleReturnDto, isSync: boolean = false) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Return must contain at least one item');
    }

    // 0. Validate Shift
    if (!dto.shiftId) {
      throw new BadRequestException('An active shift is required to create a return.');
    }
    const shift = await this.prisma.shift.findUnique({
      where: { id: dto.shiftId },
    });
    if (!shift) {
      throw new NotFoundException('Shift not found.');
    }
    if (shift.tenantId !== tenantId) {
      throw new BadRequestException('Shift does not belong to the current tenant.');
    }
    if (!isSync && shift.status !== 'OPEN') {
      throw new BadRequestException('Shift is no longer active.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Validate Original Sale
      const sale = await tx.sale.findFirst({
        where: { id: dto.originalSaleId, tenantId },
        include: { items: true },
      });

      if (!sale) {
        throw new NotFoundException('Original sale not found');
      }
      if (sale.status !== SaleStatus.COMPLETED) {
        throw new BadRequestException('Can only return completed sales');
      }

      const saleItemMap = new Map(sale.items.map(item => [item.id, item]));
      
      let subtotal = new Prisma.Decimal(0);
      let taxAmount = new Prisma.Decimal(0);
      let returnType: ReturnType = ReturnType.PARTIAL_RETURN;

      const returnItemsData = [];
      const stockMovementsData = [];

      for (const reqItem of dto.items) {
        const saleItem = saleItemMap.get(reqItem.saleItemId);
        if (!saleItem) {
          throw new BadRequestException(`Item ${reqItem.saleItemId} does not belong to the original sale`);
        }

        const requestQty = new Prisma.Decimal(reqItem.quantity);
        const maxReturnable = saleItem.quantity.sub(saleItem.returnedQuantity);

        if (requestQty.gt(maxReturnable)) {
          throw new ConflictException(`Cannot return ${requestQty.toString()} of ${saleItem.productName}. Maximum returnable is ${maxReturnable.toString()}`);
        }

        // Snapshot calculations based on original item
        const lineTotal = saleItem.unitPrice.mul(requestQty);
        const lineTax = lineTotal.mul(saleItem.vatRate.div(100));

        subtotal = subtotal.add(lineTotal);
        taxAmount = taxAmount.add(lineTax);

        returnItemsData.push({
          saleItemId: saleItem.id,
          productId: saleItem.productId,
          productName: saleItem.productName,
          sku: saleItem.sku,
          barcode: saleItem.barcode,
          quantity: requestQty,
          unitPrice: saleItem.unitPrice,
          vatRate: saleItem.vatRate,
          lineTotal,
          reason: reqItem.reason,
        });

        // Fetch product to see if it tracks inventory
        const product = await tx.product.findFirst({
          where: { id: saleItem.productId, tenantId }
        });

        // Even if product is inactive/deleted now, we still process the financial return.
        // But we only restore inventory if product still exists and tracks inventory.
        if (product && product.trackInventory) {
          let inventory = await tx.inventory.findUnique({
            where: {
              storeId_productId: {
                storeId: sale.storeId,
                productId: product.id,
              },
            },
          });

          // Create inventory if it doesn't exist anymore
          if (!inventory) {
            inventory = await tx.inventory.create({
              data: {
                tenantId,
                storeId: sale.storeId,
                productId: product.id,
                quantityOnHand: new Prisma.Decimal(0),
                minimumStock: new Prisma.Decimal(0),
                maximumStock: new Prisma.Decimal(0),
                reorderLevel: new Prisma.Decimal(0),
                status: InventoryStatus.ACTIVE,
              }
            });
          }

          const balanceBefore = inventory.quantityOnHand;
          const balanceAfter = balanceBefore.add(requestQty);

          await tx.inventory.update({
            where: { id: inventory.id },
            data: { quantityOnHand: balanceAfter }
          });

          stockMovementsData.push({
            tenantId,
            storeId: sale.storeId,
            productId: product.id,
            inventoryId: inventory.id,
            referenceType: ReferenceType.RETURN,
            movementType: MovementType.SALE_RETURN,
            quantity: requestQty,
            balanceBefore,
            balanceAfter,
            performedBy: userId,
            remarks: `Sale Return against ${sale.saleNumber}`
          });
        }

        // Update returned quantity on original sale item
        await tx.saleItem.update({
          where: { id: saleItem.id },
          data: { returnedQuantity: saleItem.returnedQuantity.add(requestQty) }
        });
      }

      // Check if this makes it a FULL return
      let allFullyReturned = true;
      for (const item of sale.items) {
        const matchingRequest = dto.items.find(r => r.saleItemId === item.id);
        const reqQty = matchingRequest ? new Prisma.Decimal(matchingRequest.quantity) : new Prisma.Decimal(0);
        const finalReturned = item.returnedQuantity.add(reqQty);
        
        if (finalReturned.lt(item.quantity)) {
          allFullyReturned = false;
        }
      }

      if (allFullyReturned) {
        returnType = ReturnType.FULL_RETURN;
      }

      // Calculate refund total (proportionate discount could be applied, but keeping simple: Subtotal + Tax)
      // If we wanted to apportion the invoice discount, we could calculate (subtotal / sale.subtotal) * sale.discountAmount
      let apportionedDiscount = new Prisma.Decimal(0);
      if (sale.discountAmount.gt(0) && sale.subtotal.gt(0)) {
        apportionedDiscount = sale.discountAmount.mul(subtotal.div(sale.subtotal));
      }

      const refundTotal = subtotal.add(taxAmount).sub(apportionedDiscount);
      const returnNumber = await this.generateReturnNumber(tenantId);

      const saleReturn = await tx.saleReturn.create({
        data: {
          tenantId,
          storeId: sale.storeId,
          userId,
          customerId: sale.customerId,
          originalSaleId: sale.id,
          returnNumber,
          returnType,
          subtotal,
          taxAmount,
          refundTotal,
          refundMethod: dto.refundMethod || sale.paymentMethod,
          status: ReturnStatus.COMPLETED,
          notes: dto.notes,
          shiftId: dto.shiftId,
          items: {
            create: returnItemsData,
          },
        },
        include: { items: true },
      });

      // Insert stock movements
      if (stockMovementsData.length > 0) {
        // Need to add referenceId manually since we just generated saleReturn.id
        for (const sm of stockMovementsData) {
          sm.referenceId = saleReturn.id;
        }
        await tx.stockMovement.createMany({ data: stockMovementsData });
      }

      return saleReturn;
    });
  }

  async findAll(tenantId: string, query: FindSaleReturnsQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      returnType,
      storeId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: any = { tenantId };

    if (status) where.status = status;
    if (returnType) where.returnType = returnType;
    if (storeId) where.storeId = storeId;

    if (search) {
      where.OR = [
        { returnNumber: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.saleReturn.count({ where }),
      this.prisma.saleReturn.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          store: { select: { name: true, code: true } },
          customer: { select: { firstName: true, lastName: true, customerCode: true } },
          originalSale: { select: { saleNumber: true } }
        }
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
    const saleReturn = await this.prisma.saleReturn.findFirst({
      where: { id, tenantId },
      include: {
        items: true,
        store: { select: { id: true, name: true, code: true } },
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
        originalSale: true,
      },
    });

    if (!saleReturn) {
      throw new NotFoundException('Sale return not found');
    }

    return saleReturn;
  }
}
