import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TenantStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { QueryTenantDto } from './dto/query-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTenantDto) {
    // 1. Check for code collision
    const existingCode = await this.prisma.tenant.findFirst({
      where: { code: dto.code },
    });
    if (existingCode) {
      throw new ConflictException(`Tenant code "${dto.code}" is already taken.`);
    }

    // 2. Create Tenant
    return this.prisma.tenant.create({
      data: {
        name: dto.name,
        code: dto.code,
        email: dto.email || null,
        phone: dto.phone || null,
        status: dto.status || TenantStatus.ACTIVE,
      },
    });
  }

  async findAll(query: QueryTenantDto) {
    const { page = 1, limit = 10, search, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TenantWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(idOrCode: string) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        idOrCode,
      );

    const tenant = await this.prisma.tenant.findFirst({
      where: isUuid ? { id: idOrCode } : { code: idOrCode },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant "${idOrCode}" not found.`);
    }

    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto) {
    // 1. Ensure tenant exists
    await this.findOne(id);

    // 2. Validate code uniqueness if code is being updated
    if (dto.code) {
      const existingCode = await this.prisma.tenant.findFirst({
        where: {
          code: dto.code,
          NOT: { id },
        },
      });
      if (existingCode) {
        throw new ConflictException(`Tenant code "${dto.code}" is already taken.`);
      }
    }

    // 3. Perform update
    return this.prisma.tenant.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        email: dto.email,
        phone: dto.phone,
        status: dto.status,
      },
    });
  }

  async remove(id: string) {
    // 1. Ensure tenant exists
    await this.findOne(id);

    // 2. Update status to inactive or suspended (no soft delete in current PRD schema)
    return this.prisma.tenant.update({
      where: { id },
      data: {
        status: TenantStatus.INACTIVE,
      },
    });
  }
}
