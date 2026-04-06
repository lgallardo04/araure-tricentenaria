// =============================================================
// API: Calles
// CRUD para calles/sectores/veredas
// Admin: acceso total. Jefe Comunidad: calles de su comunidad.
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { calleCreateSchema, calleUpdateSchema } from '@/lib/validations/calle-comunidad';

// GET: Listar calles (con filtros opcionales)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const comunidadId = searchParams.get('comunidadId');
    const jefeCalleId = searchParams.get('jefeCalleId');

    const where: any = {};
    const role = session.user.role;
    const userComunidadId = session.user.comunidadId;
    const userId = session.user.id;

    if (role === 'JEFE_CALLE') {
      where.jefeCalleId = userId;
    } else {
      if (comunidadId) where.comunidadId = comunidadId;
      if (jefeCalleId) where.jefeCalleId = jefeCalleId;
      if (role === 'JEFE_COMUNIDAD' && userComunidadId) {
        if (comunidadId && comunidadId !== userComunidadId) {
          return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }
        where.comunidadId = userComunidadId;
      }
    }

    const calles = await prisma.calle.findMany({
      where,
      include: {
        comunidad: { select: { id: true, nombre: true } },
        jefeCalle: { select: { id: true, name: true, email: true } },
        _count: { select: { familias: true } },
      },
      orderBy: { nombre: 'asc' },
    });

    return NextResponse.json(calles);
  } catch (error) {
    console.error('Error al obtener calles:', error);
    return NextResponse.json({ error: 'Error al obtener calles' }, { status: 500 });
  }
}

// POST: Crear nueva calle (Admin o Jefe de Comunidad de esa comunidad)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const role = session.user.role;
    const userComunidadId = session.user.comunidadId;

    const raw = await req.json();
    const parsed = calleCreateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { nombre, avenida, puntoReferencia, comunidadId, jefeCalleId } = parsed.data;

    // Jefe de Comunidad solo puede crear calles en su comunidad
    if (role === 'JEFE_COMUNIDAD' && comunidadId !== userComunidadId) {
      return NextResponse.json({ error: 'Solo puede crear calles en su comunidad' }, { status: 403 });
    }

    if (role !== 'ADMIN' && role !== 'JEFE_COMUNIDAD') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const calle = await prisma.calle.create({
      data: { nombre, avenida, puntoReferencia, comunidadId, jefeCalleId },
    });

    return NextResponse.json(calle, { status: 201 });
  } catch (error) {
    console.error('Error al crear calle:', error);
    return NextResponse.json({ error: 'Error al crear calle' }, { status: 500 });
  }
}

// PUT: Actualizar calle (Admin o Jefe de Comunidad)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const role = session.user.role;
    const userComunidadId = session.user.comunidadId;

    const raw = await req.json();
    const parsed = calleUpdateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { id, nombre, avenida, puntoReferencia, comunidadId, jefeCalleId } = parsed.data;

    // Verificar acceso del Jefe de Comunidad
    if (role === 'JEFE_COMUNIDAD') {
      const calle = await prisma.calle.findUnique({ where: { id } });
      if (!calle || calle.comunidadId !== userComunidadId) {
        return NextResponse.json({ error: 'No tiene acceso a esta calle' }, { status: 403 });
      }
    }

    if (role !== 'ADMIN' && role !== 'JEFE_COMUNIDAD') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const calle = await prisma.calle.update({
      where: { id },
      data: { nombre, avenida, puntoReferencia, comunidadId, jefeCalleId },
    });

    return NextResponse.json(calle);
  } catch (error) {
    console.error('Error al actualizar calle:', error);
    return NextResponse.json({ error: 'Error al actualizar calle' }, { status: 500 });
  }
}

// DELETE: Eliminar calle (solo Admin)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    await prisma.calle.delete({ where: { id } });
    return NextResponse.json({ message: 'Calle eliminada' });
  } catch (error) {
    console.error('Error al eliminar calle:', error);
    return NextResponse.json({ error: 'Error al eliminar calle' }, { status: 500 });
  }
}
