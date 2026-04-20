// =============================================================
// API: Familias
// CRUD normalizado — Vivienda, Personas, Servicios, Programas
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { familiaCreateSchema, familiaUpdateSchema } from '@/lib/validations/familia';
import { buildFamiliaListWhere } from '@/lib/familia-list-scope';
import { sendAdminNotification } from '@/lib/email';

// Includes reutilizables para las queries
const familiaFullInclude = {
  calle: {
    select: {
      id: true,
      nombre: true,
      comunidad: { select: { id: true, nombre: true } },
    },
  },
  vivienda: {
    include: { servicios: true },
  },
  programaSocial: true,
  personas: { orderBy: [{ esJefe: 'desc' as const }, { createdAt: 'asc' as const }] },
};

async function assertFamiliaAccess(session: Session, familiaId: string) {
  const familia = await prisma.familia.findUnique({
    where: { id: familiaId },
    include: { calle: { select: { id: true, comunidadId: true, jefeCalleId: true } } },
  });
  if (!familia) {
    return NextResponse.json({ error: 'Familia no encontrada' }, { status: 404 });
  }
  const role = session.user.role;
  const userId = session.user.id;
  const userComunidadId = session.user.comunidadId;
  if (role === 'ADMIN') return null;
  if (role === 'JEFE_COMUNIDAD') {
    if (!userComunidadId || familia.calle.comunidadId !== userComunidadId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    return null;
  }
  if (role === 'JEFE_CALLE') {
    if (familia.calle.jefeCalleId !== userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    return null;
  }
  return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
}

// GET: Listar familias
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const { where, error } = await buildFamiliaListWhere(session, {
      calleId: searchParams.get('calleId'),
      comunidadId: searchParams.get('comunidadId'),
      search: searchParams.get('search'),
    });
    if (error) return error;

    const familias = await prisma.familia.findMany({
      where,
      take: 200,
      include: familiaFullInclude,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(familias);
  } catch (error) {
    console.error('Error al obtener familias:', error);
    return NextResponse.json({ error: 'Error al obtener familias' }, { status: 500 });
  }
}

// POST: Crear familia (censo completo, normalizado)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const raw = await req.json();
    const parsed = familiaCreateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { calleId, vivienda, servicios, programaSocial, jefe, miembros } = parsed.data;

    // Verificar acceso
    const role = session.user.role;
    if (role === 'JEFE_CALLE') {
      const calle = await prisma.calle.findUnique({ where: { id: calleId } });
      if (!calle || calle.jefeCalleId !== session.user.id) {
        return NextResponse.json({ error: 'No tiene acceso a esta calle' }, { status: 403 });
      }
    }
    if (role === 'JEFE_COMUNIDAD') {
      const calle = await prisma.calle.findUnique({ where: { id: calleId } });
      if (!calle || calle.comunidadId !== session.user.comunidadId) {
        return NextResponse.json({ error: 'No tiene acceso a esta calle' }, { status: 403 });
      }
    }

    // Transacción atómica para crear todo
    const familia = await prisma.$transaction(async (tx) => {
      // 1. Familia base
      const fam = await tx.familia.create({
        data: { calleId },
      });

      // 2. Vivienda
      await tx.vivienda.create({
        data: {
          familiaId: fam.id,
          direccion: vivienda.direccion,
          tipo: vivienda.tipo,
          tenencia: vivienda.tenencia,
          materialConstruccion: vivienda.materialConstruccion || null,
          cantidadHabitaciones: vivienda.cantidadHabitaciones
            ? parseInt(String(vivienda.cantidadHabitaciones), 10)
            : null,
          cantidadBanos: vivienda.cantidadBanos
            ? parseInt(String(vivienda.cantidadBanos), 10)
            : null,
          observaciones: vivienda.observaciones || null,
        },
      });

      // 3. Servicios de vivienda
      if (servicios && servicios.length > 0) {
        const viv = await tx.vivienda.findUnique({ where: { familiaId: fam.id } });
        if (viv) {
          await tx.servicioVivienda.createMany({
            data: servicios.map((s) => ({
              viviendaId: viv.id,
              tipo: s.tipo,
              estado: s.estado,
            })),
          });
        }
      }

      // 4. Programas sociales
      if (programaSocial) {
        await tx.programaSocial.create({
          data: {
            familiaId: fam.id,
            carnetPatria: programaSocial.carnetPatria || false,
            codigoCarnetPatria: programaSocial.codigoCarnetPatria || null,
            recibeClap: programaSocial.recibeClap || false,
            otrosBeneficios: programaSocial.otrosBeneficios || null,
            ingresoFamiliar: programaSocial.ingresoFamiliar || null,
          },
        });
      }

      // 5. Jefe de familia
      await tx.persona.create({
        data: {
          familiaId: fam.id,
          esJefe: true,
          nombre: jefe.nombre,
          cedula: jefe.cedula || null,
          nacionalidad: jefe.nacionalidad || 'V',
          fechaNacimiento: jefe.fechaNacimiento,
          genero: jefe.genero,
          parentesco: null,
          estadoCivil: jefe.estadoCivil || null,
          telefono: jefe.telefono || null,
          email: jefe.email || null,
          escolaridad: jefe.escolaridad || null,
          ocupacion: jefe.ocupacion || null,
          lugarTrabajo: jefe.lugarTrabajo || null,
          enfermedad: jefe.enfermedad || null,
          pensionado: jefe.pensionado || false,
          discapacidad: jefe.discapacidad || false,
          tipoDiscapacidad: jefe.tipoDiscapacidad || null,
          embarazada: jefe.embarazada || false,
          lactancia: jefe.lactancia || false,
        },
      });

      // 6. Miembros adicionales
      if (miembros && miembros.length > 0) {
        const validMembers = miembros.filter((m) => m.nombre?.trim());
        if (validMembers.length > 0) {
          await tx.persona.createMany({
            data: validMembers.map((m) => ({
              familiaId: fam.id,
              esJefe: false,
              nombre: m.nombre,
              cedula: m.cedula || null,
              nacionalidad: m.nacionalidad || 'V',
              fechaNacimiento: m.fechaNacimiento,
              genero: m.genero,
              parentesco: m.parentesco || null,
              estadoCivil: m.estadoCivil || null,
              telefono: m.telefono || null,
              email: m.email || null,
              escolaridad: m.escolaridad || null,
              ocupacion: m.ocupacion || null,
              lugarTrabajo: m.lugarTrabajo || null,
              enfermedad: null,
              pensionado: m.pensionado || false,
              discapacidad: m.discapacidad || false,
              tipoDiscapacidad: m.tipoDiscapacidad || null,
              embarazada: m.embarazada || false,
              lactancia: m.lactancia || false,
            })),
          });
        }
      }

      // Retornar familia completa
      return tx.familia.findUnique({
        where: { id: fam.id },
        include: familiaFullInclude,
      });
    });

    // Notificación al admin (fire-and-forget)
    const jefePersona = familia?.personas.find((p) => p.esJefe);
    sendAdminNotification({
      actionType: 'Nueva Familia Censada (Pendiente de Aprobación)',
      details: `El usuario <b>${session.user.name}</b> (Rol: ${role}) acaba de ingresar al sistema el censo de la familia de <b>${jefePersona?.nombre ?? '—'}</b> (Cédula: <b>${jefePersona?.cedula ?? '—'}</b>).`,
    }).catch((e) => console.error('Fallo enviando correo: ', e));

    return NextResponse.json(familia, { status: 201 });
  } catch (error) {
    console.error('Error al crear familia:', error);
    return NextResponse.json({ error: 'Error al crear familia' }, { status: 500 });
  }
}

