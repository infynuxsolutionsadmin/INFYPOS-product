import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = 'password123';
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);

  // Check if tenant exists, otherwise create
  let tenant = await prisma.tenant.findUnique({
    where: { code: 'SYNC-TEST' },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'Sync Test Tenant',
        code: 'SYNC-TEST',
        status: 'ACTIVE',
      },
    });
  }

  // Check if role exists
  let role = await prisma.role.findFirst({
    where: { tenantId: tenant.id, code: 'OWNER' },
  });

  if (!role) {
    role = await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: 'Owner',
        code: 'OWNER',
        isSystem: true,
        status: 'ACTIVE',
      },
    });
  }

  // Create or update user
  const email = 'naveen@gmail.com';
  
  let user = await prisma.user.findFirst({
    where: { email, tenantId: tenant.id }
  });

  if (!user) {
    user = await prisma.user.create({
        data: {
            firstName: 'Naveen',
            lastName: 'User',
            email: email,
            passwordHash: hash,
            tenantId: tenant.id,
            roleId: role.id,
            status: 'ACTIVE',
          },
    });
  } else {
    user = await prisma.user.update({
        where: { id: user.id },
        data: {
            passwordHash: hash
        }
    })
  }

  console.log('Seeded User:');
  console.log(`Tenant Code: ${tenant.code}`);
  console.log(`Email: ${user.email}`);
  console.log(`Password: ${password}`);

  // --- Seed Master Admin ---
  const masterTenantCode = 'infynux';
  const masterEmail = 'system@admin.com';
  
  let masterTenant = await prisma.tenant.findUnique({
    where: { code: masterTenantCode },
  });

  if (!masterTenant) {
    masterTenant = await prisma.tenant.create({
      data: {
        name: 'Infynux Master Admin',
        code: masterTenantCode,
        status: 'ACTIVE',
      },
    });
  }

  let superAdminRole = await prisma.role.findFirst({
    where: { tenantId: masterTenant.id, code: 'SUPER_ADMIN' },
  });

  if (!superAdminRole) {
    superAdminRole = await prisma.role.create({
      data: {
        tenantId: masterTenant.id,
        name: 'Super Admin',
        code: 'SUPER_ADMIN',
        isSystem: true,
        status: 'ACTIVE',
      },
    });
  }

  let masterUser = await prisma.user.findFirst({
    where: { email: masterEmail, tenantId: masterTenant.id }
  });

  if (!masterUser) {
    masterUser = await prisma.user.create({
        data: {
            firstName: 'System',
            lastName: 'Admin',
            email: masterEmail,
            passwordHash: hash,
            tenantId: masterTenant.id,
            roleId: superAdminRole.id,
            status: 'ACTIVE',
          },
    });
  } else {
    masterUser = await prisma.user.update({
        where: { id: masterUser.id },
        data: {
            passwordHash: hash
        }
    })
  }

  console.log('\\nSeeded Master Admin:');
  console.log(`Tenant Code: ${masterTenant.code}`);
  console.log(`Email: ${masterUser.email}`);
  console.log(`Password: ${password}`);

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
