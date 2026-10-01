import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({ take: 5 });
  console.log(products.map(p => p.barcode || p.sku));
}

main().finally(() => prisma.$disconnect());