// PUT: Actualizar familia
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const raw = await req.json();
    const parsed = familiaUpdateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { id, calleId, vivienda, servicios, programaSocial, jefe, miembros } = parsed.data;

    const denied = await assertFamiliaAccess(session, id);
    if (denied) return denied;

    await prisma.$transaction(async (tx) => {
      // Actualizar calle y estado
      await tx.familia.update({
        where: { id },
        data: {
          ...(calleId ? { calleId } : {}),
          estado: 'PENDIENTE',
        },
      });

      // Actualizar vivienda
      if (vivienda) {
        await tx.vivienda.upsert({
          where: { familiaId: id },
          update: {
            ...(vivienda.direccion ? { direccion: vivienda.direccion } : {}),
            ...(vivienda.tipo ? { tipo: vivienda.tipo } : {}),
            ...(vivienda.tenencia ? { tenencia: vivienda.tenencia } : {}),
            materialConstruccion: vivienda.materialConstruccion ?? undefined,
            cantidadHabitaciones: vivienda.cantidadHabitaciones !== undefined
              ? vivienda.cantidadHabitaciones ? parseInt(String(vivienda.cantidadHabitaciones), 10) : null
              : undefined,
            cantidadBanos: vivienda.cantidadBanos !== undefined
              ? vivienda.cantidadBanos ? parseInt(String(vivienda.cantidadBanos), 10) : null
              : undefined,
            observaciones: vivienda.observaciones ?? undefined,
          },
          create: {
            familiaId: id,
            direccion: vivienda.direccion || '',
            tipo: vivienda.tipo || '',
            tenencia: vivienda.tenencia || '',
            materialConstruccion: vivienda.materialConstruccion || null,
            cantidadHabitaciones: vivienda.cantidadHabitaciones
              ? parseInt(String(vivienda.cantidadHabitaciones), 10) : null,
            cantidadBanos: vivienda.cantidadBanos
              ? parseInt(String(vivienda.cantidadBanos), 10) : null,
            observaciones: vivienda.observaciones || null,
          },
        });
      }

      // Reemplazar servicios
      if (servicios) {
        const viv = await tx.vivienda.findUnique({ where: { familiaId: id } });
        if (viv) {
          await tx.servicioVivienda.deleteMany({ where: { viviendaId: viv.id } });
          if (servicios.length > 0) {
            await tx.servicioVivienda.createMany({
              data: servicios.map((s) => ({ viviendaId: viv.id, tipo: s.tipo, estado: s.estado })),
            });
          }
        }
      }

      // Actualizar programas sociales
      if (programaSocial) {
        await tx.programaSocial.upsert({
          where: { familiaId: id },
          update: {
            carnetPatria: programaSocial.carnetPatria ?? false,
            codigoCarnetPatria: programaSocial.codigoCarnetPatria || null,
            recibeClap: programaSocial.recibeClap ?? false,
            otrosBeneficios: programaSocial.otrosBeneficios || null,
            ingresoFamiliar: programaSocial.ingresoFamiliar || null,
          },
          create: {
            familiaId: id,
            carnetPatria: programaSocial.carnetPatria ?? false,
            codigoCarnetPatria: programaSocial.codigoCarnetPatria || null,
            recibeClap: programaSocial.recibeClap ?? false,
            otrosBeneficios: programaSocial.otrosBeneficios || null,
            ingresoFamiliar: programaSocial.ingresoFamiliar || null,
          },
        });
      }

      // Reemplazar jefe
      if (jefe) {
        await tx.persona.deleteMany({ where: { familiaId: id, esJefe: true } });
        await tx.persona.create({
          data: {
            familiaId: id,
            esJefe: true,
            nombre: jefe.nombre,
            cedula: jefe.cedula || null,
            nacionalidad: jefe.nacionalidad || 'V',
            fechaNacimiento: jefe.fechaNacimiento,
            genero: jefe.genero,
            parentesco: null,
            estadoCivil: jefe.estadoCivil || null,
            telefono: jefe.telefono || null,
            email: jefe.email || null,
            escolaridad: jefe.escolaridad || null,
            ocupacion: jefe.ocupacion || null,
            lugarTrabajo: jefe.lugarTrabajo || null,
            enfermedad: jefe.enfermedad || null,
            pensionado: jefe.pensionado || false,
            discapacidad: jefe.discapacidad || false,
            tipoDiscapacidad: jefe.tipoDiscapacidad || null,
            embarazada: jefe.embarazada || false,
            lactancia: jefe.lactancia || false,
          },
        });
      }

      // Reemplazar miembros
      if (miembros) {
        await tx.persona.deleteMany({ where: { familiaId: id, esJefe: false } });
        const validMembers = miembros.filter((m) => m.nombre?.trim());
        if (validMembers.length > 0) {
          await tx.persona.createMany({
            data: validMembers.map((m) => ({
              familiaId: id,
              esJefe: false,
              nombre: m.nombre,
              cedula: m.cedula || null,
              nacionalidad: m.nacionalidad || 'V',
              fechaNacimiento: m.fechaNacimiento,
              genero: m.genero,
              parentesco: m.parentesco || null,
              estadoCivil: m.estadoCivil || null,
              telefono: m.telefono || null,
              email: m.email || null,
              escolaridad: m.escolaridad || null,
              ocupacion: m.ocupacion || null,
              lugarTrabajo: m.lugarTrabajo || null,
              enfermedad: null,
              pensionado: m.pensionado || false,
              discapacidad: m.discapacidad || false,
              tipoDiscapacidad: m.tipoDiscapacidad || null,
              embarazada: m.embarazada || false,
              lactancia: m.lactancia || false,
            })),
          });
        }
      }
    });

    const updated = await prisma.familia.findUnique({
      where: { id },
      include: familiaFullInclude,
    });

    const jefePersona = updated?.personas.find((p) => p.esJefe);
    sendAdminNotification({
      actionType: 'Actualización y Auditoría Censal (Pendiente de Aprobación)',
      details: `El usuario <b>${session.user.name}</b> (Rol: ${session.user.role}) modificó la familia de <b>${jefePersona?.nombre ?? '—'}</b> (Cédula: ${jefePersona?.cedula ?? '—'}). Estado: pendiente de revisión.`,
    }).catch((e) => console.error('Fallo enviando correo: ', e));

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error al actualizar familia:', error);
    return NextResponse.json({ error: 'Error al actualizar familia' }, { status: 500 });
  }
}

// DELETE: Eliminar familia
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const denied = await assertFamiliaAccess(session, id);
    if (denied) return denied;

    // Obtener nombre del jefe antes de borrar
    const jefe = await prisma.persona.findFirst({ where: { familiaId: id, esJefe: true } });

    await prisma.familia.delete({ where: { id } });

    sendAdminNotification({
      actionType: 'Expulsión o Eliminación de Familia',
      details: `El usuario <b>${session.user.name}</b> (Rol: ${session.user.role}) ha borrado el registro censal de <b>${jefe?.nombre ?? '—'}</b> (Cédula: ${jefe?.cedula ?? '—'}).`,
    }).catch((e) => console.error('Fallo enviando correo: ', e));

    return NextResponse.json({ message: 'Familia eliminada' });
  } catch (error) {
    console.error('Error al eliminar familia:', error);
    return NextResponse.json({ error: 'Error al eliminar familia' }, { status: 500 });
  }
}
