const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function main() { 
  const events = await prisma.syncEvent.findMany({ orderBy: { processedAt: 'desc' }, take: 5 }); 
  console.log(JSON.stringify(events, null, 2)); 
} 
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
