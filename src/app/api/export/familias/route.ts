// =============================================================
// Exportación CSV de familias (mismo alcance que GET /api/familias)
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
        miembros: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const lines: string[] = [COLUMNS.join(',')];
    for (const f of familias) {
      const com = f.calle.comunidad.nombre.replace('Consejo Comunal ', '');
      const nMiembros = 1 + f.miembros.length;
      lines.push(
        [
          escapeCsvCell(com),
          escapeCsvCell(f.calle.nombre),
          escapeCsvCell(f.direccion),
          escapeCsvCell(f.tipoVivienda),
          escapeCsvCell(f.tenencia),
          escapeCsvCell(f.jfNombre),
          escapeCsvCell(f.jfCedula),
          escapeCsvCell(f.jfTelefono),
          String(nMiembros),
          escapeCsvCell(f.servicioAgua),
          escapeCsvCell(f.servicioElectricidad),
          escapeCsvCell(f.servicioGas),
          escapeCsvCell(f.servicioInternet),
          f.carnetPatria ? 'Sí' : 'No',
          f.recibeClap ? 'Sí' : 'No',
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
