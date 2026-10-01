import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('password123', 12);
  const user = await prisma.user.updateMany({
    where: { email: 'owner@demo.com' },
    data: { passwordHash: hash }
  });
  console.log('Password updated to: password123');
}

main().finally(() => prisma.$disconnect());
