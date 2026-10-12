import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { PasswordService } from './services/password.service';

import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly passwordService: PasswordService,
  ) {}

  private calculateExpirationDate(expiresIn: string): Date {
    const timeValue = parseInt(expiresIn, 10);
    const unit = expiresIn.replace(/[0-9]/g, '').trim().toLowerCase();

    const date = new Date();

    switch (unit) {
      case 's':
        date.setSeconds(date.getSeconds() + timeValue);
        break;
      case 'm':
        date.setMinutes(date.getMinutes() + timeValue);
        break;
      case 'h':
        date.setHours(date.getHours() + timeValue);
        break;
      case 'd':
        date.setDate(date.getDate() + timeValue);
        break;
      default:
        date.setDate(date.getDate() + 7); // Fallback to 7 days
    }

    return date;
  }

  async login(dto: LoginDto) {
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        code: {
          equals: dto.tenantCode,
          mode: 'insensitive',
        },
      },
    });

    if (!tenant) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (tenant.status !== 'ACTIVE' && tenant.code.toLowerCase() !== 'infynux') {
      throw new ForbiddenException(`Company account is ${tenant.status.toLowerCase()}`);
    }

    const user = await this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: dto.email,
        },
      },
      include: {
        role: true,
        tenant: true,
        store: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.passwordService.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === UserStatus.INACTIVE || user.status === UserStatus.LOCKED) {
      throw new ForbiddenException(`Account is ${user.status.toLowerCase()}`);
    }

    const payload = {
      userId: user.id,
      tenantId: user.tenantId,
      roleId: user.roleId,
      roleCode: user.role.code,
      storeId: user.storeId,
      email: user.email,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: this.configService.get<string>('jwt.expiresIn') as any,
    });

    const refreshExpiresInStr = this.configService.get<string>('jwt.refreshExpiresIn') || '7d';

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: refreshExpiresInStr as any,
    });

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = this.calculateExpirationDate(refreshExpiresInStr);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        tenantCode: tenant.code,
        roleId: user.roleId,
        roleCode: user.role.code,
        storeId: user.storeId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  async refresh(dto: RefreshTokenDto) {
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const { userId, tenantId } = payload;
    const tokenHash = crypto.createHash('sha256').update(dto.refreshToken).digest('hex');

    // Atomic refresh rotation within an interactive database transaction
    return this.prisma.$transaction(async (tx) => {
      const matchedToken = await tx.refreshToken.findUnique({
        where: { tokenHash },
      });

      if (!matchedToken || matchedToken.userId !== userId) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // 1. Expiration validation
      if (matchedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token has expired');
      }

      // 2. Token reuse / concurrency detection
      if (matchedToken.revokedAt) {
        const revokedDurationMs = Date.now() - matchedToken.revokedAt.getTime();
        // Concurrency window (5000ms): Permits in-flight concurrent requests to fail gracefully
        // without triggering false-positive family revocation.
        // Security constraint: NO new token is ever issued to an already-revoked token.
        const CONCURRENCY_WINDOW_MS = 5000;

        if (revokedDurationMs > CONCURRENCY_WINDOW_MS) {
          // Genuine stolen/replayed token reuse: Invalidate ALL active sessions for this user
          await tx.refreshToken.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
          });
          throw new UnauthorizedException(
            'Refresh token reuse detected. All active sessions have been invalidated. Please sign in again.',
          );
        } else {
          // Concurrent request during in-flight rotation: Reject without revoking active sessions
          throw new UnauthorizedException(
            'Refresh token was consumed by a concurrent request. Please use the updated token.',
          );
        }
      }

      // 3. Atomic conditional CAS update: succeeds ONLY if revokedAt is still null
      const updateResult = await tx.refreshToken.updateMany({
        where: {
          id: matchedToken.id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        // Another concurrent request consumed it at this exact millisecond
        throw new UnauthorizedException(
          'Refresh token was consumed by a concurrent request. Please use the updated token.',
        );
      }

      // 4. Validate user and tenant active status
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { role: true, tenant: true },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (user.tenant.status !== 'ACTIVE' && user.tenant.code.toLowerCase() !== 'infynux') {
        throw new ForbiddenException(`Company account is ${user.tenant.status.toLowerCase()}`);
      }

      if (user.status === UserStatus.INACTIVE || user.status === UserStatus.LOCKED) {
        throw new ForbiddenException(`Account is ${user.status.toLowerCase()}`);
      }

      // 5. Generate and persist new token pair within transaction
      const newPayload = {
        userId,
        tenantId,
        roleId: user.roleId,
        roleCode: user.role.code,
        storeId: user.storeId,
        email: user.email,
      };

      const accessToken = await this.jwtService.signAsync(newPayload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: this.configService.get<string>('jwt.expiresIn') as any,
      });

      const refreshExpiresInStr = this.configService.get<string>('jwt.refreshExpiresIn') || '7d';

      const newRefreshToken = await this.jwtService.signAsync(newPayload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: refreshExpiresInStr as any,
      });

      const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
      const expiresAt = this.calculateExpirationDate(refreshExpiresInStr);

      await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: newTokenHash,
          expiresAt,
        },
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    });
  }

  async logout(dto: RefreshTokenDto) {
    if (dto?.refreshToken) {
      const tokenHash = crypto.createHash('sha256').update(dto.refreshToken).digest('hex');
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { message: 'Logged out successfully' };
  }

  async getRolePermissions(roleCode: string, tenantId: string): Promise<string[]> {
    const role = await this.prisma.role.findFirst({
      where: { code: roleCode, tenantId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      return [];
    }

    return role.permissions.map((rp) => rp.permission.code);
  }
}
