import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logAction(
    adminId: string,
    action: string,
    entity: string,
    entityId: string,
    details?: any,
    tenantId?: string,
  ) {
    try {
      let resolvedTenantId = tenantId;
      if (!resolvedTenantId && adminId) {
        // Derive tenant ownership safely on the backend
        const user = await this.prisma.user.findUnique({
          where: { id: adminId },
          select: { tenantId: true },
        });
        resolvedTenantId = user?.tenantId;
      }

      await this.prisma.auditLog.create({
        data: {
          adminId,
          tenantId: resolvedTenantId,
          action,
          entity,
          entityId,
          details,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create audit log for ${action} on ${entity} ${entityId}: ${error.message}`);
    }
  }

  async findAllForTenant(
    tenantId: string,
    query?: { page?: number; limit?: number; entity?: string },
  ) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query?.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (query?.entity) {
      where.entity = query.entity;
    }

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          adminUser: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
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
}
