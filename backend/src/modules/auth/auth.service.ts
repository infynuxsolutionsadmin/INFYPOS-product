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
    const tenant = await this.prisma.tenant.findUnique({
      where: { code: dto.tenantCode },
    });

    if (!tenant) {
      throw new UnauthorizedException('Invalid credentials');
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
        roleId: user.roleId,
        storeId: user.storeId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  async refresh(dto: RefreshTokenDto) {
    let payload;
    try {
      payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const { userId, tenantId, roleId, roleCode, storeId, email } = payload;

    const tokenHash = crypto.createHash('sha256').update(dto.refreshToken).digest('hex');

    const matchedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!matchedToken || matchedToken.revokedAt || matchedToken.userId !== userId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (matchedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (user.status === UserStatus.INACTIVE || user.status === UserStatus.LOCKED) {
      throw new ForbiddenException(`Account is ${user.status.toLowerCase()}`);
    }

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

    return {
      accessToken,
    };
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
