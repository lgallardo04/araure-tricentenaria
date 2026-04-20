// =============================================================
// API: Registros de Salud — Normalizado
// Vinculación Persona → Enfermedad/Medicamento (sin dual ref)
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: Listar registros de salud
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const comunidadId = searchParams.get('comunidadId');
    const calleId = searchParams.get('calleId');
    const enfermedadId = searchParams.get('enfermedadId');
    const medicamentoId = searchParams.get('medicamentoId');
    const activo = searchParams.get('activo');

    const where: any = {};
    if (enfermedadId) where.enfermedadId = enfermedadId;
    if (medicamentoId) where.medicamentoId = medicamentoId;
    if (activo !== null && activo !== undefined && activo !== '') {
      where.activo = activo === 'true';
    }

    // Filtro geográfico vía persona → familia → calle
    if (calleId || comunidadId) {
      const familiaFilter: any = {};
      if (calleId) familiaFilter.calleId = calleId;
      else if (comunidadId) familiaFilter.calle = { comunidadId };
      where.persona = { familia: familiaFilter };
    }

    // Filtro por rol
    const role = session.user.role;
    if (role === 'JEFE_COMUNIDAD' && session.user.comunidadId) {
      if (!where.persona) {
        where.persona = { familia: { calle: { comunidadId: session.user.comunidadId } } };
      }
    } else if (role === 'JEFE_CALLE') {
      const callesAsignadas = await prisma.calle.findMany({
        where: { jefeCalleId: session.user.id },
        select: { id: true },
      });
      const calleIds = callesAsignadas.map((c) => c.id);
      if (!where.persona) {
        where.persona = { familia: { calleId: { in: calleIds } } };
      }
    }

    const registros = await prisma.registroSalud.findMany({
      where,
      include: {
        enfermedad: { select: { id: true, nombre: true, tipo: true } },
        medicamento: { select: { id: true, nombre: true, principioActivo: true, presentacion: true, unidad: true } },
        persona: {
          select: {
            id: true,
            nombre: true,
            cedula: true,
            esJefe: true,
            familia: {
              select: {
                id: true,
                calle: { select: { id: true, nombre: true, comunidad: { select: { id: true, nombre: true } } } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(registros);
  } catch (error) {
    console.error('Error al obtener registros de salud:', error);
    return NextResponse.json({ error: 'Error al obtener registros' }, { status: 500 });
  }
}

// POST: Crear registro de salud
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const body = await req.json();
    const { personaId, enfermedadId, medicamentoId, dosis, frecuencia, cantidadMes, fechaInicio, fechaFin, activo, severidad, observaciones } = body;

    if (!enfermedadId) {
      return NextResponse.json({ error: 'La enfermedad es requerida' }, { status: 400 });
    }
    if (!personaId) {
      return NextResponse.json({ error: 'Debe indicar la persona' }, { status: 400 });
    }

    const registro = await prisma.registroSalud.create({
      data: {
        personaId,
        enfermedadId,
        medicamentoId: medicamentoId || null,
        dosis: dosis || null,
        frecuencia: frecuencia || null,
        cantidadMes: cantidadMes ? parseFloat(cantidadMes) : null,
        fechaInicio: fechaInicio || null,
        fechaFin: fechaFin || null,
        activo: activo !== undefined ? activo : true,
        severidad: severidad || null,
        observaciones: observaciones || null,
      },
      include: {
        enfermedad: true,
        medicamento: true,
      },
    });

    return NextResponse.json(registro, { status: 201 });
  } catch (error) {
    console.error('Error al crear registro de salud:', error);
    return NextResponse.json({ error: 'Error al crear registro' }, { status: 500 });
  }
}

// DELETE: Eliminar registro de salud
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    await prisma.registroSalud.delete({ where: { id } });
    return NextResponse.json({ message: 'Registro eliminado' });
  } catch (error) {
    console.error('Error al eliminar registro:', error);
    return NextResponse.json({ error: 'Error al eliminar registro' }, { status: 500 });
  }
}
