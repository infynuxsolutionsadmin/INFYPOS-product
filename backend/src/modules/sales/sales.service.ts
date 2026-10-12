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
import { calculateSaleRequestHash } from './utils/sale-idempotency.util';

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

    const effectiveIdempotencyKey =
      dto.idempotencyKey || (isSync && (dto as any).eventId ? (dto as any).eventId : undefined);

    let requestHash: string | null = null;

    if (effectiveIdempotencyKey) {
      requestHash = calculateSaleRequestHash(dto);

      const existingSale = await this.prisma.sale.findFirst({
        where: {
          tenantId,
          idempotencyKey: effectiveIdempotencyKey,
        },
        include: {
          items: true,
          payments: true,
        },
      });

      if (existingSale) {
        if (existingSale.requestHash !== requestHash) {
          this.logger.warn({
            event: 'IDEMPOTENCY_CONFLICT',
            tenantId,
            idempotencyKey: effectiveIdempotencyKey,
            existingHash: existingSale.requestHash,
            incomingHash: requestHash,
          });
          throw new ConflictException(
            'Idempotency key has already been used for a different checkout operation',
          );
        }

        this.logger.log({
          event: 'SALE_IDEMPOTENT_REPLAY',
          tenantId,
          saleId: existingSale.id,
          saleNumber: existingSale.saleNumber,
          idempotencyKey: effectiveIdempotencyKey,
        });

        return this.formatSaleResponse(existingSale);
      }
    } else {
      this.logger.warn({
        event: 'UNPROTECTED_SALE_CREATION',
        tenantId,
        cashierId: userId,
        storeId: dto.storeId,
        message:
          'Direct sale creation request missing idempotency key. Client cannot be protected against duplicate submissions on network retries.',
      });
    }

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
      } else if (dto.customerPhone) {
        customer = await this.prisma.customer.findFirst({
          where: { phone: dto.customerPhone, tenantId },
        });
        if (!customer) {
          // Auto-create a basic customer record for the offline till sync
          customer = await this.prisma.customer.create({
            data: {
              tenantId,
              customerCode: `CUST-${Date.now()}`,
              firstName: 'Retail',
              lastName: 'Customer',
              phone: dto.customerPhone,
              customerType: 'RETAIL',
              status: 'ACTIVE',
            }
          });
        } else if (customer.status === 'BLOCKED') {
          throw new ForbiddenException('Customer is blocked from making purchases');
        }
      }

      try {
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

          // FIN-02: Validate discount bounds
          const discountAmount = dto.discountAmount ? new Prisma.Decimal(dto.discountAmount) : new Prisma.Decimal(0);
          if (discountAmount.lt(0)) {
            throw new BadRequestException('Discount amount cannot be negative');
          }
          if (discountAmount.gt(subtotal)) {
            throw new BadRequestException('Discount amount cannot exceed the cart subtotal');
          }

          const grandTotal = subtotal.add(taxAmount).sub(discountAmount);
          if (grandTotal.lt(0)) {
            throw new BadRequestException('Grand total cannot be negative');
          }

          const roundedGrandTotal = new Prisma.Decimal(grandTotal.toFixed(2));

          // FIN-01: Validate payment tenders against grand total
          const paymentDtos = dto.payments && dto.payments.length > 0
            ? dto.payments
            : (dto as any).paymentMethod
              ? [{ paymentMethod: (dto as any).paymentMethod, amount: Number(roundedGrandTotal.toFixed(2)) }]
              : [];

          if (paymentDtos.length === 0) {
            throw new BadRequestException('At least one payment tender is required');
          }

          let totalPaid = new Prisma.Decimal(0);
          for (const p of paymentDtos) {
            const pAmount = new Prisma.Decimal(p.amount);
            if (pAmount.lte(0)) {
              throw new BadRequestException('Payment tender amount must be greater than zero');
            }
            totalPaid = totalPaid.add(pAmount);
          }

          const roundedTotalPaid = new Prisma.Decimal(totalPaid.toFixed(2));

          if (!roundedTotalPaid.equals(roundedGrandTotal)) {
            throw new BadRequestException(
              `Total payments tendered (${roundedTotalPaid.toString()}) do not match the required grand total (${roundedGrandTotal.toString()})`,
            );
          }

          // Generate Unique Sale Number safely
          const dateNow = new Date();
          const dateStr = dateNow.toISOString().slice(0, 10).replace(/-/g, '');
          const timeUnique = Date.now().toString().slice(-6);
          const randomDigits = Math.floor(1000 + Math.random() * 9000).toString();
          const saleNumber = `INV-${dateStr}-${timeUnique}${randomDigits}`;

          const sale = await tx.sale.create({
            data: {
              tenantId,
              storeId: dto.storeId,
              userId,
              customerId: customer?.id || null,
              customerName: customer ? `${customer.firstName} ${customer.lastName || ''}`.trim() : null,
              customerCode: customer?.customerCode || null,
              saleNumber,
              idempotencyKey: effectiveIdempotencyKey || null,
              requestHash: requestHash || null,
              subtotal,
              taxAmount,
              discountAmount,
              grandTotal: roundedGrandTotal,
              status: SaleStatus.COMPLETED,
              notes: dto.notes,
              shiftId: dto.shiftId,
              items: {
                create: saleItemsToCreate,
              },
              payments: {
                create: paymentDtos.map(p => ({
                  paymentMethod: p.paymentMethod,
                  amount: new Prisma.Decimal(p.amount),
                  transactionReference: p.transactionReference
                }))
              }
            },
            include: {
              items: true,
              payments: true,
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
            idempotencyKey: effectiveIdempotencyKey || undefined,
          });

          return this.formatSaleResponse(sale);
        });
      } catch (error: any) {
        // Handle concurrent uniqueness collision (P2002)
        if (error?.code === 'P2002' && effectiveIdempotencyKey) {
          const target = error?.meta?.target;
          const constraint = error?.meta?.constraint as string | undefined;

          // Determine if target/constraint explicitly points to idempotency key
          const hasExplicitIdempotencyTarget =
            (Array.isArray(target) &&
              target.some((t: string) => t.includes('idempotency_key') || t.includes('idempotencyKey'))) ||
            (typeof target === 'string' && target.includes('idempotency_key')) ||
            (typeof constraint === 'string' && constraint.includes('idempotency_key'));

          // If target is explicitly something else (e.g. ['sale_number']), immediately rethrow
          const hasExplicitOtherTarget =
            (Array.isArray(target) && target.length > 0 && !hasExplicitIdempotencyTarget) ||
            (typeof target === 'string' && target.length > 0 && !hasExplicitIdempotencyTarget);

          if (hasExplicitOtherTarget) {
            throw error;
          }

          // If target is missing/ambiguous or explicitly idempotency, check whether winning sale can be reliably established
          const winningSale = await this.prisma.sale.findFirst({
            where: {
              tenantId,
              idempotencyKey: effectiveIdempotencyKey,
            },
            include: {
              items: true,
              payments: true,
            },
          });

          if (winningSale) {
            if (winningSale.requestHash !== requestHash) {
              throw new ConflictException(
                'Idempotency key has already been used for a different checkout operation',
              );
            }

            this.logger.log({
              event: 'SALE_CONCURRENT_IDEMPOTENT_RESOLVED',
              tenantId,
              saleId: winningSale.id,
              saleNumber: winningSale.saleNumber,
              idempotencyKey: effectiveIdempotencyKey,
              targetExplicit: hasExplicitIdempotencyTarget,
            });

            return this.formatSaleResponse(winningSale);
          } else {
            // No winning sale found with this idempotency key.
            // Collision was NOT caused by this idempotency key (or cannot be established reliably).
            this.logger.warn({
              event: 'UNRESOLVED_P2002_RETHROWN',
              tenantId,
              idempotencyKey: effectiveIdempotencyKey,
              errorMeta: error?.meta,
              message: 'P2002 constraint violation occurred but no committed sale exists for this idempotency key',
            });
            throw error;
          }
        }
        throw error;
      }
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

  private formatSaleResponse(sale: any) {
    return {
      id: sale.id,
      saleNumber: sale.saleNumber,
      customerId: sale.customerId,
      customerName: sale.customerName,
      customerCode: sale.customerCode,
      grandTotal: sale.grandTotal.toString(),
      subtotal: sale.subtotal.toString(),
      taxAmount: sale.taxAmount.toString(),
      discountAmount: sale.discountAmount.toString(),
      status: sale.status,
      createdAt: sale.createdAt,
      items: (sale.items || []).map((item: any) => ({
        id: item.id,
        productName: item.productName,
        sku: item.sku,
        barcode: item.barcode,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        vatRate: item.vatRate.toString(),
        lineTotal: item.lineTotal.toString(),
      })),
      payments: (sale.payments || []).map((payment: any) => ({
        paymentMethod: payment.paymentMethod,
        amount: payment.amount.toString(),
        transactionReference: payment.transactionReference,
      })),
    };
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
      search,
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
    
    if (search) {
      where.OR = [
        { saleNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        {
          items: {
            some: {
              productName: { contains: search, mode: 'insensitive' }
            }
          }
        }
      ];
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
        include: {
          payments: true
        }
      }),
    ]);

    const pages = Math.ceil(total / limit);

    const mappedItems = items.map(item => ({
      ...item,
      paymentMethod: item.payments && item.payments.length > 0 
        ? (item.payments.length > 1 ? 'MULTI' : item.payments[0].paymentMethod) 
        : 'UNKNOWN'
    }));

    return {
      items: mappedItems,
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
        payments: true,
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
