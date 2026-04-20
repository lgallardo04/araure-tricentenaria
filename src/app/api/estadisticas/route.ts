// =============================================================
// API: Estadísticas — Normalizado
// Usa tabla Persona unificada (elimina duplicación jefe/miembros)
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function calcularEdad(fechaNac: string | null): number | null {
  if (!fechaNac) return null;
  const hoy = new Date();
  const nacimiento = new Date(fechaNac);
  if (isNaN(nacimiento.getTime())) return null;
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const calleId = searchParams.get('calleId');
    const comunidadId = searchParams.get('comunidadId');
    const role = session.user.role;

    // Filtro de familias
    const familiaWhere: any = {};
    if (calleId) {
      familiaWhere.calleId = calleId;
    } else if (comunidadId) {
      familiaWhere.calle = { comunidadId };
    }

    if (role === 'JEFE_COMUNIDAD' && session.user.comunidadId && !calleId) {
      familiaWhere.calle = { comunidadId: session.user.comunidadId };
    }

    if (role === 'JEFE_CALLE') {
      const callesAsignadas = await prisma.calle.findMany({
        where: { jefeCalleId: session.user.id },
        select: { id: true },
      });
      familiaWhere.calleId = calleId ? calleId : { in: callesAsignadas.map((c) => c.id) };
    }

    // Query normalizada: Personas + Vivienda + Programas
    const familias = await prisma.familia.findMany({
      where: familiaWhere,
      select: {
        personas: {
          select: {
            fechaNacimiento: true,
            genero: true,
            pensionado: true,
            discapacidad: true,
            embarazada: true,
            lactancia: true,
          },
        },
        vivienda: {
          select: {
            tipo: true,
            tenencia: true,
            servicios: { select: { tipo: true, estado: true } },
          },
        },
        programaSocial: {
          select: { carnetPatria: true, recibeClap: true },
        },
      },
    });

    // Contadores
    let totalMiembros = 0;
    let totalMayores = 0;
    let totalMenores = 0;
    let totalPensionados = 0;
    let totalDiscapacidad = 0;
    let totalHombres = 0;
    let totalMujeres = 0;
    let totalEmbarazadas = 0;
    let totalLactancia = 0;
    let totalCarnetPatria = 0;
    let totalClap = 0;

    let totalNinos = 0;
    let totalNinas = 0;
    let totalAdolescentes = 0;
    let totalAdultos = 0;
    let totalAbuelosHombres = 0;
    let totalAbuelasMujeres = 0;
    let totalTerceraEdad = 0;

    const servicios = {
      agua: { tuberia: 0, cisterna: 0, pozo: 0, noTiene: 0 },
      electricidad: { si: 0, no: 0, irregular: 0 },
      gas: { directo: 0, bombona: 0, lena: 0, noTiene: 0 },
      internet: { si: 0, no: 0 },
      aseo: { si: 0, no: 0, irregular: 0 },
    };

    const tiposVivienda: Record<string, number> = {};
    const tiposTenencia: Record<string, number> = {};

    const edadesPorRango: Record<string, number> = {
      '0-5': 0, '6-12': 0, '13-17': 0, '18-30': 0,
      '31-45': 0, '46-60': 0, '61+': 0, 'Sin dato': 0,
    };

    const clasificarEdad = (edad: number | null) => {
      if (edad === null) { edadesPorRango['Sin dato']++; return; }
      if (edad <= 5) edadesPorRango['0-5']++;
      else if (edad <= 12) edadesPorRango['6-12']++;
      else if (edad <= 17) edadesPorRango['13-17']++;
      else if (edad <= 30) edadesPorRango['18-30']++;
      else if (edad <= 45) edadesPorRango['31-45']++;
      else if (edad <= 60) edadesPorRango['46-60']++;
      else edadesPorRango['61+']++;
    };

    for (const familia of familias) {
      // Programas sociales (por familia)
      if (familia.programaSocial?.carnetPatria) totalCarnetPatria++;
      if (familia.programaSocial?.recibeClap) totalClap++;

      // Vivienda
      if (familia.vivienda) {
        if (familia.vivienda.tipo) {
          tiposVivienda[familia.vivienda.tipo] = (tiposVivienda[familia.vivienda.tipo] || 0) + 1;
        }
        if (familia.vivienda.tenencia) {
          tiposTenencia[familia.vivienda.tenencia] = (tiposTenencia[familia.vivienda.tenencia] || 0) + 1;
        }

        // Servicios normalizados — ya no se parsean strings manualmente
        for (const srv of familia.vivienda.servicios) {
          const est = srv.estado.toLowerCase();
          switch (srv.tipo) {
            case 'AGUA':
              if (est.includes('tubería') || est.includes('tuberia') || est.includes('directa')) servicios.agua.tuberia++;
              else if (est.includes('cisterna')) servicios.agua.cisterna++;
              else if (est.includes('pozo')) servicios.agua.pozo++;
              else if (est.includes('no')) servicios.agua.noTiene++;
              break;
            case 'ELECTRICIDAD':
              if (est === 'sí' || est === 'si') servicios.electricidad.si++;
              else if (est === 'no') servicios.electricidad.no++;
              else if (est.includes('irregular')) servicios.electricidad.irregular++;
              break;
            case 'GAS':
              if (est.includes('directo')) servicios.gas.directo++;
              else if (est.includes('bombona')) servicios.gas.bombona++;
              else if (est.includes('leña') || est.includes('lena')) servicios.gas.lena++;
              else if (est.includes('no')) servicios.gas.noTiene++;
              break;
            case 'INTERNET':
              if (est === 'sí' || est === 'si') servicios.internet.si++;
              else servicios.internet.no++;
              break;
            case 'ASEO':
              if (est === 'sí' || est === 'si') servicios.aseo.si++;
              else if (est === 'no') servicios.aseo.no++;
              else if (est.includes('irregular')) servicios.aseo.irregular++;
              break;
          }
        }
      }

      // Personas — iteración uniforme (jefe + miembros)
      for (const persona of familia.personas) {
        totalMiembros++;
        const edad = calcularEdad(persona.fechaNacimiento);
        if (edad !== null) {
          if (edad >= 18) totalMayores++; else totalMenores++;
        }
        clasificarEdad(edad);

        if (persona.genero === 'M') totalHombres++;
        else if (persona.genero === 'F') totalMujeres++;

        if (persona.pensionado) totalPensionados++;
        if (persona.discapacidad) totalDiscapacidad++;
        if (persona.embarazada) totalEmbarazadas++;
        if (persona.lactancia) totalLactancia++;

        // Demografía detallada
        if (edad !== null) {
          if (edad < 12) {
            if (persona.genero === 'M') totalNinos++;
            else if (persona.genero === 'F') totalNinas++;
          } else if (edad < 18) {
            totalAdolescentes++;
          } else if (edad < 60) {
            totalAdultos++;
          } else {
            totalTerceraEdad++;
            if (persona.genero === 'M') totalAbuelosHombres++;
            else if (persona.genero === 'F') totalAbuelasMujeres++;
          }
        }
      }
    }

    // Conteos estructurales
    const comunidadWhere: any = {};
    if (role === 'JEFE_COMUNIDAD' && session.user.comunidadId) {
      comunidadWhere.id = session.user.comunidadId;
    }
    const totalComunidades = await prisma.comunidad.count({ where: comunidadWhere });

    const calleWhere: any = {};
    if (calleId) calleWhere.id = calleId;
    if (role === 'JEFE_COMUNIDAD' && session.user.comunidadId) {
      calleWhere.comunidadId = session.user.comunidadId;
    }
    const totalCalles = await prisma.calle.count({ where: calleWhere });

    // Por comunidad (para charts)
    const comunidades = await prisma.comunidad.findMany({
      where: comunidadWhere,
      include: {
        calles: { include: { _count: { select: { familias: true } } } },
      },
    });

    const poblacionPorComunidad = comunidades.map((c) => ({
      nombre: c.nombre.replace('Consejo Comunal ', ''),
      totalFamilias: c.calles.reduce((acc, calle) => acc + calle._count.familias, 0),
      totalCalles: c.calles.length,
    }));

    return NextResponse.json({
      totalFamilias: familias.length,
      totalMiembros,
      totalMayores,
      totalMenores,
      totalPensionados,
      totalDiscapacidad,
      totalHombres,
      totalMujeres,
      totalEmbarazadas,
      totalLactancia,
      totalCarnetPatria,
      totalClap,
      totalComunidades,
      totalCalles,
      totalNinos,
      totalNinas,
      totalAdolescentes,
      totalAdultos,
      totalAbuelosHombres,
      totalAbuelasMujeres,
      totalTerceraEdad,
      edadesPorRango,
      poblacionPorComunidad,
      servicios,
      tiposVivienda,
      tiposTenencia,
    });
  } catch (error) {
    console.error('Error estadísticas:', error);
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 });
  }
}
