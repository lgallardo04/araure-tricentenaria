// =============================================================
// Seed de Base de Datos — Producción Limpia
// Deja únicamente el usuario Administrador Principal (ajimenezm08@gmail.com)
// Sin comunidades, calles ni otros usuarios de prueba.
// =============================================================

import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Limpiando la base de datos para producción...\n');

  // --- Limpiar absolutamente todos los datos existentes ---
  await prisma.registroSalud.deleteMany();
  await prisma.servicioVivienda.deleteMany();
  await prisma.persona.deleteMany();
  await prisma.programaSocial.deleteMany();
  await prisma.vivienda.deleteMany();
  await prisma.familia.deleteMany();
  await prisma.calle.deleteMany();
  await prisma.user.deleteMany();
  await prisma.comunidad.deleteMany();
  console.log('🗑️  Base de datos completamente vaciada');

  // --- Crear ÚNICAMENTE el Administrador Principal ---
  const adminPassword = await bcrypt.hash('admin123', 10);
  const mainAdmin = await prisma.user.create({
    data: {
      name: 'Administrador Principal',
      email: 'ajimenezm08@gmail.com',
      password: adminPassword,
      role: UserRole.ADMIN,
      phone: '0414-0000000',
      cedula: 'V-12345678',
    },
  });

  console.log(`✅ Administrador Principal creado: ${mainAdmin.email}`);
  console.log('\n🎉 Base de datos limpia y lista para entregar!');
  console.log('\n📋 Credenciales del Administrador:');
  console.log('   Email:      ajimenezm08@gmail.com');
  console.log('   Password:   admin123');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
