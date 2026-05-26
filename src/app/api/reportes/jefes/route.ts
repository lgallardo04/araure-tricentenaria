// =============================================================
// API: Reporte de Jefes de Comunidad y Jefes de Calle
// Retorna cada jefe con su rol, asignación y cantidad de familias
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const role = session.user.role;

    // Jefes de Comunidad
    const jefesComunidad = await prisma.user.findMany({
      where: {
        role: 'JEFE_COMUNIDAD',
        active: true,
        ...(role === 'JEFE_COMUNIDAD' && session.user.comunidadId
          ? { comunidadId: session.user.comunidadId }
          : {}),
      },
      select: {
        id: true,
        name: true,
        cedula: true,
        phone: true,
        comunidad: {
          select: {
            id: true,
            nombre: true,
            calles: {
              select: {
                _count: { select: { familias: true } },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Jefes de Calle
    const jefesCalle = await prisma.user.findMany({
      where: {
        role: 'JEFE_CALLE',
        active: true,
        ...(role === 'JEFE_COMUNIDAD' && session.user.comunidadId
          ? { comunidadId: session.user.comunidadId }
          : {}),
      },
      select: {
        id: true,
        name: true,
        cedula: true,
        phone: true,
        callesAsignadas: {
          select: {
            id: true,
            nombre: true,
            comunidad: { select: { nombre: true } },
            _count: { select: { familias: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Format response
    const resultado = [
      ...jefesComunidad.map((jc) => ({
        id: jc.id,
        nombre: jc.name,
        cedula: jc.cedula,
        telefono: jc.phone,
        rol: 'Jefe de Comunidad',
        asignacion: jc.comunidad?.nombre?.replace('Consejo Comunal ', '') || 'Sin asignar',
        totalFamilias: jc.comunidad?.calles?.reduce((acc, c) => acc + c._count.familias, 0) || 0,
      })),
      ...jefesCalle.map((jc) => ({
        id: jc.id,
        nombre: jc.name,
        cedula: jc.cedula,
        telefono: jc.phone,
        rol: 'Jefe de Calle',
        asignacion: jc.callesAsignadas.map((c) => c.nombre).join(', ') || 'Sin asignar',
        totalFamilias: jc.callesAsignadas.reduce((acc, c) => acc + c._count.familias, 0),
      })),
    ];

    return NextResponse.json(resultado);
  } catch (error) {
    console.error('Error reporte jefes:', error);
    return NextResponse.json({ error: 'Error al obtener reporte de jefes' }, { status: 500 });
  }
}
