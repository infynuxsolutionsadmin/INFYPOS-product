import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.permission.findMany({
      select: {
        id: true,
        code: true,
        module: true,
      },
      orderBy: [
        { module: 'asc' },
        { code: 'asc' },
      ],
    });
  }

  async findAllGroupedByModule() {
    const permissions = await this.prisma.permission.findMany({
      select: {
        code: true,
        module: true,
      },
      orderBy: { code: 'asc' },
    });

    const groupedMap = new Map<string, string[]>();

    for (const p of permissions) {
      if (!groupedMap.has(p.module)) {
        groupedMap.set(p.module, []);
      }
      groupedMap.get(p.module)!.push(p.code);
    }

    return Array.from(groupedMap.entries()).map(([module, perms]) => ({
      module,
      permissions: perms,
    })).sort((a, b) => a.module.localeCompare(b.module));
  }
}
