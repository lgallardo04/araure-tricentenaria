// =============================================================
// Filtro de familias según rol (reutilizado en GET /api/familias y export)
// =============================================================

import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import type { Session } from 'next-auth';
import prisma from '@/lib/prisma';

export type FamiliaListParams = {
  calleId: string | null;
  comunidadId: string | null;
  search: string | null;
};

export async function buildFamiliaListWhere(
  session: Session,
  params: FamiliaListParams
): Promise<{ where: Prisma.FamiliaWhereInput; error?: NextResponse }> {
  const { calleId, comunidadId, search } = params;
  const where: Prisma.FamiliaWhereInput = {};
  const role = session.user.role;
  const userComunidadId = session.user.comunidadId;
  const userId = session.user.id;

  if (role === 'JEFE_CALLE' && userId) {
    const callesAsignadas = await prisma.calle.findMany({
      where: { jefeCalleId: userId },
      select: { id: true },
    });
    const ids = callesAsignadas.map((c) => c.id);
    if (calleId) {
      if (!ids.includes(calleId)) {
        return {
          where: {},
          error: NextResponse.json({ error: 'No tiene acceso a esta calle' }, { status: 403 }),
        };
      }
      where.calleId = calleId;
    } else {
      where.calleId = { in: ids };
    }
  } else {
    if (role === 'JEFE_COMUNIDAD' && userComunidadId) {
      if (comunidadId && comunidadId !== userComunidadId) {
        return {
          where: {},
          error: NextResponse.json({ error: 'No autorizado' }, { status: 403 }),
        };
      }
      if (calleId) {
        const calle = await prisma.calle.findUnique({
          where: { id: calleId },
          select: { comunidadId: true },
        });
        if (!calle || calle.comunidadId !== userComunidadId) {
          return {
            where: {},
            error: NextResponse.json({ error: 'No tiene acceso a esta calle' }, { status: 403 }),
          };
        }
      }
    }
    if (calleId) where.calleId = calleId;
    if (comunidadId) where.calle = { comunidadId };
    if (role === 'JEFE_COMUNIDAD' && userComunidadId && !calleId) {
      where.calle = { comunidadId: userComunidadId };
    }
  }

  // Búsqueda normalizada: buscar en la tabla Persona (jefes)
  if (search) {
    where.OR = [
      { personas: { some: { esJefe: true, nombre: { contains: search, mode: 'insensitive' } } } },
      { personas: { some: { esJefe: true, cedula: { contains: search, mode: 'insensitive' } } } },
      { vivienda: { direccion: { contains: search, mode: 'insensitive' } } },
    ];
  }

  return { where };
}
