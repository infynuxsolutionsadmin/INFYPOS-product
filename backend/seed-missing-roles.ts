import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany();

  for (const tenant of tenants) {
    const rolesToCreate = [
      {
        tenantId: tenant.id,
        name: 'Store Manager',
        code: 'STORE_MANAGER',
        description: 'Manages a specific store',
      },
      {
        tenantId: tenant.id,
        name: 'Inventory Manager',
        code: 'INVENTORY_MANAGER',
        description: 'Manages products and stock levels',
      },
      {
        tenantId: tenant.id,
        name: 'Cashier',
        code: 'CASHIER',
        description: 'Point of sale operator',
      }
    ];

    for (const roleData of rolesToCreate) {
      const exists = await prisma.role.findFirst({
        where: { tenantId: tenant.id, code: roleData.code }
      });
      if (!exists) {
        await prisma.role.create({ data: roleData });
      }
    }
  }

  console.log('Finished seeding missing roles to existing tenants.');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
