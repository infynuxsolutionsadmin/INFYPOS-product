import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ROLE_PERMISSIONS = {
  CASHIER: [
    'shifts.open', 'shifts.close', 'shifts.xreport', 'shifts.zreport',
    'sales.create', 'sales.read',
    'products.read',
    'inventory.read',
    'customers.create', 'customers.read'
  ],
  STORE_MANAGER: [
    'shifts.open', 'shifts.close', 'shifts.xreport', 'shifts.zreport',
    'sales.create', 'sales.read', 'sales.update', 'sales.delete',
    'products.read',
    'inventory.read', 'inventory.update',
    'customers.create', 'customers.read', 'customers.update',
    'reports.read', 'dashboard.read'
  ],
  INVENTORY_MANAGER: [
    'products.create', 'products.read', 'products.update', 'products.delete',
    'inventory.create', 'inventory.read', 'inventory.update', 'inventory.delete',
    'reports.read', 'dashboard.read'
  ]
};

async function main() {
  console.log('Seeding permissions for default roles...');
  
  const allPermissions = await prisma.permission.findMany();
  const permMap = new Map(allPermissions.map(p => [p.code, p.id]));

  for (const [roleCode, permCodes] of Object.entries(ROLE_PERMISSIONS)) {
    const roles = await prisma.role.findMany({ where: { code: roleCode } });
    
    const validPermIds = permCodes
      .map(code => permMap.get(code))
      .filter(id => id !== undefined);

    let assignedCount = 0;
    
    await prisma.$transaction(async (tx) => {
      for (const role of roles) {
        const rolePermissionsData = validPermIds.map((permId) => ({
          roleId: role.id,
          permissionId: permId as string,
        }));

        if (rolePermissionsData.length > 0) {
           const result = await tx.rolePermission.createMany({
            data: rolePermissionsData,
            skipDuplicates: true,
          });
          assignedCount += result.count;
        }
      }
    });
    
    console.log(`Assigned ${assignedCount} permissions to ${roles.length} ${roleCode} roles.`);
  }

  console.log('Done!');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
