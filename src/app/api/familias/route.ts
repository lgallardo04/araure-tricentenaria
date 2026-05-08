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

/**
 * Parsea una fecha de nacimiento (string) a un objeto Date.
 * Acepta formatos: "YYYY-MM-DD", "DD/MM/YYYY", "DD-MM-YYYY", ISO 8601.
 */
function parseFechaNacimiento(fecha: string): Date | null {
  if (!fecha || !fecha.trim()) return null;
  const trimmed = fecha.trim();

  // ISO 8601 o YYYY-MM-DD
  const isoDate = new Date(trimmed);
  if (!isNaN(isoDate.getTime()) && /^\d{4}[-/]/.test(trimmed)) {
    return isoDate;
  }

  // DD/MM/YYYY o DD-MM-YYYY
  const match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) {
    const parsed = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
    if (!isNaN(parsed.getTime())) return parsed;
  }

  // Último intento genérico
  const fallback = new Date(trimmed);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Genera un identificador secuencial "S/N X" para viviendas sin número de casa.
 * Busca el máximo secuencial existente en la misma calle y asigna el siguiente.
 */
async function generarNumeroCasaSN(calleId: string, tx: typeof prisma): Promise<string> {
  const viviendas = await tx.vivienda.findMany({
    where: {
      numeroCasa: { startsWith: 'S/N ' },
      familias: { some: { calleId } },
    },
    select: { numeroCasa: true },
  });

  let maxSeq = 0;
  for (const v of viviendas) {
    if (v.numeroCasa) {
      const num = parseInt(v.numeroCasa.replace('S/N ', ''), 10);
      if (!isNaN(num) && num > maxSeq) maxSeq = num;
    }
  }

  return `S/N ${maxSeq + 1}`;
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
      // 1. Vivienda — crear o reutilizar si se comparte
      let numeroCasa = vivienda.numeroCasa || null;
      if (!numeroCasa || numeroCasa.trim() === '') {
        numeroCasa = await generarNumeroCasaSN(calleId, tx as unknown as typeof prisma);
      }

      const viv = await tx.vivienda.create({
        data: {
          direccion: vivienda.direccion,
          numeroCasa,
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

      // 2. Familia base — vinculada a la vivienda
      const fam = await tx.familia.create({
        data: {
          calleId,
          viviendaId: viv.id,
        },
      });

      // 3. Servicios de vivienda
      if (servicios && servicios.length > 0) {
        await tx.servicioVivienda.createMany({
          data: servicios.map((s) => ({
            viviendaId: viv.id,
            tipo: s.tipo,
            estado: s.estado,
          })),
        });
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
          fechaNacimiento: parseFechaNacimiento(jefe.fechaNacimiento),
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
          esVotante: jefe.esVotante || false,
          votaEnEscuela: jefe.votaEnEscuela || false,
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
              fechaNacimiento: parseFechaNacimiento(m.fechaNacimiento),
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
              esVotante: m.esVotante || false,
              votaEnEscuela: m.votaEnEscuela || false,
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

      // Obtener familia actual para acceder a la vivienda
      const familiaActual = await tx.familia.findUnique({
        where: { id },
        select: { viviendaId: true, calleId: true },
      });

      // Actualizar vivienda
      if (vivienda) {
        if (familiaActual?.viviendaId) {
          // Actualizar vivienda existente
          await tx.vivienda.update({
            where: { id: familiaActual.viviendaId },
            data: {
              ...(vivienda.direccion ? { direccion: vivienda.direccion } : {}),
              ...(vivienda.numeroCasa !== undefined ? { numeroCasa: vivienda.numeroCasa || null } : {}),
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
          });
        } else {
          // Crear nueva vivienda y vincular
          const efectiveCalleId = calleId || familiaActual?.calleId || '';
          let numeroCasa = vivienda.numeroCasa || null;
          if (!numeroCasa || numeroCasa.trim() === '') {
            numeroCasa = await generarNumeroCasaSN(efectiveCalleId, tx as unknown as typeof prisma);
          }

          const newViv = await tx.vivienda.create({
            data: {
              direccion: vivienda.direccion || '',
              numeroCasa,
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

          await tx.familia.update({
            where: { id },
            data: { viviendaId: newViv.id },
          });
        }
      }

      // Reemplazar servicios
      if (servicios && familiaActual?.viviendaId) {
        await tx.servicioVivienda.deleteMany({ where: { viviendaId: familiaActual.viviendaId } });
        if (servicios.length > 0) {
          await tx.servicioVivienda.createMany({
            data: servicios.map((s) => ({ viviendaId: familiaActual.viviendaId!, tipo: s.tipo, estado: s.estado })),
          });
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
            fechaNacimiento: parseFechaNacimiento(jefe.fechaNacimiento),
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
            esVotante: jefe.esVotante || false,
            votaEnEscuela: jefe.votaEnEscuela || false,
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
              fechaNacimiento: parseFechaNacimiento(m.fechaNacimiento),
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
              esVotante: m.esVotante || false,
              votaEnEscuela: m.votaEnEscuela || false,
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

    // Obtener nombre del jefe y viviendaId antes de borrar
    const familiaPreDelete = await prisma.familia.findUnique({
      where: { id },
      select: {
        viviendaId: true,
        personas: { where: { esJefe: true }, select: { nombre: true, cedula: true } },
      },
    });

    await prisma.familia.delete({ where: { id } });

    // Si la vivienda queda sin familias, eliminarla también
    if (familiaPreDelete?.viviendaId) {
      const familiasRestantes = await prisma.familia.count({
        where: { viviendaId: familiaPreDelete.viviendaId },
      });
      if (familiasRestantes === 0) {
        await prisma.vivienda.delete({ where: { id: familiaPreDelete.viviendaId } });
      }
    }

    const jefe = familiaPreDelete?.personas[0];
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
