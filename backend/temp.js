const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.role.findMany({ where: { code: 'CASHIER' } })
  .then(console.log)
  .finally(() => p.$disconnect());
