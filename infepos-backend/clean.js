const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clean() {
  await prisma.refreshToken.deleteMany({});
  console.log('Refresh tokens wiped');
}
clean().catch(console.error).finally(() => prisma.$disconnect());
