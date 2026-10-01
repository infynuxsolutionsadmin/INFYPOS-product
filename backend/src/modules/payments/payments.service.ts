import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, query: any) {
    const { page = 1, limit = 20, saleId, paymentMethod, status } = query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const where: any = { sale: { tenantId } };
    
    if (saleId) where.saleId = saleId;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (status) where.status = status;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          sale: {
            select: { saleNumber: true, store: { select: { code: true, name: true } } }
          }
        }
      })
    ]);

    return {
      items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    };
  }

  async findOne(tenantId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, sale: { tenantId } },
      include: {
        sale: {
          include: {
            store: { select: { code: true, name: true } }
          }
        }
      }
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }
}
