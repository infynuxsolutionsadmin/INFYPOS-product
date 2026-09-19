import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InventoryStatus, Prisma, ProductStatus, StoreStatus, UserStatus, SaleStatus, PaymentMethod } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { FindSalesQueryDto } from './dto/find-sales-query.dto';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, userId: string, dto: CreateSaleDto, isSync: boolean = false) {
    this.logger.log({
      event: 'SALE_CREATION_STARTED',
      tenantId,
      storeId: dto.storeId,
      cashierId: userId,
      itemCount: dto.items.length,
    });

    try {
      // 0. Validate Shift
      if (!dto.shiftId) {
        throw new BadRequestException('An active shift is required to create a sale.');
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
      if (shift.storeId !== dto.storeId) {
        throw new BadRequestException('Shift store does not match sale store.');
      }
      if (!isSync && shift.status !== 'OPEN') {
        throw new BadRequestException('Shift is no longer active.');
      }

      // 1. Validate Store
      const store = await this.prisma.store.findFirst({
        where: { id: dto.storeId, tenantId },
      });
      if (!store) {
        throw new NotFoundException('Store not found or does not belong to tenant');
      }
      if (store.status !== StoreStatus.ACTIVE) {
        throw new BadRequestException('Store is inactive');
      }

      // 2. Validate User
      const user = await this.prisma.user.findFirst({
        where: { id: userId, tenantId },
      });
      if (!user) {
        throw new NotFoundException('Cashier not found or does not belong to tenant');
      }
      if (user.status !== UserStatus.ACTIVE) {
        throw new ForbiddenException('Cashier is inactive');
      }

      // 3. Validate Customer (Optional)
      let customer = null;
      if (dto.customerId) {
        customer = await this.prisma.customer.findFirst({
          where: { id: dto.customerId, tenantId },
        });
        if (!customer) {
          throw new NotFoundException('Customer not found');
        }
        if (customer.status === 'BLOCKED') {
          throw new ForbiddenException('Customer is blocked from making purchases');
        }
      }

      return await this.prisma.$transaction(async (tx) => {
        let subtotal = new Prisma.Decimal(0);
        let taxAmount = new Prisma.Decimal(0);
        const saleItemsToCreate = [];
        const stockMovementsData = [];

        for (const item of dto.items) {
          // Validate Product
          const product = await tx.product.findFirst({
            where: { id: item.productId, tenantId },
          });

          if (!product) {
            throw new NotFoundException(`Product ${item.productId} not found or does not belong to tenant`);
          }
          if (product.status !== ProductStatus.ACTIVE) {
            throw new BadRequestException(`Product ${product.name} is inactive`);
          }

          const quantity = new Prisma.Decimal(item.quantity);

          if (product.trackInventory) {
            // Validate Inventory
            const inventory = await tx.inventory.findUnique({
              where: {
                storeId_productId: {
                  storeId: dto.storeId,
                  productId: item.productId,
                },
              },
            });

            if (!inventory) {
              throw new NotFoundException(
                `Inventory record not found for product ${product.name} in this store`,
              );
            }
            if (inventory.status !== InventoryStatus.ACTIVE) {
              throw new BadRequestException(`Inventory for product ${product.name} is inactive`);
            }

            const availableStock = inventory.quantityOnHand.sub(inventory.reservedQuantity);
            
            if (!isSync && availableStock.lt(quantity)) {
              throw new ConflictException(
                `Insufficient stock for product ${product.name}. Available: ${availableStock.toString()}, Requested: ${quantity.toString()}`,
              );
            }

            // Atomic Inventory Deduction
            const updateResult = await tx.inventory.updateMany({
              where: {
                id: inventory.id,
                ...(isSync ? {} : {
                  quantityOnHand: {
                    gte: quantity, // Must still be enough stock atomically if not sync
                  },
                }),
              },
              data: {
                quantityOnHand: {
                  decrement: quantity,
                },
              },
            });

            if (updateResult.count === 0) {
              throw new ConflictException(
                `Race condition detected or insufficient stock during deduction for product ${product.name}`,
              );
            }
            
            const balanceBefore = inventory.quantityOnHand;
            const balanceAfter = balanceBefore.sub(quantity);

            // Record StockMovement
            stockMovementsData.push({
              tenantId,
              storeId: dto.storeId,
              productId: product.id,
              inventoryId: inventory.id,
              referenceType: 'SALE',
              movementType: 'SALE',
              quantity: quantity.mul(-1),
              balanceBefore,
              balanceAfter,
              performedBy: userId,
              remarks: `Product sold`,
            });
          }

          // Decimal Computations
          const unitPrice = new Prisma.Decimal(product.sellingPrice);
          const vatRate = new Prisma.Decimal(product.vatRate);

          const lineTotal = unitPrice.mul(quantity);
          const lineTax = lineTotal.mul(vatRate.div(100));

          subtotal = subtotal.add(lineTotal);
          taxAmount = taxAmount.add(lineTax);

          saleItemsToCreate.push({
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            barcode: product.barcode,
            quantity: quantity,
            unitPrice: unitPrice,
            vatRate: vatRate,
            lineTotal: lineTotal,
          });

        }

        const discountAmount = dto.discountAmount ? new Prisma.Decimal(dto.discountAmount) : new Prisma.Decimal(0);
        const grandTotal = subtotal.add(taxAmount).sub(discountAmount);

        // Generate Unique Sale Number
        const dateNow = new Date();
        const saleNumber = `INV-${dateNow.getFullYear()}${(dateNow.getMonth() + 1)
          .toString()
          .padStart(2, '0')}${dateNow.getDate().toString().padStart(2, '0')}-${Math.floor(
          Math.random() * 1000000,
        ).toString().padStart(6, '0')}`;

        const sale = await tx.sale.create({
          data: {
            tenantId,
            storeId: dto.storeId,
            userId,
            customerId: customer?.id || null,
            customerName: customer ? `${customer.firstName} ${customer.lastName || ''}`.trim() : null,
            customerCode: customer?.customerCode || null,
            saleNumber,
            subtotal,
            taxAmount,
            discountAmount: dto.discountAmount || 0,
            grandTotal,
            paymentMethod: dto.paymentMethod || PaymentMethod.CASH,
            status: SaleStatus.COMPLETED,
            notes: dto.notes,
            shiftId: dto.shiftId,
            items: {
              create: saleItemsToCreate,
            },
          },
          include: {
            items: true,
          },
        });

        if (stockMovementsData.length > 0) {
          for (const sm of stockMovementsData) {
            sm.referenceId = sale.id;
          }
          await tx.stockMovement.createMany({ data: stockMovementsData });
        }

        this.logger.log({
          event: 'SALE_CREATED_SUCCESS',
          tenantId,
          storeId: dto.storeId,
          cashierId: userId,
          saleNumber,
          grandTotal: grandTotal.toString(),
        });

        return {
          saleNumber: sale.saleNumber,
          customerId: sale.customerId,
          customerName: sale.customerName,
          customerCode: sale.customerCode,
          grandTotal: sale.grandTotal.toString(),
          subtotal: sale.subtotal.toString(),
          taxAmount: sale.taxAmount.toString(),
          discountAmount: sale.discountAmount.toString(),
          paymentMethod: sale.paymentMethod,
          status: sale.status,
          createdAt: sale.createdAt,
          items: sale.items.map(item => ({
            productName: item.productName,
            sku: item.sku,
            barcode: item.barcode,
            quantity: item.quantity.toString(),
            unitPrice: item.unitPrice.toString(),
            vatRate: item.vatRate.toString(),
            lineTotal: item.lineTotal.toString(),
          })),
        };
      });
    } catch (error) {
      this.logger.error({
        event: 'SALE_CREATION_FAILED',
        tenantId,
        storeId: dto.storeId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async findAll(tenantId: string, query: FindSalesQueryDto) {
    const {
      page = 1,
      limit = 10,
      storeId,
      userId,
      status,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: any = { tenantId };

    if (storeId) where.storeId = storeId;
    if (userId) where.userId = userId;
    if (status) where.status = status;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.sale.count({ where }),
      this.prisma.sale.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
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
    const sale = await this.prisma.sale.findFirst({
      where: { id, tenantId },
      include: {
        items: true,
        store: { select: { id: true, name: true, code: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    return sale;
  }

  async getReturnable(tenantId: string, id: string) {
    const sale = await this.findOne(tenantId, id);

    if (sale.status !== SaleStatus.COMPLETED) {
      throw new BadRequestException('Only completed sales can be returned');
    }

    const returnableItems = sale.items.map(item => {
      const sold = item.quantity;
      const returned = item.returnedQuantity;
      const available = sold.sub(returned);

      return {
        saleItemId: item.id,
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        barcode: item.barcode,
        unitPrice: item.unitPrice,
        soldQuantity: sold,
        returnedQuantity: returned,
        availableToReturn: available,
      };
    }).filter(item => item.availableToReturn.gt(0));

    return {
      saleId: sale.id,
      saleNumber: sale.saleNumber,
      returnableItems,
    };
  }
}
