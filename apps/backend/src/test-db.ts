import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating test user...');
  const user = await prisma.user.upsert({
    where: { telegramId: '12345' },
    update: {
      balance: 1000,
      firstName: 'Test User'
    },
    create: {
      telegramId: '12345',
      firstName: 'Test User',
      balance: 1000,
    },
  });
  console.log('User created/updated successfully:', user);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
