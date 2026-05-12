import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // List all admins first
  const admins = await prisma.admin.findMany({ select: { id: true, username: true, role: true } });
  console.log('Current admins:', JSON.stringify(admins, null, 2));

  // Reset the SUPER_ADMIN's password
  const superAdmin = admins.find(a => a.role === 'SUPER_ADMIN');
  if (!superAdmin) {
    console.log('No SUPER_ADMIN found!');
    return;
  }

  const newPassword = 'Feshta@2025';
  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.admin.update({
    where: { id: superAdmin.id },
    data: { password: hashed }
  });

  console.log(`\n✅ Password reset for "${superAdmin.username}" (${superAdmin.role})`);
  console.log(`   Username: ${superAdmin.username}`);
  console.log(`   Password: ${newPassword}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
