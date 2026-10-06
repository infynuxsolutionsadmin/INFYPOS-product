const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt'); // Or whatever the backend uses. Wait, it uses PasswordService.
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { pinCode: null } // Users that don't have a plain PIN yet
  });
  
  console.log(`Found ${users.length} users missing plain text pinCode.`);
  
  for (const user of users) {
    // Only generate PIN if they have a pinCodeHash, meaning they had a PIN before
    if (user.pinCodeHash) {
      const newPin = Math.floor(1000 + Math.random() * 9000).toString();
      // Wait, we need to hash it exactly like PasswordService. 
      // PasswordService uses bcrypt.hash(password, 10).
      const newHash = await bcrypt.hash(newPin, 10);
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          pinCode: newPin,
          pinCodeHash: newHash
        }
      });
      console.log(`Updated user ${user.firstName} ${user.lastName} with new PIN: ${newPin}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
