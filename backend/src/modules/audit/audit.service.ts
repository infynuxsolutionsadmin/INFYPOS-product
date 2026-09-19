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
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          adminId,
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
}
