import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { FindRolesQueryDto } from './dto/find-roles-query.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateRoleDto) {
    const existing = await this.prisma.role.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code: dto.code,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Role code already exists');
    }

    return this.prisma.role.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        isSystem: false,
        status: RoleStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        isSystem: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findAll(tenantId: string, query: FindRolesQueryDto) {
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
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.role.count({ where }),
      this.prisma.role.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
          isSystem: true,
          status: true,
          createdAt: true,
          updatedAt: true,
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
    const role = await this.prisma.role.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        isSystem: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        permissions: {
          select: {
            permission: {
              select: {
                id: true,
                code: true,
                name: true,
                module: true,
              },
            },
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return {
      ...role,
      permissions: role.permissions.map((p) => p.permission),
    };
  }

  async update(tenantId: string, id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findFirst({
      where: { id, tenantId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const updates: any = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.status !== undefined) updates.status = dto.status;

    if (Object.keys(updates).length === 0) {
      return this.findOne(tenantId, id);
    }

    await this.prisma.role.update({
      where: { id },
      data: updates,
    });

    return this.findOne(tenantId, id);
  }

  async remove(tenantId: string, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, tenantId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystem) {
      throw new ForbiddenException('Cannot delete a system role');
    }

    if (role.status === RoleStatus.INACTIVE) {
      return this.findOne(tenantId, id);
    }

    const activeUsersCount = await this.prisma.user.count({
      where: {
        roleId: id,
        status: 'ACTIVE',
      },
    });

    if (activeUsersCount > 0) {
      throw new ConflictException('Cannot delete role assigned to active users');
    }

    await this.prisma.role.update({
      where: { id },
      data: { status: RoleStatus.INACTIVE },
    });

    return this.findOne(tenantId, id);
  }

  async getPermissions(tenantId: string, roleId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, tenantId },
      select: {
        permissions: {
          select: {
            permission: {
              select: {
                id: true,
                code: true,
                name: true,
                module: true,
              },
            },
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role.permissions.map((p) => p.permission);
  }

  async updatePermissions(tenantId: string, roleId: string, dto: { permissionIds: string[] }) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, tenantId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.code === 'OWNER') {
      throw new ForbiddenException('Cannot modify permissions of the OWNER role');
    }

    // Ensure all permission IDs actually exist
    const validPermissionsCount = await this.prisma.permission.count({
      where: {
        id: { in: dto.permissionIds },
      },
    });

    if (validPermissionsCount !== dto.permissionIds.length) {
      throw new NotFoundException('One or more permission IDs do not exist');
    }

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({
        where: { roleId },
      }),
      this.prisma.rolePermission.createMany({
        data: dto.permissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        })),
        skipDuplicates: true,
      }),
    ]);

    return this.getPermissions(tenantId, roleId);
  }
}
