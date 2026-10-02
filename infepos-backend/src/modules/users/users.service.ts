import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PasswordService } from '../auth/services/password.service';
import { CreateUserDto } from './dto/create-user.dto';
import { FindUsersQueryDto } from './dto/find-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async create(tenantId: string, dto: CreateUserDto) {
    const role = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
    });

    if (!role || role.tenantId !== tenantId) {
      throw new ForbiddenException('Invalid role assignment');
    }

    if (dto.storeId) {
      const store = await this.prisma.store.findUnique({
        where: { id: dto.storeId },
      });

      if (!store || store.tenantId !== tenantId) {
        throw new ForbiddenException('Invalid store assignment');
      }
    }

    const existingUser = await this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email: dto.email,
        },
      },
    });

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        roleId: dto.roleId,
        storeId: dto.storeId,
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        roleId: true,
        storeId: true,
        status: true,
      },
    });

    return user;
  }

  async findAll(tenantId: string, query: FindUsersQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      roleId,
      storeId,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
    };

    if (roleId) {
      where.roleId = roleId;
    }

    if (storeId) {
      where.storeId = storeId;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          status: true,
          roleId: true,
          storeId: true,
          role: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          store: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
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
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        role: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(tenantId: string, id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      include: { role: true, store: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updates: any = {};

    if (dto.firstName !== undefined && dto.firstName !== user.firstName) {
      updates.firstName = dto.firstName;
    }
    if (dto.lastName !== undefined && dto.lastName !== user.lastName) {
      updates.lastName = dto.lastName;
    }
    if (dto.phone !== undefined && dto.phone !== user.phone) {
      updates.phone = dto.phone;
    }
    if (dto.status !== undefined && dto.status !== user.status) {
      updates.status = dto.status;
    }

    if (dto.roleId !== undefined && dto.roleId !== user.roleId) {
      const newRole = await this.prisma.role.findFirst({
        where: { id: dto.roleId, tenantId },
      });

      if (!newRole) {
        throw new ForbiddenException('Invalid role assignment');
      }

      if (user.role.code === 'OWNER' && newRole.code !== 'OWNER') {
        throw new ForbiddenException('Cannot downgrade an OWNER account');
      }

      updates.roleId = dto.roleId;
    }

    if (dto.storeId !== undefined && dto.storeId !== user.storeId) {
      if (dto.storeId === null) {
        updates.storeId = null;
      } else {
        const newStore = await this.prisma.store.findFirst({
          where: { id: dto.storeId, tenantId },
        });

        if (!newStore) {
          throw new ForbiddenException('Invalid store assignment');
        }

        updates.storeId = dto.storeId;
      }
    }

    if (Object.keys(updates).length === 0) {
      return this.findOne(tenantId, id);
    }

    await this.prisma.user.update({
      where: { id },
      data: updates,
    });

    return this.findOne(tenantId, id);
  }

  async remove(tenantId: string, id: string, currentUserId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.id === currentUserId) {
      throw new ForbiddenException('Cannot deactivate your own account');
    }

    if (user.role.code === 'OWNER') {
      throw new ForbiddenException('Cannot deactivate an OWNER account');
    }

    if (user.status === UserStatus.INACTIVE) {
      return this.findOne(tenantId, id);
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { status: UserStatus.INACTIVE },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return this.findOne(tenantId, id);
  }
}
