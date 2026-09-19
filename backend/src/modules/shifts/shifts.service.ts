import { Injectable, BadRequestException, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { ShiftStatus, PaymentMethod } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ShiftsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async openShift(tenantId: string, storeId: string, userId: string, dto: OpenShiftDto) {
    // Check if there is already an active shift for this store
    const activeShift = await this.prisma.shift.findFirst({
      where: {
        tenantId,
        storeId,
        status: ShiftStatus.OPEN,
      },
    });

    if (activeShift) {
      throw new ConflictException('An active shift already exists for this store');
    }

    const shift = await this.prisma.shift.create({
      data: {
        tenantId,
        storeId,
        openedById: userId,
        status: ShiftStatus.OPEN,
        startingFloat: new Decimal(dto.startingFloat),
        openedAt: new Date(),
      },
    });

    return shift;
  }

  async getXReport(tenantId: string, storeId: string, shiftId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        openedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (shift.tenantId !== tenantId || shift.storeId !== storeId) {
      throw new ForbiddenException('Access denied to this shift');
    }

    const sales = await this.prisma.sale.findMany({
      where: { shiftId },
      include: {
        items: true,
      },
    });

    const returns = await this.prisma.saleReturn.findMany({
      where: { shiftId },
    });

    const startingFloat = new Decimal(shift.startingFloat);
    let cashSales = new Decimal(0);
    let cashReturns = new Decimal(0);
    let grossSales = new Decimal(0);
    let refunds = new Decimal(0);
    let vat = new Decimal(0);

    const paymentTotals: Record<string, Decimal> = {};

    for (const sale of sales) {
      const total = new Decimal(sale.grandTotal);
      grossSales = grossSales.add(total);
      vat = vat.add(new Decimal(sale.taxAmount));

      const method = sale.paymentMethod;
      if (!paymentTotals[method]) {
        paymentTotals[method] = new Decimal(0);
      }
      paymentTotals[method] = paymentTotals[method].add(total);

      if (method === PaymentMethod.CASH) {
        cashSales = cashSales.add(total);
      }
    }

    for (const ret of returns) {
      const total = new Decimal(ret.refundTotal);
      refunds = refunds.add(total);
      // Wait, returns deduct from VAT? The prompt says calculate VAT totals. Let's subtract return tax.
      vat = vat.sub(new Decimal(ret.taxAmount));

      const method = ret.refundMethod;
      if (!paymentTotals[method]) {
        paymentTotals[method] = new Decimal(0);
      }
      paymentTotals[method] = paymentTotals[method].sub(total);

      if (method === PaymentMethod.CASH) {
        cashReturns = cashReturns.add(total);
      }
    }

    const netSales = grossSales.sub(refunds);
    const expectedCash = startingFloat.add(cashSales).sub(cashReturns);

    // Format payment totals for response
    const formattedPaymentTotals: Record<string, number> = {};
    let totalPayments = new Decimal(0);
    for (const [method, amount] of Object.entries(paymentTotals)) {
      formattedPaymentTotals[method] = amount.toNumber();
      totalPayments = totalPayments.add(amount);
    }
    formattedPaymentTotals['total'] = totalPayments.toNumber();

    return {
      shiftId: shift.id,
      storeId: shift.storeId,
      openedAt: shift.openedAt,
      status: shift.status,
      startingFloat: startingFloat.toNumber(),
      salesCount: sales.length,
      returnCount: returns.length,
      grossSales: grossSales.toNumber(),
      refunds: refunds.toNumber(),
      netSales: netSales.toNumber(),
      vat: vat.toNumber(),
      cashSales: cashSales.toNumber(),
      cashReturns: cashReturns.toNumber(),
      expectedCash: expectedCash.toNumber(),
      paymentTotals: formattedPaymentTotals,
      cashier: `${shift.openedBy.firstName} ${shift.openedBy.lastName || ''}`.trim(),
    };
  }

  async closeShift(tenantId: string, storeId: string, userId: string, shiftId: string, dto: CloseShiftDto) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (shift.tenantId !== tenantId || shift.storeId !== storeId) {
      throw new ForbiddenException('Access denied to this shift');
    }

    if (shift.status === ShiftStatus.CLOSED) {
      throw new BadRequestException('Shift is already closed');
    }

    // Manager override check
    if (dto.managerOverrideId) {
      const manager = await this.prisma.user.findUnique({
        where: { id: dto.managerOverrideId },
      });

      if (!manager || manager.tenantId !== tenantId) {
        throw new BadRequestException('Invalid manager override ID');
      }

      // Check manager permission
      const managerPermissions = await this.prisma.rolePermission.findMany({
        where: { roleId: manager.roleId },
        include: { permission: true },
      });

      const hasOverridePerm = managerPermissions.some(
        (rp) => rp.permission.code === 'shifts.close' || rp.permission.code === 'shifts.zreport'
      );

      if (!hasOverridePerm) {
        throw new ForbiddenException('Manager override user does not have permission');
      }

      await this.auditService.logAction(manager.id, 'MANAGER_OVERRIDE', 'Shift', shift.id, {
        action: 'close_shift',
        cashierId: userId,
        declaredCash: dto.declaredCash,
      });
    }

    const xReport = await this.getXReport(tenantId, storeId, shiftId);
    const expectedCash = new Decimal(xReport.expectedCash);
    const declaredCash = new Decimal(dto.declaredCash);
    const variance = declaredCash.sub(expectedCash);

    // Perform atomic close and z-report assignment with retry for concurrency
    let closedShift = null;
    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        closedShift = await this.prisma.$transaction(async (tx) => {
          // Get the next Z report number for this store safely
          const maxZ = await tx.shift.aggregate({
            where: { storeId, status: ShiftStatus.CLOSED },
            _max: { zReportNumber: true },
          });
          const nextZ = (maxZ._max.zReportNumber || 0) + 1;

          const zReportData = {
            ...xReport,
            declaredCash: declaredCash.toNumber(),
            variance: variance.toNumber(),
            zReportNumber: nextZ,
            closedAt: new Date().toISOString(),
            closedBy: userId,
            managerOverrideId: dto.managerOverrideId || null,
          };

          return await tx.shift.update({
            where: { id: shiftId },
            data: {
              status: ShiftStatus.CLOSED,
              closedAt: new Date(),
              closedById: userId,
              managerOverrideId: dto.managerOverrideId || null,
              declaredCash,
              expectedCash,
              variance,
              zReportNumber: nextZ,
              zReportData,
            },
          });
        });
        break; // Success, exit retry loop
      } catch (error) {
        if (error.code === 'P2002' && error.meta?.target?.includes('zReportNumber')) {
          retries++;
          if (retries >= maxRetries) {
            throw new ConflictException('Failed to generate unique Z-Report number due to high concurrency. Please try again.');
          }
        } else {
          throw error;
        }
      }
    }

    return closedShift;
  }

  async getZReport(tenantId: string, storeId: string, shiftId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (shift.tenantId !== tenantId || shift.storeId !== storeId) {
      throw new ForbiddenException('Access denied to this shift');
    }

    if (shift.status === ShiftStatus.OPEN) {
      throw new BadRequestException('Cannot generate Z report for an open shift');
    }

    return shift.zReportData;
  }
}
