const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function main() {
  const prisma = new PrismaClient();
  
  console.log('Seeding demo tenant, role, and user...');
  
  let tenant = await prisma.tenant.findUnique({ where: { code: 'DEMO' } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'Demo Business',
        code: 'DEMO',
        email: 'demo@business.com',
        status: 'ACTIVE',
      },
    });
  }

  let role = await prisma.role.findFirst({ where: { code: 'OWNER', tenantId: tenant.id } });
  if (!role) {
    role = await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: 'Owner',
        code: 'OWNER',
        description: 'System Owner',
      },
    });
  }

  const passwordHash = await bcrypt.hash('Admin@123', 12);

  let user = await prisma.user.findFirst({ where: { email: 'owner@demo.com', tenantId: tenant.id } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        roleId: role.id,
        firstName: 'System',
        lastName: 'Owner',
        email: 'owner@demo.com',
        passwordHash,
        status: 'ACTIVE',
      },
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
  }

  console.log('Seed user created successfully:', user.email);

  await prisma.$disconnect();
}

main().catch(console.error);
