const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const perm = await p.permission.upsert({
    where: { code: 'shifts.read' },
    update: {},
    create: { code: 'shifts.read', name: 'Read Shifts', module: 'shifts', description: 'Read shifts' }
  });
  const roles = await p.role.findMany({ where: { code: 'STORE_MANAGER' } });
  for (const r of roles) {
    await p.rolePermission.createMany({
      data: [{ roleId: r.id, permissionId: perm.id }],
      skipDuplicates: true
    });
  }
  console.log('shifts.read permission added');
}
main().finally(() => p.$disconnect());
