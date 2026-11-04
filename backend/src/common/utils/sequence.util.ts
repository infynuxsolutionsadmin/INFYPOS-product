/**
 * Database-backed, concurrency-safe monotonic sequence number generator.
 *
 * Utilizes PostgreSQL atomic UPSERT with ROW locking:
 * INSERT INTO document_sequences ... ON CONFLICT (tenant_id, entity_type, date_prefix)
 * DO UPDATE SET counter = counter + 1 RETURNING counter
 *
 * Guarantees strict monotonicity without collisions or race conditions
 * even under parallel concurrent transactions across multiple containers.
 */
export async function getNextSequenceNumber(
  prisma: any,
  tenantId: string,
  entityType: string,
  prefix: string,
  digits: number = 6,
  dateNow: Date = new Date(),
): Promise<string> {
  const dateStr = dateNow.toISOString().slice(0, 10).replace(/-/g, '');

  const result: any[] = await prisma.$queryRawUnsafe(
    `INSERT INTO "document_sequences" ("id", "tenant_id", "entity_type", "date_prefix", "counter", "updated_at")
     VALUES (gen_random_uuid(), $1::uuid, $2, $3, 1, CURRENT_TIMESTAMP)
     ON CONFLICT ("tenant_id", "entity_type", "date_prefix")
     DO UPDATE SET "counter" = "document_sequences"."counter" + 1, "updated_at" = CURRENT_TIMESTAMP
     RETURNING "counter";`,
    tenantId,
    entityType,
    dateStr,
  );

  const counterVal = result?.[0]?.counter ?? 1;
  const sequenceStr = String(counterVal).padStart(digits, '0');
  return `${prefix}-${dateStr}-${sequenceStr}`;
}

