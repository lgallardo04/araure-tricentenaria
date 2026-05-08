// =============================================================
// API: Locales Comerciales
// CRUD para negocios/locales vinculados a calles
// Jefe de Calle: gestiona locales de sus calles
// Admin / Jefe Comunidad: acceso según permisos
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { localComercialCreateSchema, localComercialUpdateSchema } from '@/lib/validations/local-comercial';

// GET: Listar locales comerciales (filtrable por calle)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const calleId = searchParams.get('calleId');
    const comunidadId = searchParams.get('comunidadId');
    const search = searchParams.get('search');
    const role = session.user.role;

    const where: any = {};

    // Filtro por rol
    if (role === 'JEFE_CALLE') {
      // Solo locales de sus calles asignadas
      const callesAsignadas = await prisma.calle.findMany({
        where: { jefeCalleId: session.user.id },
        select: { id: true },
      });
      where.calleId = calleId
        ? calleId
        : { in: callesAsignadas.map((c) => c.id) };
    } else if (role === 'JEFE_COMUNIDAD' && session.user.comunidadId) {
      where.calle = { comunidadId: session.user.comunidadId };
      if (calleId) where.calleId = calleId;
    } else if (role === 'ADMIN') {
      if (calleId) where.calleId = calleId;
      if (comunidadId) where.calle = { comunidadId };
    }

    // Búsqueda por texto
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { propietario: { contains: search, mode: 'insensitive' } },
        { rif: { contains: search, mode: 'insensitive' } },
        { tipoNegocio: { contains: search, mode: 'insensitive' } },
      ];
    }

    const locales = await prisma.localComercial.findMany({
      where,
      include: {
        calle: {
          select: {
            id: true,
            nombre: true,
            comunidad: { select: { id: true, nombre: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return NextResponse.json(locales);
  } catch (error) {
    console.error('Error al obtener locales comerciales:', error);
    return NextResponse.json({ error: 'Error al obtener locales comerciales' }, { status: 500 });
  }
}

// POST: Crear local comercial
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const raw = await req.json();
    const parsed = localComercialCreateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { calleId, nombre, rif, propietario, telefono, tipoNegocio, direccion, observaciones } = parsed.data;
    const role = session.user.role;

    // Verificar acceso a la calle
    if (role === 'JEFE_CALLE') {
      const calle = await prisma.calle.findUnique({ where: { id: calleId } });
      if (!calle || calle.jefeCalleId !== session.user.id) {
        return NextResponse.json({ error: 'No tiene acceso a esta calle' }, { status: 403 });
      }
    } else if (role === 'JEFE_COMUNIDAD') {
      const calle = await prisma.calle.findUnique({ where: { id: calleId } });
      if (!calle || calle.comunidadId !== session.user.comunidadId) {
        return NextResponse.json({ error: 'No tiene acceso a esta calle' }, { status: 403 });
      }
    } else if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const local = await prisma.localComercial.create({
      data: {
        calleId,
        nombre,
        rif: rif || null,
        propietario: propietario || null,
        telefono: telefono || null,
        tipoNegocio,
        direccion: direccion || null,
        observaciones: observaciones || null,
      },
      include: {
        calle: {
          select: {
            id: true,
            nombre: true,
            comunidad: { select: { id: true, nombre: true } },
          },
        },
      },
    });

    return NextResponse.json(local, { status: 201 });
  } catch (error) {
    console.error('Error al crear local comercial:', error);
    return NextResponse.json({ error: 'Error al crear local comercial' }, { status: 500 });
  }
}

// PUT: Actualizar local comercial
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const raw = await req.json();
    const parsed = localComercialUpdateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { id, nombre, rif, propietario, telefono, tipoNegocio, direccion, activo, observaciones } = parsed.data;
    const role = session.user.role;

    // Verificar acceso al local
    const existingLocal = await prisma.localComercial.findUnique({
      where: { id },
      include: { calle: { select: { jefeCalleId: true, comunidadId: true } } },
    });

    if (!existingLocal) {
      return NextResponse.json({ error: 'Local no encontrado' }, { status: 404 });
    }

    if (role === 'JEFE_CALLE' && existingLocal.calle.jefeCalleId !== session.user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    if (role === 'JEFE_COMUNIDAD' && existingLocal.calle.comunidadId !== session.user.comunidadId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (nombre) updateData.nombre = nombre;
    if (rif !== undefined) updateData.rif = rif || null;
    if (propietario !== undefined) updateData.propietario = propietario || null;
    if (telefono !== undefined) updateData.telefono = telefono || null;
    if (tipoNegocio) updateData.tipoNegocio = tipoNegocio;
    if (direccion !== undefined) updateData.direccion = direccion || null;
    if (activo !== undefined) updateData.activo = activo;
    if (observaciones !== undefined) updateData.observaciones = observaciones || null;

    const local = await prisma.localComercial.update({
      where: { id },
      data: updateData,
      include: {
        calle: {
          select: {
            id: true,
            nombre: true,
            comunidad: { select: { id: true, nombre: true } },
          },
        },
      },
    });

    return NextResponse.json(local);
  } catch (error) {
    console.error('Error al actualizar local comercial:', error);
    return NextResponse.json({ error: 'Error al actualizar local comercial' }, { status: 500 });
  }
}

// DELETE: Eliminar local comercial
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const role = session.user.role;

    // Verificar acceso
    const existingLocal = await prisma.localComercial.findUnique({
      where: { id },
      include: { calle: { select: { jefeCalleId: true, comunidadId: true } } },
    });

    if (!existingLocal) {
      return NextResponse.json({ error: 'Local no encontrado' }, { status: 404 });
    }

    if (role === 'JEFE_CALLE' && existingLocal.calle.jefeCalleId !== session.user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    if (role === 'JEFE_COMUNIDAD' && existingLocal.calle.comunidadId !== session.user.comunidadId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await prisma.localComercial.delete({ where: { id } });
    return NextResponse.json({ message: 'Local comercial eliminado' });
  } catch (error) {
    console.error('Error al eliminar local comercial:', error);
    return NextResponse.json({ error: 'Error al eliminar local comercial' }, { status: 500 });
  }
}
