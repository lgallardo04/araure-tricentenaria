// =============================================================
// API: Comunidades
// CRUD para comunidades (consejos comunales)
// Admin: acceso total. Jefe Comunidad: solo su comunidad.
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { comunidadCreateSchema, comunidadUpdateSchema } from '@/lib/validations/calle-comunidad';

// GET: Listar comunidades con calles y jefes
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const role = session.user.role;
    const comunidadId = session.user.comunidadId;
    const userId = session.user.id;

    const where: any = {};
    if (role === 'JEFE_COMUNIDAD' && comunidadId) {
      where.id = comunidadId;
    } else if (role === 'JEFE_CALLE') {
      const calles = await prisma.calle.findMany({
        where: { jefeCalleId: userId },
        select: { comunidadId: true },
      });
      const ids = Array.from(new Set(calles.map((c) => c.comunidadId)));
      if (ids.length === 0) {
        return NextResponse.json([]);
      }
      where.id = { in: ids };
    }

    const comunidades = await prisma.comunidad.findMany({
      where,
      include: {
        calles: {
          select: { id: true, nombre: true, avenida: true, puntoReferencia: true, jefeCalleId: true },
          orderBy: { nombre: 'asc' },
        },
        jefesComunidad: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json(comunidades);
  } catch (error) {
    console.error('Error al obtener comunidades:', error);
    return NextResponse.json({ error: 'Error al obtener comunidades' }, { status: 500 });
  }
}

// POST: Crear nueva comunidad (solo Admin)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const raw = await req.json();
    const parsed = comunidadCreateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { nombre, descripcion, sector } = parsed.data;

    const comunidad = await prisma.comunidad.create({
      data: { nombre, descripcion: descripcion ?? undefined, sector: sector ?? undefined },
    });

    return NextResponse.json(comunidad, { status: 201 });
  } catch (error) {
    console.error('Error al crear comunidad:', error);
    return NextResponse.json({ error: 'Error al crear comunidad' }, { status: 500 });
  }
}

// PUT: Actualizar comunidad (Admin o Jefe de Comunidad de esa comunidad)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const role = session.user.role;
    const userComunidadId = session.user.comunidadId;

    const raw = await req.json();
    const parsed = comunidadUpdateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { id, nombre, descripcion, sector } = parsed.data;

    // Jefe de Comunidad solo puede editar su propia comunidad
    if (role === 'JEFE_COMUNIDAD' && id !== userComunidadId) {
      return NextResponse.json({ error: 'No tiene acceso a esta comunidad' }, { status: 403 });
    }

    if (role !== 'ADMIN' && role !== 'JEFE_COMUNIDAD') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const comunidad = await prisma.comunidad.update({
      where: { id },
      data: { nombre, descripcion, sector },
    });

    return NextResponse.json(comunidad);
  } catch (error) {
    console.error('Error al actualizar comunidad:', error);
    return NextResponse.json({ error: 'Error al actualizar comunidad' }, { status: 500 });
  }
}

// DELETE: Eliminar comunidad (solo Admin)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    await prisma.comunidad.delete({ where: { id } });
    return NextResponse.json({ message: 'Comunidad eliminada' });
  } catch (error) {
    console.error('Error al eliminar comunidad:', error);
    return NextResponse.json({ error: 'Error al eliminar comunidad' }, { status: 500 });
  }
}
