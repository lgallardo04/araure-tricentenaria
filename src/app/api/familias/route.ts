// =============================================================
// API: Familias
// CRUD para familias censadas (formulario expandido con campos obligatorios)
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET: Listar familias (con filtros)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const calleId = searchParams.get('calleId');
    const comunidadId = searchParams.get('comunidadId');
    const search = searchParams.get('search');

    const where: any = {};
    if (calleId) where.calleId = calleId;
    if (comunidadId) where.calle = { comunidadId };

    // Jefe de Comunidad solo ve familias de su comunidad
    const role = (session?.user as any)?.role;
    const userComunidadId = (session?.user as any)?.comunidadId;
    if (role === 'JEFE_COMUNIDAD' && userComunidadId && !calleId) {
      where.calle = { comunidadId: userComunidadId };
    }

    // Búsqueda por nombre o cédula del jefe de familia
    if (search) {
      where.OR = [
        { jfNombre: { contains: search, mode: 'insensitive' } },
        { jfCedula: { contains: search, mode: 'insensitive' } },
        { direccion: { contains: search, mode: 'insensitive' } },
      ];
    }

    const familias = await prisma.familia.findMany({
      where,
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

    const body = await req.json();
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

    // Validaciones de campos obligatorios
    const errores: string[] = [];
    if (!calleId) errores.push('Calle');
    if (!direccion) errores.push('Dirección');
    if (!tipoVivienda) errores.push('Tipo de vivienda');
    if (!tenencia) errores.push('Tenencia');
    if (!jfNombre) errores.push('Nombre del jefe de familia');
    if (!jfCedula) errores.push('Cédula del jefe de familia');
    if (!jfFechaNac) errores.push('Fecha de nacimiento del jefe');
    if (!jfGenero) errores.push('Género del jefe de familia');
    if (!jfNacionalidad) errores.push('Nacionalidad del jefe');

    if (errores.length > 0) {
      return NextResponse.json(
        { error: `Campos obligatorios faltantes: ${errores.join(', ')}` },
        { status: 400 }
      );
    }

    // Verificar acceso: Jefes de Calle solo pueden censar en sus calles asignadas
    const role = (session.user as any).role;
    if (role === 'JEFE_CALLE') {
      const calle = await prisma.calle.findUnique({ where: { id: calleId } });
      if (!calle || calle.jefeCalleId !== (session.user as any).id) {
        return NextResponse.json({ error: 'No tiene acceso a esta calle' }, { status: 403 });
      }
    }

    // Jefe de Comunidad solo puede censar en calles de su comunidad
    if (role === 'JEFE_COMUNIDAD') {
      const calle = await prisma.calle.findUnique({ where: { id: calleId } });
      if (!calle || calle.comunidadId !== (session.user as any).comunidadId) {
        return NextResponse.json({ error: 'No tiene acceso a esta calle' }, { status: 403 });
      }
    }

    // Crear familia con miembros en una transacción
    const familia = await prisma.familia.create({
      data: {
        calleId, direccion, tipoVivienda, tenencia, materialConstruccion,
        cantidadHabitaciones: cantidadHabitaciones ? parseInt(cantidadHabitaciones) : null,
        cantidadBanos: cantidadBanos ? parseInt(cantidadBanos) : null,
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

    const body = await req.json();
    const { id, miembros, cantidadHabitaciones, cantidadBanos, ...familiaData } = body;

    // Parse numbers
    if (cantidadHabitaciones !== undefined) {
      familiaData.cantidadHabitaciones = cantidadHabitaciones ? parseInt(cantidadHabitaciones) : null;
    }
    if (cantidadBanos !== undefined) {
      familiaData.cantidadBanos = cantidadBanos ? parseInt(cantidadBanos) : null;
    }

    // Actualizar datos de la familia
    const familia = await prisma.familia.update({
      where: { id },
      data: familiaData,
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

    await prisma.familia.delete({ where: { id } });
    return NextResponse.json({ message: 'Familia eliminada' });
  } catch (error) {
    console.error('Error al eliminar familia:', error);
    return NextResponse.json({ error: 'Error al eliminar familia' }, { status: 500 });
  }
}
