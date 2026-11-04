import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SalesService } from '../sales/sales.service';
import { SalesReturnsService } from '../sales-returns/sales-returns.service';
import { SyncPayloadDto } from './dto/sync.dto';
import { ShiftsService } from '../shifts/shifts.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly salesService: SalesService,
    private readonly salesReturnsService: SalesReturnsService,
    private readonly shiftsService: ShiftsService,
    private readonly auditService: AuditService,
  ) {}

  async processSync(tenantId: string, userId: string, dto: SyncPayloadDto) {
    // 1. Mandatory Batch-Level Preflight Security Check
    // Credential mutation (CASHIER_PIN_RESET) is strictly forbidden via generic synchronization.
    const forbiddenResetEvent = dto.events?.find(
      (event) => event.eventType === 'CASHIER_PIN_RESET',
    );

    if (forbiddenResetEvent) {
      const targetUserId = forbiddenResetEvent.payload?.cashierId || undefined;
      const eventId = forbiddenResetEvent.eventId || undefined;

      this.logger.warn({
        event: 'SECURITY_VIOLATION_UNAUTHORIZED_PIN_RESET',
        tenantId,
        actorId: userId,
        targetUserId,
        eventId,
        message:
          'Unauthorized attempt to reset cashier PIN via synchronization endpoint. Entire batch rejected with HTTP 403.',
      });

      // Record security audit violation without exposing plaintext PIN or hash
      try {
        await this.auditService.logAction(
          userId,
          'SECURITY_VIOLATION_UNAUTHORIZED_PIN_RESET',
          'User',
          targetUserId || 'UNKNOWN',
          {
            tenantId,
            actorId: userId,
            targetUserId,
            eventId,
            reason: 'Unauthorized PIN reset attempted via sync endpoint',
            outcome: 'REJECTED',
          },
        );
      } catch (auditError: any) {
        this.logger.error(
          `Failed to record audit log for unauthorized PIN reset: ${auditError?.message}`,
        );
      }

      // Fail-closed: Reject complete request before entering event-processing loop
      throw new ForbiddenException(
        'Access denied: PIN credential resets cannot be performed via synchronization. Management privileges and dedicated management API required.',
      );
    }

    const results = {
      success: true,
      processed: [],
      alreadyProcessed: [],
      failed: [],
    };

    for (const event of dto.events) {
      const storeId = event.payload?.storeId;
      if (!storeId) {
        results.failed.push({ eventId: event.eventId, status: 'FAILED', error: 'Missing storeId in payload' });
        continue;
      }

      // 1. Claim processing lock atomically
      const existing = await this.prisma.syncEvent.findUnique({
        where: { tenantId_eventId: { tenantId, eventId: event.eventId } },
      });

      if (existing) {
        if (existing.status === 'SUCCESS' || existing.status === 'PROCESSING') {
          results.alreadyProcessed.push({ eventId: event.eventId, status: 'ALREADY_PROCESSED' });
          continue;
        }

        // Atomically claim FAILED event for retry
        const updated = await this.prisma.syncEvent.updateMany({
          where: {
            tenantId,
            eventId: event.eventId,
            status: 'FAILED',
          },
          data: {
            status: 'PROCESSING',
            errorMessage: null,
          },
        });

        if (updated.count === 0) {
          results.alreadyProcessed.push({ eventId: event.eventId, status: 'ALREADY_PROCESSED' });
          continue;
        }
      } else {
        // Atomically create event lock. Unique constraint (tenantId_eventId) will fail if concurrent request created it first.
        try {
          await this.prisma.syncEvent.create({
            data: {
              tenantId,
              storeId,
              eventId: event.eventId,
              eventType: event.eventType,
              payload: event.payload,
              status: 'PROCESSING',
            },
          });
        } catch (lockError) {
          results.alreadyProcessed.push({ eventId: event.eventId, status: 'ALREADY_PROCESSED' });
          continue;
        }
      }

      try {
        let processedPayload = null;

        // 2. Route event to appropriate service
        if (event.eventType === 'SALE') {
          const salePayload = {
            ...event.payload,
            idempotencyKey: event.payload?.idempotencyKey || event.eventId,
          };
          processedPayload = await this.salesService.create(tenantId, userId, salePayload, true);
        } else if (event.eventType === 'SALE_RETURN') {
          processedPayload = await this.salesReturnsService.create(tenantId, userId, event.payload, true);
        } else if (event.eventType === 'SHIFT_OPEN') {
          processedPayload = await this.shiftsService.openShift(tenantId, storeId, userId, event.payload);
        } else if (event.eventType === 'SHIFT_CLOSE') {
          processedPayload = await this.shiftsService.closeShift(tenantId, storeId, userId, event.payload.shiftId, event.payload);
        } else {
          throw new Error(`Unsupported event type: ${event.eventType}`);
        }

        // 3. Mark as SUCCESS in SyncEvent
        await this.prisma.syncEvent.update({
          where: { tenantId_eventId: { tenantId, eventId: event.eventId } },
          data: {
            status: 'SUCCESS',
            errorMessage: null,
            payload: event.payload,
            processedAt: new Date(),
          },
        });

        results.processed.push({ eventId: event.eventId, status: 'PROCESSED' });
      } catch (error) {
        this.logger.error(`Failed to process event ${event.eventId}: ${error.message}`, error.stack);
        
        // 4. Mark as FAILED in SyncEvent
        try {
          await this.prisma.syncEvent.update({
            where: { tenantId_eventId: { tenantId, eventId: event.eventId } },
            data: {
              status: 'FAILED',
              errorMessage: error.message || 'Unknown error',
              payload: event.payload,
              processedAt: new Date(),
            },
          });
        } catch (dbError) {
          this.logger.error(`Failed to save FAILED sync event ${event.eventId}`, dbError.stack);
        }

        results.failed.push({ eventId: event.eventId, status: 'FAILED', error: error.message });
      }
    }

    return results;
  }
}
