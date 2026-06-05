import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function assertPersonaAccess(session: any, personaId: string) {
  const persona = await prisma.persona.findUnique({
    where: { id: personaId },
    include: {
      familia: {
        include: {
          calle: { select: { id: true, comunidadId: true, jefeCalleId: true } }
        }
      }
    }
  });
  if (!persona) return { error: 'Persona no encontrada', status: 404 };

  const role = session.user.role;
  const userId = session.user.id;
  const userComunidadId = session.user.comunidadId;

  if (role === 'ADMIN') return null;
  if (role === 'JEFE_COMUNIDAD') {
    if (!userComunidadId || persona.familia.calle.comunidadId !== userComunidadId) {
      return { error: 'No autorizado', status: 403 };
    }
    return null;
  }
  if (role === 'JEFE_CALLE') {
    if (persona.familia.calle.jefeCalleId !== userId) {
      return { error: 'No autorizado', status: 403 };
    }
    return null;
  }
  return { error: 'No autorizado', status: 403 };
}

// PUT: Activar/Inhabilitar persona
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id, activo, motivoInactivo } = await req.json();
    if (!id || activo === undefined) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const accessError = await assertPersonaAccess(session, id);
    if (accessError) {
      return NextResponse.json({ error: accessError.error }, { status: accessError.status });
    }

    const persona = await prisma.persona.update({
      where: { id },
      data: {
        activo,
        motivoInactivo: activo ? null : (motivoInactivo || 'Otro'),
      },
    });

    return NextResponse.json(persona);
  } catch (error) {
    console.error('Error al actualizar persona:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE: Eliminar persona (Solo Admin)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo el administrador puede eliminar personas' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const accessError = await assertPersonaAccess(session, id);
    if (accessError) {
      return NextResponse.json({ error: accessError.error }, { status: accessError.status });
    }

    await prisma.persona.delete({ where: { id } });

    return NextResponse.json({ message: 'Persona eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar persona:', error);
    return NextResponse.json({ error: 'Error al eliminar persona' }, { status: 500 });
  }
}
