// =============================================================
// API: Medicamentos (Catálogo)
// CRUD para el catálogo de medicamentos del sistema de salud
// Solo Admin puede crear/editar/eliminar
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: Listar medicamentos
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const medicamentos = await prisma.medicamento.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        _count: { select: { registros: true } },
      },
    });
    return NextResponse.json(medicamentos);
  } catch (error) {
    console.error('Error al obtener medicamentos:', error);
    return NextResponse.json({ error: 'Error al obtener medicamentos' }, { status: 500 });
  }
}

// POST: Crear medicamento (solo Admin)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { nombre, principioActivo, presentacion, unidad, descripcion } = await req.json();
    if (!nombre || !principioActivo) {
      return NextResponse.json({ error: 'Nombre y principio activo son requeridos' }, { status: 400 });
    }

    const medicamento = await prisma.medicamento.create({
      data: {
        nombre: nombre.trim(),
        principioActivo: principioActivo.trim(),
        presentacion: presentacion || null,
        unidad: unidad || null,
        descripcion: descripcion || null,
      },
    });
    return NextResponse.json(medicamento, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un medicamento con ese nombre' }, { status: 409 });
    }
    console.error('Error al crear medicamento:', error);
    return NextResponse.json({ error: 'Error al crear medicamento' }, { status: 500 });
  }
}

// PUT: Actualizar medicamento
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id, nombre, principioActivo, presentacion, unidad, descripcion } = await req.json();
    if (!id || !nombre || !principioActivo) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const medicamento = await prisma.medicamento.update({
      where: { id },
      data: { nombre: nombre.trim(), principioActivo: principioActivo.trim(), presentacion, unidad, descripcion },
    });
    return NextResponse.json(medicamento);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un medicamento con ese nombre' }, { status: 409 });
    }
    console.error('Error al actualizar medicamento:', error);
    return NextResponse.json({ error: 'Error al actualizar medicamento' }, { status: 500 });
  }
}

// DELETE: Eliminar medicamento (solo Admin)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    await prisma.medicamento.delete({ where: { id } });
    return NextResponse.json({ message: 'Medicamento eliminado' });
  } catch (error) {
    console.error('Error al eliminar medicamento:', error);
    return NextResponse.json({ error: 'Error al eliminar. Puede tener registros asociados.' }, { status: 500 });
  }
}
