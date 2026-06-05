import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Adding extra administrator accounts...');

  const adminPassword = await bcrypt.hash('admin123', 10);

  const admins = [
    {
      name: 'Administrador Auxiliar 1',
      email: 'admin2@comuna.com',
      password: adminPassword,
      role: UserRole.ADMIN,
      phone: '0414-0000002',
      cedula: 'V-12345679',
    },
    {
      name: 'Administrador Auxiliar 2',
      email: 'admin3@comuna.com',
      password: adminPassword,
      role: UserRole.ADMIN,
      phone: '0414-0000003',
      cedula: 'V-12345680',
    },
  ];

  for (const adminData of admins) {
    const existing = await prisma.user.findUnique({
      where: { email: adminData.email },
    });

    if (!existing) {
      const created = await prisma.user.create({
        data: adminData,
      });
      console.log(`✅ Admin created: ${created.email}`);
    } else {
      console.log(`ℹ️ Admin already exists: ${adminData.email}`);
    }
  }

  console.log('🎉 Done checking/adding admins.');
}

main()
  .catch((e) => {
    console.error('❌ Error adding admins:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
