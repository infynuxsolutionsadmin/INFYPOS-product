import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async check() {
    const startTime = Date.now();
    let databaseStatus = 'disconnected';
    let latencyMs: number | null = null;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      databaseStatus = 'connected';
      latencyMs = Date.now() - startTime;
    } catch (err: any) {
      this.logger.error('Database health check failed', err?.stack || err?.message);
      throw new ServiceUnavailableException({
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: err?.message || 'Database connection error',
        uptime: process.uptime(),
      });
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: databaseStatus,
      latencyMs,
      uptime: process.uptime(),
      version: process.env.npm_package_version || '0.1.0',
    };
  }
}
