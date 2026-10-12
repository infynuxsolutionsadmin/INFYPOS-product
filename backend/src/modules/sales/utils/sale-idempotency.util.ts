import * as crypto from 'crypto';
import { CreateSaleDto } from '../dto/create-sale.dto';

/**
 * Calculates a deterministic, canonical SHA-256 request hash from a CreateSaleDto.
 * Excludes volatile fields (such as timestamps, client tokens, or volatile IDs).
 * Sorts array elements to ensure consistent hashing regardless of client serialization order.
 */
export function calculateSaleRequestHash(dto: CreateSaleDto): string {
  const canonicalPayload = {
    storeId: dto.storeId,
    shiftId: dto.shiftId || null,
    customerId: dto.customerId || null,
    customerPhone: dto.customerPhone ? dto.customerPhone.trim() : null,
    discountAmount: Number(dto.discountAmount || 0).toFixed(2),
    notes: dto.notes ? dto.notes.trim() : null,
    items: (dto.items || [])
      .map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity).toFixed(2),
      }))
      .sort((a, b) => {
        const prodCompare = a.productId.localeCompare(b.productId);
        if (prodCompare !== 0) return prodCompare;
        return a.quantity.localeCompare(b.quantity);
      }),
    payments: (dto.payments && dto.payments.length > 0
      ? dto.payments
      : (dto as any).paymentMethod
        ? [{ paymentMethod: (dto as any).paymentMethod, amount: 0, transactionReference: null }]
        : []
    )
      .map((p: any) => ({
        paymentMethod: p.paymentMethod,
        amount: Number(p.amount || 0).toFixed(2),
        transactionReference: p.transactionReference ? p.transactionReference.trim() : null,
      }))
      .sort((a: any, b: any) => {
        const methodCompare = a.paymentMethod.localeCompare(b.paymentMethod);
        if (methodCompare !== 0) return methodCompare;
        return a.amount.localeCompare(b.amount);
      }),
  };

  const serialized = JSON.stringify(canonicalPayload);
  return crypto.createHash('sha256').update(serialized).digest('hex');
}
