// =============================================================
// API: Reportes de Salud (BI - Business Intelligence)
// Genera datos estadísticos de salud para toma de decisiones
// Calcula demanda de medicamentos por comunidad/calle
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const comunidadId = searchParams.get('comunidadId');
    const calleId = searchParams.get('calleId');

    const role = session.user.role;

    // Construir filtro geográfico
    const buildGeoFilter = () => {
      const filter: any = {};
      if (calleId) {
        filter.OR = [
          { familia: { calleId } },
          { miembro: { familia: { calleId } } },
        ];
      } else if (comunidadId) {
        filter.OR = [
          { familia: { calle: { comunidadId } } },
          { miembro: { familia: { calle: { comunidadId } } } },
        ];
      } else if (role === 'JEFE_COMUNIDAD' && session.user.comunidadId) {
        filter.OR = [
          { familia: { calle: { comunidadId: session.user.comunidadId } } },
          { miembro: { familia: { calle: { comunidadId: session.user.comunidadId } } } },
        ];
      } else if (role === 'JEFE_CALLE') {
        return null; // handled below
      }
      return filter;
    };

    let whereBase: any = buildGeoFilter() || {};

    if (role === 'JEFE_CALLE') {
      const callesAsignadas = await prisma.calle.findMany({
        where: { jefeCalleId: session.user.id },
        select: { id: true },
      });
      const calleIds = callesAsignadas.map(c => c.id);
      whereBase = {
        OR: [
          { familia: { calleId: { in: calleIds } } },
          { miembro: { familia: { calleId: { in: calleIds } } } },
        ],
      };
    }

    // Obtener todos los registros activos con relaciones
    const registros = await prisma.registroSalud.findMany({
      where: { ...whereBase, activo: true },
      include: {
        enfermedad: { select: { id: true, nombre: true, tipo: true } },
        medicamento: { select: { id: true, nombre: true, principioActivo: true, presentacion: true, unidad: true } },
        familia: {
          select: {
            calleId: true,
            calle: { select: { id: true, nombre: true, comunidadId: true, comunidad: { select: { id: true, nombre: true } } } },
          },
        },
        miembro: {
          select: {
            familia: {
              select: {
                calleId: true,
                calle: { select: { id: true, nombre: true, comunidadId: true, comunidad: { select: { id: true, nombre: true } } } },
              },
            },
          },
        },
      },
    });

    // === 1. Enfermedades más frecuentes ===
    const enfermedadConteo: Record<string, { nombre: string; tipo: string; cantidad: number }> = {};
    for (const r of registros) {
      const key = r.enfermedadId;
      if (!enfermedadConteo[key]) {
        enfermedadConteo[key] = { nombre: r.enfermedad.nombre, tipo: r.enfermedad.tipo, cantidad: 0 };
      }
      enfermedadConteo[key].cantidad++;
    }
    const enfermedadesTop = Object.entries(enfermedadConteo)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.cantidad - a.cantidad);

    // === 2. Demanda de medicamentos ===
    const medicamentoConteo: Record<string, {
      nombre: string; principioActivo: string; presentacion: string | null; unidad: string | null;
      pacientes: number; cantidadMesTotal: number;
    }> = {};
    for (const r of registros) {
      if (!r.medicamento) continue;
      const key = r.medicamentoId!;
      if (!medicamentoConteo[key]) {
        medicamentoConteo[key] = {
          nombre: r.medicamento.nombre,
          principioActivo: r.medicamento.principioActivo,
          presentacion: r.medicamento.presentacion,
          unidad: r.medicamento.unidad,
          pacientes: 0,
          cantidadMesTotal: 0,
        };
      }
      medicamentoConteo[key].pacientes++;
      if (r.cantidadMes) medicamentoConteo[key].cantidadMesTotal += r.cantidadMes;
    }
    const medicamentosDemanda = Object.entries(medicamentoConteo)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.pacientes - a.pacientes);

    // === 3. Distribución por comunidad ===
    const porComunidad: Record<string, { nombre: string; enfermedades: number; conMedicamento: number }> = {};
    for (const r of registros) {
      const calle = r.familia?.calle || r.miembro?.familia?.calle;
      if (!calle) continue;
      const comId = calle.comunidadId;
      const comNombre = calle.comunidad.nombre.replace('Consejo Comunal ', '');
      if (!porComunidad[comId]) {
        porComunidad[comId] = { nombre: comNombre, enfermedades: 0, conMedicamento: 0 };
      }
      porComunidad[comId].enfermedades++;
      if (r.medicamentoId) porComunidad[comId].conMedicamento++;
    }

    // === 4. Distribución por calle ===
    const porCalle: Record<string, { nombre: string; comunidad: string; enfermedades: number; conMedicamento: number }> = {};
    for (const r of registros) {
      const calle = r.familia?.calle || r.miembro?.familia?.calle;
      if (!calle) continue;
      if (!porCalle[calle.id]) {
        porCalle[calle.id] = {
          nombre: calle.nombre,
          comunidad: calle.comunidad.nombre.replace('Consejo Comunal ', ''),
          enfermedades: 0,
          conMedicamento: 0,
        };
      }
      porCalle[calle.id].enfermedades++;
      if (r.medicamentoId) porCalle[calle.id].conMedicamento++;
    }

    // === 5. Distribución por tipo de enfermedad ===
    const porTipoEnfermedad: Record<string, number> = {};
    for (const r of registros) {
      const tipo = r.enfermedad.tipo;
      porTipoEnfermedad[tipo] = (porTipoEnfermedad[tipo] || 0) + 1;
    }

    // === 6. Severidad ===
    const porSeveridad: Record<string, number> = { Leve: 0, Moderada: 0, Severa: 0, 'Sin dato': 0 };
    for (const r of registros) {
      const sev = r.severidad || 'Sin dato';
      porSeveridad[sev] = (porSeveridad[sev] || 0) + 1;
    }

    // === 7. Demanda de medicamento X en comunidad Y (tabla cruzada) ===
    const demandaCruzada: Record<string, Record<string, { pacientes: number; cantidadMes: number }>> = {};
    for (const r of registros) {
      if (!r.medicamento) continue;
      const calle = r.familia?.calle || r.miembro?.familia?.calle;
      if (!calle) continue;
      const comNombre = calle.comunidad.nombre.replace('Consejo Comunal ', '');
      const medNombre = r.medicamento.nombre;

      if (!demandaCruzada[medNombre]) demandaCruzada[medNombre] = {};
      if (!demandaCruzada[medNombre][comNombre]) {
        demandaCruzada[medNombre][comNombre] = { pacientes: 0, cantidadMes: 0 };
      }
      demandaCruzada[medNombre][comNombre].pacientes++;
      if (r.cantidadMes) demandaCruzada[medNombre][comNombre].cantidadMes += r.cantidadMes;
    }

    return NextResponse.json({
      totalRegistros: registros.length,
      totalConMedicamento: registros.filter(r => r.medicamentoId).length,
      totalSinMedicamento: registros.filter(r => !r.medicamentoId).length,
      enfermedadesTop,
      medicamentosDemanda,
      porComunidad: Object.entries(porComunidad).map(([id, data]) => ({ id, ...data })),
      porCalle: Object.entries(porCalle).map(([id, data]) => ({ id, ...data })),
      porTipoEnfermedad,
      porSeveridad,
      demandaCruzada,
    });
  } catch (error) {
    console.error('Error reporte salud:', error);
    return NextResponse.json({ error: 'Error al generar reporte' }, { status: 500 });
  }
}
