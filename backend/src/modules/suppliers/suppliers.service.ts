import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupplierStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { FindSuppliersQueryDto } from './dto/find-suppliers-query.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateSupplierDto) {
    const OR_conditions = [{ supplierCode: dto.supplierCode }];
    if (dto.email) {
      OR_conditions.push({ email: dto.email } as any);
    }

    const existing = await this.prisma.supplier.findFirst({
      where: {
        tenantId,
        OR: OR_conditions,
      },
    });

    if (existing) {
      if (existing.status === SupplierStatus.ACTIVE) {
        if (existing.supplierCode === dto.supplierCode) {
          throw new ConflictException('Supplier code already exists');
        } else {
          throw new ConflictException('Supplier email already exists');
        }
      }

      // Reactivate soft-deleted record
      await this.prisma.supplier.update({
        where: { id: existing.id },
        data: {
          ...dto,
          status: SupplierStatus.ACTIVE,
        },
      });

      return this.findOne(tenantId, existing.id);
    }

    const created = await this.prisma.supplier.create({
      data: {
        tenantId,
        ...dto,
        status: SupplierStatus.ACTIVE,
      },
    });

    return this.findOne(tenantId, created.id);
  }

  async findAll(tenantId: string, query: FindSuppliersQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: any = { tenantId };

    if (status) {
      where.status = status;
    }
    if (query.city) {
      where.city = query.city;
    }
    if (query.paymentTerms) {
      where.paymentTerms = query.paymentTerms;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { supplierCode: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.supplier.count({ where }),
      this.prisma.supplier.findMany({
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
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  async update(tenantId: string, id: string, dto: UpdateSupplierDto) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    if (dto.supplierCode || dto.email) {
      const OR_conditions: any[] = [];
      if (dto.supplierCode && dto.supplierCode !== supplier.supplierCode) {
        OR_conditions.push({ supplierCode: dto.supplierCode });
      }
      if (dto.email && dto.email !== supplier.email) {
        OR_conditions.push({ email: dto.email });
      }

      if (OR_conditions.length > 0) {
        const existing = await this.prisma.supplier.findFirst({
          where: {
            tenantId,
            OR: OR_conditions,
          },
        });

        if (existing) {
          if (existing.supplierCode === dto.supplierCode) {
            throw new ConflictException('Supplier code already exists');
          } else {
            throw new ConflictException('Supplier email already exists');
          }
        }
      }
    }

    await this.prisma.supplier.update({
      where: { id },
      data: dto,
    });

    return this.findOne(tenantId, id);
  }

  async remove(tenantId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    if (supplier.status === SupplierStatus.INACTIVE) {
      return supplier;
    }

    await this.prisma.supplier.update({
      where: { id },
      data: { status: SupplierStatus.INACTIVE },
    });

    return this.findOne(tenantId, id);
  }
}
