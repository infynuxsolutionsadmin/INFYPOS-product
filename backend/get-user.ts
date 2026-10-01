import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.user.findFirst({ include: { tenant: true } })
  .then(u => {
    console.log(JSON.stringify(u, null, 2));
  })
  .finally(() => prisma.$disconnect());
