import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPass = await bcrypt.hash('admin123', 10);
  const userPass = await bcrypt.hash('user123', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@casino.local',
      passwordHash: adminPass,
      role: 'ADMIN',
      balance: 0,
    },
  });

  const demo = await prisma.user.upsert({
    where: { username: 'demo' },
    update: {},
    create: {
      username: 'demo',
      email: 'demo@casino.local',
      passwordHash: userPass,
      role: 'USER',
      balance: 0,
    },
  });

  console.log('Seed klaar:');
  console.log('  Admin  -> gebruikersnaam: admin  wachtwoord: admin123');
  console.log('  User   -> gebruikersnaam: demo   wachtwoord: user123');
  console.log('IDs:', { admin: admin.id, demo: demo.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
