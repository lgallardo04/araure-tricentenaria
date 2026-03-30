// =============================================================
// API: Estadísticas
// Genera datos estadísticos expandidos para dashboard y reportes
// Incluye servicios, programas sociales, embarazo/lactancia
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Función auxiliar para calcular edad a partir de fecha de nacimiento
function calcularEdad(fechaNac: string | null): number | null {
  if (!fechaNac) return null;
  const hoy = new Date();
  const nacimiento = new Date(fechaNac);
  if (isNaN(nacimiento.getTime())) return null;
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
}

// GET: Obtener estadísticas generales o filtradas
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const calleId = searchParams.get('calleId');
    const comunidadId = searchParams.get('comunidadId');

    // Construir filtro
    const familiaWhere: any = {};
    if (calleId) {
      familiaWhere.calleId = calleId;
    } else if (comunidadId) {
      familiaWhere.calle = { comunidadId };
    }

    const role = (session.user as any).role;

    // Si es Jefe de Comunidad, limitar a su comunidad
    if (role === 'JEFE_COMUNIDAD') {
      const userComunidadId = (session.user as any).comunidadId;
      if (userComunidadId) {
        familiaWhere.calle = { comunidadId: userComunidadId };
      }
    }

    // Si es Jefe de Calle, limitar a sus calles asignadas
    if (role === 'JEFE_CALLE') {
      const callesAsignadas = await prisma.calle.findMany({
        where: { jefeCalleId: (session.user as any).id },
        select: { id: true },
      });
      const calleIds = callesAsignadas.map((c) => c.id);
      familiaWhere.calleId = { in: calleIds };
    }

    // Obtener todas las familias con sus miembros
    const familias = await prisma.familia.findMany({
      where: familiaWhere,
      include: { miembros: true },
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

    // Servicios
    const servicios = {
      agua: { tuberia: 0, cisterna: 0, pozo: 0, noTiene: 0 },
      electricidad: { si: 0, no: 0, irregular: 0 },
      gas: { directo: 0, bombona: 0, lena: 0, noTiene: 0 },
      internet: { si: 0, no: 0 },
      aseo: { si: 0, no: 0, irregular: 0 },
    };

    // Vivienda
    const tiposVivienda: Record<string, number> = {};
    const tiposTenencia: Record<string, number> = {};

    const edadesPorRango: Record<string, number> = {
      '0-5': 0, '6-12': 0, '13-17': 0, '18-30': 0,
      '31-45': 0, '46-60': 0, '61+': 0, 'Sin dato': 0,
    };

    function clasificarEdad(edad: number | null) {
      if (edad === null) { edadesPorRango['Sin dato']++; return; }
      if (edad <= 5) edadesPorRango['0-5']++;
      else if (edad <= 12) edadesPorRango['6-12']++;
      else if (edad <= 17) edadesPorRango['13-17']++;
      else if (edad <= 30) edadesPorRango['18-30']++;
      else if (edad <= 45) edadesPorRango['31-45']++;
      else if (edad <= 60) edadesPorRango['46-60']++;
      else edadesPorRango['61+']++;
    }

    for (const familia of familias) {
      // Contar jefe de familia
      totalMiembros++;
      const edadJefe = calcularEdad(familia.jfFechaNac);
      if (edadJefe !== null) {
        if (edadJefe >= 18) totalMayores++; else totalMenores++;
      }
      clasificarEdad(edadJefe);
      if (familia.jfGenero === 'M') totalHombres++;
      else if (familia.jfGenero === 'F') totalMujeres++;
      if (familia.jfPensionado) totalPensionados++;
      if (familia.jfDiscapacidad) totalDiscapacidad++;
      if (familia.jfEmbarazada) totalEmbarazadas++;
      if (familia.jfLactancia) totalLactancia++;

      // Programas sociales (por familia)
      if (familia.carnetPatria) totalCarnetPatria++;
      if (familia.recibeClap) totalClap++;

      // Tipo de vivienda
      if (familia.tipoVivienda) {
        tiposVivienda[familia.tipoVivienda] = (tiposVivienda[familia.tipoVivienda] || 0) + 1;
      }
      if (familia.tenencia) {
        tiposTenencia[familia.tenencia] = (tiposTenencia[familia.tenencia] || 0) + 1;
      }

      // Servicios
      const agua = familia.servicioAgua?.toLowerCase() || '';
      if (agua.includes('tubería') || agua.includes('tuberia') || agua.includes('directa')) servicios.agua.tuberia++;
      else if (agua.includes('cisterna')) servicios.agua.cisterna++;
      else if (agua.includes('pozo')) servicios.agua.pozo++;
      else if (agua.includes('no')) servicios.agua.noTiene++;

      const elec = familia.servicioElectricidad?.toLowerCase() || '';
      if (elec === 'sí' || elec === 'si') servicios.electricidad.si++;
      else if (elec === 'no') servicios.electricidad.no++;
      else if (elec.includes('irregular')) servicios.electricidad.irregular++;

      const gas = familia.servicioGas?.toLowerCase() || '';
      if (gas.includes('directo')) servicios.gas.directo++;
      else if (gas.includes('bombona')) servicios.gas.bombona++;
      else if (gas.includes('leña') || gas.includes('lena')) servicios.gas.lena++;
      else if (gas.includes('no')) servicios.gas.noTiene++;

      const inet = familia.servicioInternet?.toLowerCase() || '';
      if (inet === 'sí' || inet === 'si') servicios.internet.si++;
      else servicios.internet.no++;

      const aseo = familia.servicioAseo?.toLowerCase() || '';
      if (aseo === 'sí' || aseo === 'si') servicios.aseo.si++;
      else if (aseo === 'no') servicios.aseo.no++;
      else if (aseo.includes('irregular')) servicios.aseo.irregular++;

      // Contar miembros
      for (const miembro of familia.miembros) {
        totalMiembros++;
        const edad = calcularEdad(miembro.fechaNacimiento);
        if (edad !== null) {
          if (edad >= 18) totalMayores++; else totalMenores++;
        }
        clasificarEdad(edad);
        if (miembro.genero === 'M') totalHombres++;
        else if (miembro.genero === 'F') totalMujeres++;
        if (miembro.pensionado) totalPensionados++;
        if (miembro.discapacidad) totalDiscapacidad++;
        if (miembro.embarazada) totalEmbarazadas++;
        if (miembro.lactancia) totalLactancia++;
      }
    }

    // Obtener conteos estructurales
    const comunidadWhere: any = {};
    if (role === 'JEFE_COMUNIDAD') {
      const userComunidadId = (session.user as any).comunidadId;
      if (userComunidadId) comunidadWhere.id = userComunidadId;
    }

    const totalComunidades = await prisma.comunidad.count({ where: comunidadWhere });
    const calleWhere: any = {};
    if (calleId) calleWhere.id = calleId;
    if (role === 'JEFE_COMUNIDAD') {
      const userComunidadId = (session.user as any).comunidadId;
      if (userComunidadId) calleWhere.comunidadId = userComunidadId;
    }
    const totalCalles = await prisma.calle.count({ where: calleWhere });

    // Estadísticas por comunidad (para charts)
    const comunidades = await prisma.comunidad.findMany({
      where: comunidadWhere,
      include: {
        calles: {
          include: {
            _count: { select: { familias: true } },
          },
        },
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
