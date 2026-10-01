import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Generating dummy barcodes for all products...');
  
  const products = await prisma.product.findMany();
  let updatedCount = 0;

  for (const product of products) {
    if (!product.barcode) {
      // Generate a random 12-digit barcode for testing (like a UPC-A)
      const randomBarcode = Math.floor(100000000000 + Math.random() * 900000000000).toString();
      
      await prisma.product.update({
        where: { id: product.id },
        data: { barcode: randomBarcode },
      });
      updatedCount++;
    }
  }

  console.log(`Successfully generated barcodes for ${updatedCount} products!`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
