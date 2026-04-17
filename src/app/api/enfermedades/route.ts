// =============================================================
// API: Enfermedades (Catálogo)
// CRUD para el catálogo de enfermedades del sistema de salud
// Solo Admin puede crear/editar/eliminar
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: Listar enfermedades
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const enfermedades = await prisma.enfermedad.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        _count: { select: { registros: true } },
      },
    });
    return NextResponse.json(enfermedades);
  } catch (error) {
    console.error('Error al obtener enfermedades:', error);
    return NextResponse.json({ error: 'Error al obtener enfermedades' }, { status: 500 });
  }
}

// POST: Crear enfermedad (solo Admin)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { nombre, tipo, descripcion } = await req.json();
    if (!nombre || !tipo) {
      return NextResponse.json({ error: 'Nombre y tipo son requeridos' }, { status: 400 });
    }

    const enfermedad = await prisma.enfermedad.create({
      data: { nombre: nombre.trim(), tipo, descripcion: descripcion || null },
    });
    return NextResponse.json(enfermedad, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe una enfermedad con ese nombre' }, { status: 409 });
    }
    console.error('Error al crear enfermedad:', error);
    return NextResponse.json({ error: 'Error al crear enfermedad' }, { status: 500 });
  }
}

// PUT: Actualizar enfermedad
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id, nombre, tipo, descripcion } = await req.json();
    if (!id || !nombre || !tipo) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const enfermedad = await prisma.enfermedad.update({
      where: { id },
      data: { nombre: nombre.trim(), tipo, descripcion },
    });
    return NextResponse.json(enfermedad);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe una enfermedad con ese nombre' }, { status: 409 });
    }
    console.error('Error al actualizar enfermedad:', error);
    return NextResponse.json({ error: 'Error al actualizar enfermedad' }, { status: 500 });
  }
}

// DELETE: Eliminar enfermedad (solo Admin)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    await prisma.enfermedad.delete({ where: { id } });
    return NextResponse.json({ message: 'Enfermedad eliminada' });
  } catch (error) {
    console.error('Error al eliminar enfermedad:', error);
    return NextResponse.json({ error: 'Error al eliminar. Puede tener registros asociados.' }, { status: 500 });
  }
}
