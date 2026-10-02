const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const roles = await p.role.findMany({ where: { code: 'CASHIER' } });
  const perm = await p.permission.findUnique({ where: { code: 'shifts.zreport' } });
  if (!perm) return console.log('perm not found');
  for (const r of roles) {
    await p.rolePermission.createMany({
      data: [{ roleId: r.id, permissionId: perm.id }],
      skipDuplicates: true
    });
  }
  console.log('done');
}
main().finally(() => p.$disconnect());
