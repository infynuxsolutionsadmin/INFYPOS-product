import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SalesService } from '../sales/sales.service';
import { SalesReturnsService } from '../sales-returns/sales-returns.service';
import { SyncPayloadDto } from './dto/sync.dto';

import { ShiftsService } from '../shifts/shifts.service';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly salesService: SalesService,
    private readonly salesReturnsService: SalesReturnsService,
    private readonly shiftsService: ShiftsService,
  ) {}

  async processSync(tenantId: string, userId: string, dto: SyncPayloadDto) {
    const results = {
      success: true,
      processed: [],
      alreadyProcessed: [],
      failed: [],
    };

    for (const event of dto.events) {
      // 1. Check Idempotency
      const existing = await this.prisma.syncEvent.findUnique({
        where: { tenantId_eventId: { tenantId, eventId: event.eventId } },
      });

      if (existing) {
        if (existing.status === 'SUCCESS') {
          results.alreadyProcessed.push({ eventId: event.eventId, status: 'ALREADY_PROCESSED' });
          continue; // Already processed successfully
        } else {
          // If it previously FAILED, we allow a retry.
          this.logger.log(`Retrying failed sync event: ${event.eventId}`);
        }
      }

      // We need storeId. Determine it from the payload if possible, otherwise we assume the payload has it.
      // Sales and SaleReturn DTOs contain storeId.
      const storeId = event.payload?.storeId;
      if (!storeId) {
        results.failed.push({ eventId: event.eventId, status: 'FAILED', error: 'Missing storeId in payload' });
        continue;
      }

      try {
        let processedPayload = null;

        // 2. Route event to appropriate service
        if (event.eventType === 'SALE') {
          processedPayload = await this.salesService.create(tenantId, userId, event.payload, true);
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
        await this.prisma.syncEvent.upsert({
          where: { tenantId_eventId: { tenantId, eventId: event.eventId } },
          create: {
            tenantId,
            storeId,
            eventId: event.eventId,
            eventType: event.eventType,
            payload: event.payload,
            status: 'SUCCESS',
          },
          update: {
            status: 'SUCCESS',
            errorMessage: null,
            payload: event.payload,
            processedAt: new Date(),
          },
        });

        results.processed.push({ eventId: event.eventId, status: 'PROCESSED' });
      } catch (error) {
        this.logger.error(`Failed to process event ${event.eventId}: ${error.message}`, error.stack);
        
        // 4. Mark as FAILED in SyncEvent (so we don't lose the fact that a Till tried to send it)
        try {
          await this.prisma.syncEvent.upsert({
            where: { tenantId_eventId: { tenantId, eventId: event.eventId } },
            create: {
              tenantId,
              storeId,
              eventId: event.eventId,
              eventType: event.eventType,
              payload: event.payload,
              status: 'FAILED',
              errorMessage: error.message || 'Unknown error',
            },
            update: {
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
