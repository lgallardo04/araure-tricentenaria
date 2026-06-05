import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function assertViviendaAccess(session: any, viviendaId: string) {
  const vivienda = await prisma.vivienda.findUnique({
    where: { id: viviendaId },
    include: {
      familias: {
        include: {
          calle: { select: { id: true, comunidadId: true, jefeCalleId: true } }
        }
      }
    }
  });
  if (!vivienda) return { error: 'Vivienda no encontrada', status: 404 };

  const role = session.user.role;
  const userId = session.user.id;
  const userComunidadId = session.user.comunidadId;

  if (role === 'ADMIN') return null;

  // If user has access to at least one family in this vivienda, allow
  const hasAccess = vivienda.familias.some((familia) => {
    if (role === 'JEFE_COMUNIDAD') {
      return userComunidadId && familia.calle.comunidadId === userComunidadId;
    }
    if (role === 'JEFE_CALLE') {
      return familia.calle.jefeCalleId === userId;
    }
    return false;
  });

  if (hasAccess) return null;
  return { error: 'No autorizado', status: 403 };
}

// PUT: Activar/Inhabilitar vivienda
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id, activo } = await req.json();
    if (!id || activo === undefined) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const accessError = await assertViviendaAccess(session, id);
    if (accessError) {
      return NextResponse.json({ error: accessError.error }, { status: accessError.status });
    }

    const vivienda = await prisma.vivienda.update({
      where: { id },
      data: { activo },
    });

    return NextResponse.json(vivienda);
  } catch (error) {
    console.error('Error al actualizar vivienda:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE: Eliminar vivienda (Solo Admin)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo el administrador puede eliminar viviendas' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const accessError = await assertViviendaAccess(session, id);
    if (accessError) {
      return NextResponse.json({ error: accessError.error }, { status: accessError.status });
    }

    await prisma.vivienda.delete({ where: { id } });

    return NextResponse.json({ message: 'Vivienda eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar vivienda:', error);
    return NextResponse.json({ error: 'Error al eliminar vivienda. Puede tener registros asociados.' }, { status: 500 });
  }
}
