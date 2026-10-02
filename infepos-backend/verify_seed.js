const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const perm = await prisma.permission.findUnique({ where: { code: 'dashboard.read' } });
  console.log('Permission exists:', !!perm);

  const role = await prisma.role.findFirst({ where: { code: 'OWNER' } });
  
  const rolePerm = await prisma.rolePermission.findFirst({
    where: { roleId: role.id, permissionId: perm.id }
  });
  console.log('RolePermission exists:', !!rolePerm);
  
  const allRolePerms = await prisma.rolePermission.count({
    where: { roleId: role.id, permissionId: perm.id }
  });
  console.log('RolePermission count (checking duplicates):', allRolePerms);
}
check().finally(() => process.exit(0));

