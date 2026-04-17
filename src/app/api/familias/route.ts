// =============================================================
// API: Familias
// CRUD para familias censadas (formulario expandido con campos obligatorios)
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { familiaCreateSchema, familiaUpdateSchema } from '@/lib/validations/familia';
import { buildFamiliaListWhere } from '@/lib/familia-list-scope';
import { sendAdminNotification } from '@/lib/email';

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

// GET: Listar familias (con filtros)
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
      include: {
        calle: {
          select: {
            id: true,
            nombre: true,
            comunidad: { select: { id: true, nombre: true } },
          },
        },
        miembros: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(familias);
  } catch (error) {
    console.error('Error al obtener familias:', error);
    return NextResponse.json({ error: 'Error al obtener familias' }, { status: 500 });
  }
}

// POST: Crear familia con miembros (censo completo)
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
    const body = parsed.data;
    const {
      calleId, direccion, tipoVivienda, tenencia, materialConstruccion,
      cantidadHabitaciones, cantidadBanos, observaciones,
      servicioAgua, servicioElectricidad, servicioGas, servicioInternet,
      servicioAseo, servicioTelefono,
      carnetPatria, codigoCarnetPatria, recibeClap, otrosBeneficios,
      ingresoFamiliar,
      jfNombre, jfCedula, jfNacionalidad, jfFechaNac, jfGenero, jfEstadoCivil,
      jfTelefono, jfEmail, jfEscolaridad, jfOcupacion, jfLugarTrabajo,
      jfPensionado, jfDiscapacidad, jfTipoDiscapacidad, jfEnfermedad,
      jfEmbarazada, jfLactancia,
      miembros,
    } = body;

    // Verificar acceso: Jefes de Calle solo pueden censar en sus calles asignadas
    const role = session.user.role;
    if (role === 'JEFE_CALLE') {
      const calle = await prisma.calle.findUnique({ where: { id: calleId } });
      if (!calle || calle.jefeCalleId !== session.user.id) {
        return NextResponse.json({ error: 'No tiene acceso a esta calle' }, { status: 403 });
      }
    }

    // Jefe de Comunidad solo puede censar en calles de su comunidad
    if (role === 'JEFE_COMUNIDAD') {
      const calle = await prisma.calle.findUnique({ where: { id: calleId } });
      if (!calle || calle.comunidadId !== session.user.comunidadId) {
        return NextResponse.json({ error: 'No tiene acceso a esta calle' }, { status: 403 });
      }
    }

    // Crear familia con miembros en una transacción
    const familia = await prisma.familia.create({
      data: {
        calleId, direccion, tipoVivienda, tenencia, materialConstruccion,
        cantidadHabitaciones: cantidadHabitaciones
          ? parseInt(String(cantidadHabitaciones), 10)
          : null,
        cantidadBanos: cantidadBanos ? parseInt(String(cantidadBanos), 10) : null,
        observaciones,
        servicioAgua, servicioElectricidad, servicioGas, servicioInternet,
        servicioAseo, servicioTelefono,
        carnetPatria: carnetPatria || false,
        codigoCarnetPatria,
        recibeClap: recibeClap || false,
        otrosBeneficios,
        ingresoFamiliar,
        jfNombre, jfCedula, jfNacionalidad: jfNacionalidad || 'V',
        jfFechaNac, jfGenero, jfEstadoCivil,
        jfTelefono, jfEmail, jfEscolaridad, jfOcupacion, jfLugarTrabajo,
        jfPensionado: jfPensionado || false,
        jfDiscapacidad: jfDiscapacidad || false,
        jfTipoDiscapacidad,
        jfEnfermedad,
        jfEmbarazada: jfEmbarazada || false,
        jfLactancia: jfLactancia || false,
        miembros: miembros && miembros.length > 0
          ? {
              create: miembros.filter((m: any) => m.nombre?.trim()).map((m: any) => ({
                nombre: m.nombre,
                cedula: m.cedula || null,
                nacionalidad: m.nacionalidad || 'V',
                fechaNacimiento: m.fechaNacimiento,
                genero: m.genero,
                parentesco: m.parentesco,
                estadoCivil: m.estadoCivil || null,
                escolaridad: m.escolaridad || null,
                ocupacion: m.ocupacion || null,
                lugarTrabajo: m.lugarTrabajo || null,
                salud: m.salud || null,
                pensionado: m.pensionado || false,
                discapacidad: m.discapacidad || false,
                tipoDiscapacidad: m.tipoDiscapacidad || null,
                embarazada: m.embarazada || false,
                lactancia: m.lactancia || false,
              })),
            }
          : undefined,
      },
      include: { miembros: true },
    });

    // Enviar alerta al Admin (Fire and forget, no interrumpe envío de respuesta)
    sendAdminNotification({
      actionType: 'Nueva Familia Censada (Pendiente de Aprobación)',
      details: `El usuario <b>${session.user.name}</b> (Rol: ${role}) acaba de ingresar al sistema el censo de la familia de <b>${jfNombre}</b> (Cédula: <b>${jfCedula}</b>).`
    }).catch(e => console.error("Fallo enviando correo: ", e));

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
    const body = parsed.data;
    const { id, miembros, cantidadHabitaciones, cantidadBanos, ...familiaData } = body;

    // Parse numbers
    if (cantidadHabitaciones !== undefined) {
      (familiaData as Record<string, unknown>).cantidadHabitaciones = cantidadHabitaciones
        ? parseInt(String(cantidadHabitaciones), 10)
        : null;
    }
    if (cantidadBanos !== undefined) {
      (familiaData as Record<string, unknown>).cantidadBanos = cantidadBanos
        ? parseInt(String(cantidadBanos), 10)
        : null;
    }

    const denied = await assertFamiliaAccess(session, id);
    if (denied) return denied;

    // Actualizar datos de la familia e invalidar aprobación
    const familia = await prisma.familia.update({
      where: { id },
      data: {
        ...(familiaData as any),
        estado: 'PENDIENTE' // Revertir al estado de revisión
      },
    });

    // Si se enviaron miembros, reemplazar todos
    if (miembros) {
      await prisma.miembro.deleteMany({ where: { familiaId: id } });
      if (miembros.length > 0) {
        await prisma.miembro.createMany({
          data: miembros.filter((m: any) => m.nombre?.trim()).map((m: any) => ({
            familiaId: id,
            nombre: m.nombre,
            cedula: m.cedula || null,
            nacionalidad: m.nacionalidad || 'V',
            fechaNacimiento: m.fechaNacimiento,
            genero: m.genero,
            parentesco: m.parentesco,
            estadoCivil: m.estadoCivil || null,
            escolaridad: m.escolaridad || null,
            ocupacion: m.ocupacion || null,
            lugarTrabajo: m.lugarTrabajo || null,
            salud: m.salud || null,
            pensionado: m.pensionado || false,
            discapacidad: m.discapacidad || false,
            tipoDiscapacidad: m.tipoDiscapacidad || null,
            embarazada: m.embarazada || false,
            lactancia: m.lactancia || false,
          })),
        });
      }
    }

    // Notificar alerta de modificación
    sendAdminNotification({
      actionType: 'Actualización y Auditoría Censal (Pendiente de Aprobación)',
      details: `El usuario <b>${session.user.name}</b> (Rol: ${session.user.role}) acaba de ingresar o modificar información (incluidos miembros) para la familia con Cédula del Jefe: <b>${familia.jfCedula}</b>. El registro ha vuelto al estado pendiente de revisión.`
    }).catch(e => console.error("Fallo enviando correo: ", e));

    return NextResponse.json(familia);
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

    const familiaAEliminar = await prisma.familia.delete({ where: { id } });

    sendAdminNotification({
      actionType: 'Expulsión o Eliminación de Familia',
      details: `El usuario <b>${session.user.name}</b> (Rol: ${session.user.role}) ha borrado la plantilla del registro censal de <b>${familiaAEliminar.jfNombre}</b> (Cédula: ${familiaAEliminar.jfCedula}).`
    }).catch(e => console.error("Fallo enviando correo: ", e));

    return NextResponse.json({ message: 'Familia eliminada' });
  } catch (error) {
    console.error('Error al eliminar familia:', error);
    return NextResponse.json({ error: 'Error al eliminar familia' }, { status: 500 });
  }
}
