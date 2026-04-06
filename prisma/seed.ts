// =============================================================
// Seed de Base de Datos
// Crea admin, jefes de comunidad, jefes de calle y datos de ejemplo
// =============================================================

import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...\n');

  // --- Limpiar datos existentes ---
  await prisma.miembro.deleteMany();
  await prisma.familia.deleteMany();
  await prisma.calle.deleteMany();
  await prisma.user.deleteMany();
  await prisma.comunidad.deleteMany();
  console.log('🗑️  Base de datos limpia');

  // --- Crear usuario Administrador ---
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      name: 'Administrador Principal',
      email: 'admin@comuna.com',
      password: adminPassword,
      role: UserRole.ADMIN,
      phone: '0414-0000000',
      cedula: 'V-12345678',
    },
  });
  console.log('✅ Admin creado:', admin.email);

  // --- Crear Comunidades (Consejos Comunales) ---
  const comunidadesData = [
    { nombre: 'Consejo Comunal Barrio Unión', descripcion: 'Sector norte de Araure', sector: 'Norte' },
    { nombre: 'Consejo Comunal La Paz', descripcion: 'Sector centro de Araure', sector: 'Centro' },
    { nombre: 'Consejo Comunal Bolívar I', descripcion: 'Sector sur de Araure', sector: 'Sur' },
    { nombre: 'Consejo Comunal Simón Bolívar', descripcion: 'Urbanización principal', sector: 'Este' },
    { nombre: 'Consejo Comunal Nueva Esperanza', descripcion: 'Sector este de Araure', sector: 'Este' },
    { nombre: 'Consejo Comunal Pueblo Nuevo', descripcion: 'Sector oeste de Araure', sector: 'Oeste' },
    { nombre: 'Consejo Comunal Los Próceres', descripcion: 'Zona residencial', sector: 'Sur' },
    { nombre: 'Consejo Comunal Tricentenario', descripcion: 'Centro histórico', sector: 'Centro' },
  ];

  const comunidades = [];
  for (const com of comunidadesData) {
    const created = await prisma.comunidad.create({ data: com });
    comunidades.push(created);
    console.log(`✅ Comunidad creada: ${created.nombre}`);
  }

  // --- Crear Jefes de Comunidad (uno por comunidad) ---
  const jefesComunidadData = [
    { name: 'María González', email: 'maria.gonzalez@comuna.com', phone: '0414-1000001', cedula: 'V-10000001' },
    { name: 'José Rodríguez', email: 'jose.rodriguez@comuna.com', phone: '0424-1000002', cedula: 'V-10000002' },
    { name: 'Ana Martínez', email: 'ana.martinez@comuna.com', phone: '0412-1000003', cedula: 'V-10000003' },
    { name: 'Carlos Pérez', email: 'carlos.perez@comuna.com', phone: '0416-1000004', cedula: 'V-10000004' },
    { name: 'Rosa López', email: 'rosa.lopez@comuna.com', phone: '0414-1000005', cedula: 'V-10000005' },
    { name: 'Luis Hernández', email: 'luis.hernandez@comuna.com', phone: '0424-1000006', cedula: 'V-10000006' },
    { name: 'Carmen Díaz', email: 'carmen.diaz@comuna.com', phone: '0412-1000007', cedula: 'V-10000007' },
    { name: 'Pedro Ramírez', email: 'pedro.ramirez@comuna.com', phone: '0416-1000008', cedula: 'V-10000008' },
  ];

  const jcPassword = await bcrypt.hash('jefe123', 10);
  for (let i = 0; i < jefesComunidadData.length; i++) {
    const jc = await prisma.user.create({
      data: {
        ...jefesComunidadData[i],
        password: jcPassword,
        role: UserRole.JEFE_COMUNIDAD,
        comunidadId: comunidades[i].id,
      },
    });
    console.log(`✅ Jefe de Comunidad: ${jc.name} → ${comunidades[i].nombre}`);
  }

  // --- Crear Jefes de Calle ---
  const jefesCalleData = [
    { name: 'Juan Pérez', email: 'juan.perez@comuna.com', phone: '0424-2000001', cedula: 'V-20000001' },
    { name: 'Elena Vargas', email: 'elena.vargas@comuna.com', phone: '0414-2000002', cedula: 'V-20000002' },
    { name: 'Roberto Sánchez', email: 'roberto.sanchez@comuna.com', phone: '0412-2000003', cedula: 'V-20000003' },
    { name: 'Patricia Mendoza', email: 'patricia.mendoza@comuna.com', phone: '0416-2000004', cedula: 'V-20000004' },
    { name: 'Miguel Torres', email: 'miguel.torres@comuna.com', phone: '0424-2000005', cedula: 'V-20000005' },
    { name: 'Laura Castillo', email: 'laura.castillo@comuna.com', phone: '0414-2000006', cedula: 'V-20000006' },
  ];

  const jcallePassword = await bcrypt.hash('jefe123', 10);
  const jefesCalle = [];
  for (const jData of jefesCalleData) {
    const j = await prisma.user.create({
      data: {
        ...jData,
        password: jcallePassword,
        role: UserRole.JEFE_CALLE,
      },
    });
    jefesCalle.push(j);
    console.log(`✅ Jefe de Calle: ${j.name}`);
  }

  // --- Crear Calles para cada comunidad ---
  const callesNombres = [
    ['Calle Principal', 'Calle 1', 'Calle 2', 'Vereda La Cruz'],
    ['Calle Bolívar', 'Calle Sucre', 'Calle Miranda'],
    ['Calle Los Olivos', 'Calle Las Flores', 'Calle El Sol'],
    ['Av. Principal', 'Calle 3', 'Calle 4', 'Calle 5'],
    ['Calle Esperanza', 'Calle Nueva', 'Calle Libertad'],
    ['Calle Pueblo Nuevo', 'Calle San José', 'Vereda El Carmen'],
    ['Calle Los Próceres', 'Calle Zamora', 'Calle Páez'],
    ['Calle Tricentenaria', 'Calle Colonial', 'Calle Patrimonio'],
  ];

  let jefeCalleIndex = 0;
  for (let i = 0; i < comunidades.length; i++) {
    for (const nombreCalle of callesNombres[i]) {
      const jefeAsignado = jefeCalleIndex < jefesCalle.length ? jefesCalle[jefeCalleIndex] : null;
      await prisma.calle.create({
        data: {
          nombre: nombreCalle,
          puntoReferencia: 'Referencia de ejemplo',
          comunidadId: comunidades[i].id,
          jefeCalleId: jefeAsignado?.id || null,
        },
      });
      if (jefeAsignado) jefeCalleIndex++;
    }
  }
  console.log(`✅ Calles creadas para todas las comunidades`);

  console.log('\n🎉 Seed completado exitosamente!');
  console.log('\n📋 Credenciales:');
  console.log('   Admin:              admin@comuna.com / admin123');
  console.log('   Jefes de Comunidad: maria.gonzalez@comuna.com / jefe123 (y otros 7)');
  console.log('   Jefes de Calle:     juan.perez@comuna.com / jefe123 (y otros 5)');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
