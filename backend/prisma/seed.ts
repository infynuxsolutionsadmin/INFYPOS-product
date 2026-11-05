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

  // 5. Assign default operational permissions to STORE_MANAGER and CASHIER roles
  const permsMap = new Map(insertedPermissions.map((p) => [p.code, p.id]));

  const cashierPermCodes = [
    'sales.create',
    'sales.read',
    'salesReturns.create',
    'salesReturns.read',
    'shifts.open',
    'shifts.close',
    'shifts.xreport',
    'shifts.zreport',
    'products.read',
    'inventory.read',
  ];

  const managerPermCodes = [
    'sales.create',
    'sales.read',
    'sales.update',
    'sales.delete',
    'salesReturns.create',
    'salesReturns.read',
    'salesReturns.update',
    'salesReturns.delete',
    'shifts.open',
    'shifts.close',
    'shifts.xreport',
    'shifts.zreport',
    'shifts.read',
    'products.read',
    'inventory.read',
    'inventory.update',
    'reports.read',
    'dashboard.read',
  ];

  const otherRoles = await prisma.role.findMany({
    where: { code: { in: ['STORE_MANAGER', 'CASHIER'] } },
  });

  await prisma.$transaction(async (tx) => {
    for (const role of otherRoles) {
      const codes = role.code === 'STORE_MANAGER' ? managerPermCodes : cashierPermCodes;
      const rolePermData = codes
        .map((code) => permsMap.get(code))
        .filter(Boolean)
        .map((permId) => ({ roleId: role.id, permissionId: permId! }));

      await tx.rolePermission.createMany({
        data: rolePermData,
        skipDuplicates: true,
      });
    }
  });

  console.log(`✅ Assigned operational permissions to ${otherRoles.length} STORE_MANAGER & CASHIER roles.`);

  // 6. Seed Subscription Plan Tiers
  const DEFAULT_PLANS = [
    {
      code: 'STARTER',
      name: 'Starter Retail',
      description: 'Perfect for single stores and boutique shops.',
      badge: null,
      monthlyPriceGbp: 39.0,
      annualPriceGbp: 31.0,
      maxStores: 1,
      maxUsers: 2,
      features: [
        '1 Store Location',
        'Up to 2 POS Registers',
        'Real-time SQLite Offline Sync',
        'Core Inventory & Barcodes',
        'Cashier Shifts & Z-Reports',
      ],
    },
    {
      code: 'PRO',
      name: 'Professional Retail',
      description: 'For growing retail businesses with multi-tills.',
      badge: 'Most Popular',
      monthlyPriceGbp: 79.0,
      annualPriceGbp: 63.0,
      maxStores: 5,
      maxUsers: 15,
      features: [
        'Multi-Store Management (Up to 5 stores)',
        'Up to 15 POS Cashier Terminals',
        'Advanced Inventory & Stock Transfers',
        'Loyalty, Discounts & Gift Cards',
        'Stripe Integrated Payments',
      ],
    },
    {
      code: 'ENTERPRISE',
      name: 'Enterprise Multi-Chain',
      description: 'For multi-chain enterprises and franchises.',
      badge: 'Enterprise',
      monthlyPriceGbp: 149.0,
      annualPriceGbp: 119.0,
      maxStores: 9999,
      maxUsers: 9999,
      features: [
        'Unlimited Store Locations',
        'Central Warehouse Management',
        'Dedicated Database Instance',
        'Priority 24/7 Phone & SLA Support',
        'Custom ERP & Accounting Webhooks',
      ],
    },
  ];

  for (const plan of DEFAULT_PLANS) {
    await prisma.subscriptionPlanTier.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        description: plan.description,
        badge: plan.badge,
        monthlyPriceGbp: plan.monthlyPriceGbp,
        annualPriceGbp: plan.annualPriceGbp,
        maxStores: plan.maxStores,
        maxUsers: plan.maxUsers,
        features: plan.features,
      },
      create: {
        code: plan.code,
        name: plan.name,
        description: plan.description,
        badge: plan.badge,
        monthlyPriceGbp: plan.monthlyPriceGbp,
        annualPriceGbp: plan.annualPriceGbp,
        maxStores: plan.maxStores,
        maxUsers: plan.maxUsers,
        features: plan.features,
        isActive: true,
      },
    });
  }
  console.log('✅ SubscriptionPlanTier default tiers seeded.');

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
