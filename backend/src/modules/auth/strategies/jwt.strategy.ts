import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../database/prisma.service';
import { UserStatus, TenantStatus } from '@prisma/client';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
    });
  }

  async validate(payload: any) {
    if (!payload?.userId || !payload?.tenantId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.userId,
        tenantId: payload.tenantId,
      },
      select: {
        id: true,
        status: true,
        roleId: true,
        tenant: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User account no longer exists');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(`User account is ${user.status.toLowerCase()}`);
    }

    if (user.tenant?.status !== TenantStatus.ACTIVE) {
      throw new UnauthorizedException(`Tenant account is ${user.tenant?.status.toLowerCase()}`);
    }

    return payload;
  }
}

