const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.findFirst({ 
  where: { email: 'naveendseven@gmail.com' }, 
  include: { 
    role: { 
      include: { 
        permissions: { 
          include: { permission: true } 
        } 
      } 
    } 
  } 
}).then(u => { 
  if (!u) {
    console.log('User not found');
    return;
  }
  console.log('roleCode:', u.role.code); 
  console.log('tenantId:', u.tenantId); 
  console.log('permissions:', u.role.permissions.map(rp => rp.permission.code)); 
}).catch(console.error).finally(() => p.$disconnect());
