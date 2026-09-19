import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CustomerStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { FindCustomersQueryDto } from './dto/find-customers-query.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateCustomerCode(tenantId: string): Promise<string> {
    const count = await this.prisma.customer.count({
      where: { tenantId },
    });
    const sequence = (count + 1).toString().padStart(6, '0');
    return `CUS-${sequence}`;
  }

  async create(tenantId: string, dto: CreateCustomerDto) {
    return this.prisma.$transaction(async (tx) => {
      // Check phone uniqueness
      const existingByPhone = await tx.customer.findFirst({
        where: { tenantId, phone: dto.phone },
      });

      if (existingByPhone) {
        if (existingByPhone.status === CustomerStatus.INACTIVE) {
          // Reactivate
          return tx.customer.update({
            where: { id: existingByPhone.id },
            data: {
              ...dto,
              status: CustomerStatus.ACTIVE,
            },
          });
        }
        throw new ConflictException('Customer with this phone number already exists');
      }

      const customerCode = await this.generateCustomerCode(tenantId);

      return tx.customer.create({
        data: {
          tenantId,
          customerCode,
          customerType: dto.customerType,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          email: dto.email,
          addressLine1: dto.addressLine1,
          addressLine2: dto.addressLine2,
          city: dto.city,
          state: dto.state,
          postalCode: dto.postalCode,
          country: dto.country,
          dob: dto.dob ? new Date(dto.dob) : null,
          gender: dto.gender,
          gstNumber: dto.gstNumber,
          creditLimit: dto.creditLimit,
          marketingOptIn: dto.marketingOptIn,
          smsEnabled: dto.smsEnabled,
          emailEnabled: dto.emailEnabled,
          notes: dto.notes,
          status: CustomerStatus.ACTIVE,
        },
      });
    });
  }

  async findAll(tenantId: string, query: FindCustomersQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      customerType,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: any = { tenantId };

    if (status) where.status = status;
    if (customerType) where.customerType = customerType;

    if (search) {
      where.OR = [
        { customerCode: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
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

  async search(tenantId: string, q: string) {
    if (!q || q.length < 2) return [];

    return this.prisma.customer.findMany({
      where: {
        tenantId,
        status: CustomerStatus.ACTIVE,
        OR: [
          { customerCode: { contains: q, mode: 'insensitive' } },
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 10,
      orderBy: { firstName: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async update(tenantId: string, id: string, dto: UpdateCustomerDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (dto.phone && dto.phone !== customer.phone) {
      const existingPhone = await this.prisma.customer.findFirst({
        where: { tenantId, phone: dto.phone },
      });
      if (existingPhone) {
        throw new ConflictException('Phone number is already registered to another customer');
      }
    }

    const updateData: any = { ...dto };
    if (dto.dob) updateData.dob = new Date(dto.dob);

    return this.prisma.customer.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: { sales: true },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (customer._count.sales > 0) {
      throw new ConflictException('Cannot permanently delete customer with existing sales records');
    }

    return this.prisma.customer.update({
      where: { id },
      data: { status: CustomerStatus.INACTIVE },
    });
  }

  async getHistory(tenantId: string, id: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [totalSales, sales] = await this.prisma.$transaction([
      this.prisma.sale.count({ where: { tenantId, customerId: id } }),
      this.prisma.sale.findMany({
        where: { tenantId, customerId: id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          store: { select: { name: true, code: true } },
          user: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    // Returns (future), Payments (future), Outstanding placeholders can be added to standard response
    return {
      sales: {
        items: sales,
        pagination: { page, limit, total: totalSales, pages: Math.ceil(totalSales / limit) }
      },
      returns: [], // Placeholder for Phase 17
      payments: [], // Placeholder
    };
  }

  async getStatistics(tenantId: string, id: string) {
    const customer = await this.findOne(tenantId, id);

    const sales = await this.prisma.sale.findMany({
      where: { tenantId, customerId: id },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });

    const totalPurchases = sales.length;
    let totalSpending = 0;
    
    // Most purchased product
    const productCount: Record<string, {name: string, count: number}> = {};
    const storeCount: Record<string, number> = {};

    sales.forEach(sale => {
      totalSpending += Number(sale.grandTotal);
      
      storeCount[sale.storeId] = (storeCount[sale.storeId] || 0) + 1;

      sale.items.forEach(item => {
        if (!productCount[item.productId]) {
          productCount[item.productId] = { name: item.productName, count: 0 };
        }
        productCount[item.productId].count += Number(item.quantity);
      });
    });

    const averageBasket = totalPurchases > 0 ? totalSpending / totalPurchases : 0;
    const lastPurchaseDate = sales.length > 0 ? sales[0].createdAt : null;
    const firstPurchaseDate = sales.length > 0 ? sales[sales.length - 1].createdAt : null;

    let mostPurchasedProduct = null;
    let maxQty = 0;
    for (const [_, val] of Object.entries(productCount)) {
      if (val.count > maxQty) {
        maxQty = val.count;
        mostPurchasedProduct = val.name;
      }
    }

    let favoriteStoreId = null;
    let maxVisits = 0;
    for (const [sId, count] of Object.entries(storeCount)) {
      if (count > maxVisits) {
        maxVisits = count;
        favoriteStoreId = sId;
      }
    }

    let favoriteStoreName = null;
    if (favoriteStoreId) {
      const store = await this.prisma.store.findUnique({ where: { id: favoriteStoreId } });
      favoriteStoreName = store?.name || null;
    }

    let averageVisitGapDays = 0;
    if (sales.length > 1 && lastPurchaseDate && firstPurchaseDate) {
      const ms = lastPurchaseDate.getTime() - firstPurchaseDate.getTime();
      const days = ms / (1000 * 60 * 60 * 24);
      averageVisitGapDays = days / (sales.length - 1);
    }

    let purchaseFrequency = 'OCCASIONAL';
    if (averageVisitGapDays > 0) {
      if (averageVisitGapDays <= 14) purchaseFrequency = 'WEEKLY';
      else if (averageVisitGapDays <= 45) purchaseFrequency = 'MONTHLY';
    }

    return {
      totalPurchases,
      totalSpending,
      averageBasket,
      lastVisit: lastPurchaseDate,
      firstVisit: firstPurchaseDate,
      customerSince: customer.createdAt,
      mostPurchasedProduct,
      favoriteStore: favoriteStoreName,
      averageVisitGapDays: averageVisitGapDays.toFixed(2),
      purchaseFrequency,
      outstandingBalance: customer.outstandingBalance,
      loyaltyPoints: {
        current: customer.currentPoints,
        lifetime: customer.lifetimePoints,
        tier: customer.tier,
      }
    };
  }
}
