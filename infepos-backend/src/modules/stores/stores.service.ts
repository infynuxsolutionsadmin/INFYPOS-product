import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StoreStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { FindStoresQueryDto } from './dto/find-stores-query.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateStoreDto) {
    const existing = await this.prisma.store.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code: dto.code,
        },
      },
    });

    if (existing) {
      if (existing.status === StoreStatus.ACTIVE) {
        throw new ConflictException('Store code already exists');
      }

      // Reactivate
      await this.prisma.store.update({
        where: { id: existing.id },
        data: {
          ...dto,
          status: StoreStatus.ACTIVE,
        },
      });

      return this.findOne(tenantId, existing.id);
    }

    const created = await this.prisma.store.create({
      data: {
        tenantId,
        ...dto,
        isDefault: false,
        status: StoreStatus.ACTIVE,
      },
    });
    
    return this.findOne(tenantId, created.id);
  }

  async findAll(tenantId: string, query: FindStoresQueryDto) {
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

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.store.count({ where }),
      this.prisma.store.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        select: this.getSelectFields(),
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
    const store = await this.prisma.store.findFirst({
      where: { id, tenantId },
      select: this.getSelectFields(),
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return store;
  }

  async update(tenantId: string, id: string, dto: UpdateStoreDto) {
    const store = await this.prisma.store.findFirst({
      where: { id, tenantId },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    if (dto.code && dto.code !== store.code) {
      const existing = await this.prisma.store.findUnique({
        where: {
          tenantId_code: {
            tenantId,
            code: dto.code,
          },
        },
      });

      if (existing) {
        throw new ConflictException('Store code already exists');
      }
    }

    await this.prisma.store.update({
      where: { id },
      data: dto,
    });

    return this.findOne(tenantId, id);
  }

  async remove(tenantId: string, id: string) {
    const store = await this.prisma.store.findFirst({
      where: { id, tenantId },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    if (store.isDefault) {
      throw new ForbiddenException('Cannot delete the default store');
    }

    if (store.status === StoreStatus.INACTIVE) {
      return this.findOne(tenantId, id);
    }

    const activeUsersCount = await this.prisma.user.count({
      where: {
        storeId: id,
        status: 'ACTIVE',
      },
    });

    if (activeUsersCount > 0) {
      throw new ConflictException('Cannot delete store assigned to active users');
    }

    await this.prisma.store.update({
      where: { id },
      data: { status: StoreStatus.INACTIVE },
    });

    return this.findOne(tenantId, id);
  }

  private getSelectFields() {
    return {
      id: true,
      code: true,
      name: true,
      email: true,
      phone: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
      country: true,
      timezone: true,
      currency: true,
      isDefault: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    };
  }
}
