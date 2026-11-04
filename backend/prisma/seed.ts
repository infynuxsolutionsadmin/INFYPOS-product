import * as fs from 'fs';
import * as path from 'path';

// Automatically load .env if DATABASE_URL is not set in environment
if (!process.env.DATABASE_URL) {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...v] = trimmed.split('=');
        const key = k.trim();
        const val = v.join('=').trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}
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
  'salesReturns',
  'reports',
  'settings',
  'permissions',
  'dashboard',
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
