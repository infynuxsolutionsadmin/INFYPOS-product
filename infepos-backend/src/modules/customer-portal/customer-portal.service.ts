import { Injectable, Logger, NotFoundException, BadRequestException, HttpException, HttpStatus, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AwsService } from '../aws/aws.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AuthCustomerStatus } from '@prisma/client';

@Injectable()
export class CustomerPortalService {
  private readonly logger = new Logger(CustomerPortalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly awsService: AwsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createAuthorizedCustomer(adminId: string, email: string | null, phone: string | null, plan: string) {
    if (!email && !phone) throw new BadRequestException('Email or phone is required');

    const customer = await this.prisma.authorizedCustomer.create({
      data: {
        email,
        phone,
        plan,
        status: AuthCustomerStatus.ACTIVE,
        addedByAdminId: adminId,
      },
    });

    await this.auditService.logAction(adminId, 'GRANT_DOWNLOAD_ACCESS', 'AuthorizedCustomer', customer.id, { email, phone, plan });
    return customer;
  }

  async listAuthorizedCustomers(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;
    const where = search ? {
      OR: [
        { email: { contains: search, mode: 'insensitive' as any } },
        { phone: { contains: search, mode: 'insensitive' as any } },
      ],
    } : {};

    const [items, total] = await Promise.all([
      this.prisma.authorizedCustomer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { adminUser: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.authorizedCustomer.count({ where }),
    ]);

    return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async getCustomerDetails(id: string) {
    const customer = await this.prisma.authorizedCustomer.findUnique({
      where: { id },
      include: {
        adminUser: { select: { id: true, firstName: true, lastName: true } },
        downloadLogs: { orderBy: { downloadedAt: 'desc' }, take: 50 },
      },
    });

    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async revokeCustomer(adminId: string, id: string) {
    const customer = await this.prisma.authorizedCustomer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('Customer not found');

    const updated = await this.prisma.authorizedCustomer.update({
      where: { id },
      data: { status: AuthCustomerStatus.REVOKED },
    });

    await this.auditService.logAction(adminId, 'REVOKE_DOWNLOAD_ACCESS', 'AuthorizedCustomer', id, { email: customer.email });
    return updated;
  }

  async requestOtp(contact: string) {
    // 1. Look for ACTIVE customer
    const customer = await this.prisma.authorizedCustomer.findFirst({
      where: {
        OR: [{ email: contact }, { phone: contact }],
        status: AuthCustomerStatus.ACTIVE,
      },
    });

    // 2. Return generic message regardless
    const genericResponse = { message: 'If this contact is authorised, a verification code has been sent.' };

    if (!customer) return genericResponse;

    // Generate 6 digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const codeHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store hash
    await this.prisma.otpCode.create({
      data: {
        customerId: customer.id,
        channel: contact.includes('@') ? 'EMAIL' : 'SMS',
        codeHash,
        expiresAt,
      },
    });

    // Send OTP
    if (contact.includes('@')) {
      await this.notificationsService.sendEmail(
        contact,
        'INFYPOS Download Portal - Verification Code',
        `Your verification code is: ${otp}\n\nThis code will expire in 10 minutes. Do not share it with anyone.`,
      );
    }
    
    // Not implementing real SMS unless explicit, so just dropping it if phone.
    // The PRD says "Do not add SMS unless it is already explicitly supported".

    return genericResponse;
  }

  async verifyOtp(contact: string, otp: string, ipAddress: string) {
    // 1. Find the customer
    const customer = await this.prisma.authorizedCustomer.findFirst({
      where: { OR: [{ email: contact }, { phone: contact }] },
    });

    if (!customer) throw new BadRequestException('Invalid or expired verification code');

    // Check status
    if (customer.status === AuthCustomerStatus.REVOKED) {
      throw new ForbiddenException('Access denied');
    }

    // Find the latest active OTP code for this customer
    const otpRecord = await this.prisma.otpCode.findFirst({
      where: {
        customerId: customer.id,
        verifiedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) throw new BadRequestException('Invalid or expired verification code');

    if (new Date() > otpRecord.expiresAt) {
      throw new BadRequestException('Verification code has expired');
    }

    if (otpRecord.attemptCount >= 3) {
      throw new HttpException('Maximum attempts exceeded. Request a new code.', HttpStatus.TOO_MANY_REQUESTS);
    }

    // Increment attempt
    await this.prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { attemptCount: { increment: 1 } },
    });

    // Verify hash
    const isValid = await bcrypt.compare(otp, otpRecord.codeHash);
    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    // Mark as verified
    await this.prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { verifiedAt: new Date() },
    });

    // Generate signed URL
    // Fake current version logic or fetch from env
    const currentVersion = process.env.INSTALLER_VERSION || 'v2.0.0';
    const signedUrl = await this.awsService.generateInstallerSignedUrl(currentVersion);

    // Log download
    await this.prisma.downloadLog.create({
      data: {
        customerId: customer.id,
        ipAddress: ipAddress || 'unknown',
        installerVersion: currentVersion,
      },
    });

    return {
      message: 'Verification successful',
      downloadUrl: signedUrl,
      expiresIn: '15m',
    };
  }
}
