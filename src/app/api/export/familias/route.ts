// =============================================================
// Exportación CSV de familias — Normalizado
// =============================================================

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { buildFamiliaListWhere } from '@/lib/familia-list-scope';
import { escapeCsvCell } from '@/lib/csv';

const COLUMNS = [
  'comunidad',
  'calle',
  'direccion',
  'tipo_vivienda',
  'tenencia',
  'jf_nombre',
  'jf_cedula',
  'jf_telefono',
  'num_miembros_hogar',
  'agua',
  'electricidad',
  'gas',
  'internet',
  'carnet_patria',
  'recibe_clap',
] as const;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const { where, error } = await buildFamiliaListWhere(session, {
      calleId: searchParams.get('calleId'),
      comunidadId: searchParams.get('comunidadId'),
      search: searchParams.get('search'),
    });
    if (error) return error;

    const familias = await prisma.familia.findMany({
      where,
      include: {
        calle: { include: { comunidad: true } },
        vivienda: { include: { servicios: true } },
        programaSocial: true,
        personas: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const lines: string[] = [COLUMNS.join(',')];
    for (const f of familias) {
      const com = f.calle.comunidad.nombre.replace('Consejo Comunal ', '');
      const jefe = f.personas.find((p) => p.esJefe);
      const nMiembros = f.personas.length;

      // Buscar servicios por tipo
      const getServicio = (tipo: string) =>
        f.vivienda?.servicios.find((s) => s.tipo === tipo)?.estado || '';

      lines.push(
        [
          escapeCsvCell(com),
          escapeCsvCell(f.calle.nombre),
          escapeCsvCell(f.vivienda?.direccion || ''),
          escapeCsvCell(f.vivienda?.tipo || ''),
          escapeCsvCell(f.vivienda?.tenencia || ''),
          escapeCsvCell(jefe?.nombre || ''),
          escapeCsvCell(jefe?.cedula),
          escapeCsvCell(jefe?.telefono),
          String(nMiembros),
          escapeCsvCell(getServicio('AGUA')),
          escapeCsvCell(getServicio('ELECTRICIDAD')),
          escapeCsvCell(getServicio('GAS')),
          escapeCsvCell(getServicio('INTERNET')),
          f.programaSocial?.carnetPatria ? 'Sí' : 'No',
          f.programaSocial?.recibeClap ? 'Sí' : 'No',
        ].join(',')
      );
    }

    const csv = '\uFEFF' + lines.join('\r\n');
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="censo-familias-${date}.csv"`,
      },
    });
  } catch (e) {
    console.error('export familias:', e);
    return NextResponse.json({ error: 'Error al exportar' }, { status: 500 });
  }
}
