import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.saleReturnItem.deleteMany({});
  await prisma.saleReturn.deleteMany({});
  await prisma.saleItem.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.sale.deleteMany({});
  
  await prisma.inventoryAdjustmentItem.deleteMany({});
  await prisma.inventoryAdjustment.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.inventory.deleteMany({});
  
  await prisma.stockTransferItem.deleteMany({});
  await prisma.stockTransfer.deleteMany({});
  
  await prisma.goodsReceiptItem.deleteMany({});
  await prisma.goodsReceipt.deleteMany({});
  await prisma.purchaseItem.deleteMany({});
  await prisma.purchase.deleteMany({});
  
  const result = await prisma.product.deleteMany({});
  console.log(`Deleted ${result.count} test products (and all associated test sales/inventory data).`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
