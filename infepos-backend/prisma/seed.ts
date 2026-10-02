import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const RESOURCES = [
  'users',
  'roles',
  'tenants',
  'stores',
  'inventory',
  'products',
  'sales',
  'reports',
  'settings',
  'permissions',
  'inventoryAdjustments',
  'stockTransfers',
  'purchases',
  'suppliers',
  'customers',
];

const ACTIONS = ['read', 'create', 'update', 'delete'];

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

async function main() {
  console.log('🌱 Starting Enterprise RBAC Seeder...');

  // 1. Generate all system permissions
  const permissionsToSeed = [];
  for (const resource of RESOURCES) {
    for (const action of ACTIONS) {
      permissionsToSeed.push({
        code: `${resource}.${action}`,
        name: `${capitalize(action)} ${capitalize(resource)}`,
        module: capitalize(resource),
        description: `Allows ${action} access to the ${resource} module.`,
      });
    }
  }

  // Add specific shift lifecycle permissions
  const shiftPerms = ['open', 'close', 'xreport', 'zreport'];
  for (const action of shiftPerms) {
    permissionsToSeed.push({
      code: `shifts.${action}`,
      name: `${capitalize(action)} Shifts`,
      module: 'Shifts',
      description: `Allows ${action} operations on shifts.`,
    });
  }

  // Add specific permissions that do not have full CRUD
  const customPerms = [
    { code: 'dashboard.read', name: 'Read Dashboard', module: 'Dashboard', description: 'Allows read access to the dashboard.' },
    { code: 'goodsReceipts.create', name: 'Create GoodsReceipts', module: 'GoodsReceipts', description: 'Allows create access to the goodsReceipts module.' },
    { code: 'goodsReceipts.read', name: 'Read GoodsReceipts', module: 'GoodsReceipts', description: 'Allows read access to the goodsReceipts module.' },
    { code: 'salesReturns.create', name: 'Create SalesReturns', module: 'SalesReturns', description: 'Allows create access to the salesReturns module.' },
    { code: 'salesReturns.read', name: 'Read SalesReturns', module: 'SalesReturns', description: 'Allows read access to the salesReturns module.' },
    { code: 'customers.history', name: 'History Customers', module: 'Customers', description: 'Allows history access to the customers module.' },
  ];
  permissionsToSeed.push(...customPerms);

  // 2. Upsert Permissions to ensure they all exist idempotently
  console.log(`Ensuring ${permissionsToSeed.length} permissions exist...`);
  const insertedPermissions = [];
  
  await prisma.$transaction(async (tx) => {
    for (const perm of permissionsToSeed) {
      const upserted = await tx.permission.upsert({
        where: { code: perm.code },
        update: {
          name: perm.name,
          module: perm.module,
          description: perm.description,
        },
        create: perm,
      });
      insertedPermissions.push(upserted);
    }
  });

  console.log('✅ Permissions synced successfully.');

  // Check if default tenant exists
  let defaultTenant = await prisma.tenant.findUnique({ where: { code: 'T1' } });
  if (!defaultTenant) {
    console.log('🌱 No tenants found. Creating default Tenant (T1)...');
    defaultTenant = await prisma.tenant.create({
      data: {
        code: 'T1',
        name: 'Default HQ',
      },
    });
  }

  let defaultUser = await prisma.user.findFirst({ where: { email: 'admin@test.com' } });
  if (!defaultUser) {
    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash('password123', 10);
    let defaultRole = await prisma.role.findFirst({ where: { code: 'OWNER' } });
    if (!defaultRole) {
       defaultRole = await prisma.role.create({
        data: {
          code: 'OWNER',
          name: 'System Owner',
          description: 'Full access',
          tenantId: defaultTenant.id,
          isSystem: true,
        },
      });
    }
    let defaultStore = await prisma.store.findFirst({ where: { code: 'HQ' } });
    if (!defaultStore) {
      defaultStore = await prisma.store.create({
        data: {
          code: 'HQ',
          name: 'Headquarters',
          tenantId: defaultTenant.id,
          isDefault: true,
        },
      });
    }

    await prisma.user.create({
      data: {
        tenantId: defaultTenant.id,
        storeId: defaultStore.id,
        roleId: defaultRole.id,
        firstName: 'System',
        lastName: 'Admin',
        email: 'admin@test.com',
        passwordHash,
        status: 'ACTIVE',
      },
    });
    console.log('✅ Admin User (admin@test.com) created.');
  }

  // 3. Find all OWNER roles across all tenants
  const ownerRoles = await prisma.role.findMany({
    where: { code: 'OWNER' },
  });

  console.log(`Found ${ownerRoles.length} OWNER roles. Assigning permissions...`);

  // 4. Assign all permissions to all OWNER roles idempotently
  let assignedCount = 0;
  
  await prisma.$transaction(async (tx) => {
    for (const role of ownerRoles) {
      // Create an array of data for createMany
      const rolePermissionsData = insertedPermissions.map((perm) => ({
        roleId: role.id,
        permissionId: perm.id,
      }));

      // Use createMany with skipDuplicates to make it idempotent and fast
      const result = await tx.rolePermission.createMany({
        data: rolePermissionsData,
        skipDuplicates: true,
      });
      
      assignedCount += result.count;
    }
  });

  console.log(`✅ Assigned ${assignedCount} new permissions to OWNER roles.`);
  console.log('🎉 Enterprise RBAC Seeding Complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// trigger watch

// trigger watch 2
