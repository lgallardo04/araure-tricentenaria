import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Solo ADMIN puede alterar o ver la lista de pendientes globalmente
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const estado = searchParams.get('estado') || 'PENDIENTE';

    const familias = await prisma.familia.findMany({
      where: { estado: estado as any },
      include: {
        calle: {
          select: {
            nombre: true,
            jefeCalle: { select: { name: true } },
            comunidad: { select: { nombre: true } },
          },
        },
        vivienda: { select: { direccion: true } },
        personas: {
          where: { esJefe: true },
          select: { nombre: true, cedula: true },
          take: 1,
        },
        _count: { select: { personas: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(familias);
  } catch (error) {
    console.error('Error GET aprobacion:', error);
    return NextResponse.json({ error: 'Error al obtener lista' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { familiaId, nuevoEstado } = body;

    if (!familiaId || !['APROBADA', 'RECHAZADA'].includes(nuevoEstado)) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    const updated = await prisma.familia.update({
      where: { id: familiaId },
      data: {
        estado: nuevoEstado as any,
        aprobadoPorId: session.user.id,
        fechaAprobacion: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error PATCH aprobacion:', error);
    return NextResponse.json({ error: 'Error al cambiar estado' }, { status: 500 });
  }
}
