// =============================================================
// API: Demografía — Normalizado
// Usa tabla Persona unificada, sin duplicación jefe/miembros
// Optimizado: fechaNacimiento como DateTime para cálculos nativos
// Soporta filtros de rango de edad (edadMin, edadMax)
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function calcularEdad(fechaNac: Date | null): number | null {
  if (!fechaNac) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - fechaNac.getFullYear();
  const m = hoy.getMonth() - fechaNac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < fechaNac.getDate())) edad--;
  return edad;
}

interface DemografiaConteo {
  ninos: number;
  ninas: number;
  adolescentesM: number;
  adolescentesF: number;
  adultosM: number;
  adultosF: number;
  abuelosHombres: number;
  abuelasMujeres: number;
  total: number;
}

function crearConteoVacio(): DemografiaConteo {
  return {
    ninos: 0, ninas: 0,
    adolescentesM: 0, adolescentesF: 0,
    adultosM: 0, adultosF: 0,
    abuelosHombres: 0, abuelasMujeres: 0,
    total: 0,
  };
}

function clasificarPersona(conteo: DemografiaConteo, edad: number | null, genero: string | null) {
  if (edad === null) return;
  conteo.total++;
  if (edad < 12) {
    if (genero === 'M') conteo.ninos++;
    else if (genero === 'F') conteo.ninas++;
  } else if (edad < 18) {
    if (genero === 'M') conteo.adolescentesM++;
    else if (genero === 'F') conteo.adolescentesF++;
  } else if (edad < 60) {
    if (genero === 'M') conteo.adultosM++;
    else if (genero === 'F') conteo.adultosF++;
  } else {
    if (genero === 'M') conteo.abuelosHombres++;
    else if (genero === 'F') conteo.abuelasMujeres++;
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const calleId = searchParams.get('calleId');
    const comunidadId = searchParams.get('comunidadId');
    const list = searchParams.get('list') === 'true';
    const grupo = searchParams.get('grupo'); // ninos, adol, adult, abuelos, custom
    const edadMinParam = searchParams.get('edadMin');
    const edadMaxParam = searchParams.get('edadMax');
    const edadMin = edadMinParam !== null ? parseInt(edadMinParam, 10) : null;
    const edadMax = edadMaxParam !== null ? parseInt(edadMaxParam, 10) : null;
    const role = session.user.role;
    const userComunidadId = session.user.comunidadId;

    const familiaWhere: any = {};
    if (calleId) {
      familiaWhere.calleId = calleId;
    } else if (comunidadId) {
      familiaWhere.calle = { comunidadId };
    }

    if (role === 'JEFE_COMUNIDAD' && userComunidadId && !calleId) {
      familiaWhere.calle = { comunidadId: userComunidadId };
    }

    if (role === 'JEFE_CALLE') {
      const callesAsignadas = await prisma.calle.findMany({
        where: { jefeCalleId: session.user.id },
        select: { id: true },
      });
      familiaWhere.calleId = calleId ? calleId : { in: callesAsignadas.map((c) => c.id) };
    }

    // Query normalizada: Personas con ubicación
    const familias = await prisma.familia.findMany({
      where: familiaWhere,
      select: {
        calleId: true,
        calle: {
          select: {
            id: true,
            nombre: true,
            comunidadId: true,
            comunidad: { select: { id: true, nombre: true } },
          },
        },
        personas: {
          select: { 
            id: true, 
            nombre: true, 
            cedula: true, 
            genero: true, 
            fechaNacimiento: true,
            parentesco: true,
            esJefe: true
          },
        },
      },
    });

    if (list) {
      const personasList: any[] = [];

      for (const familia of familias) {
        // Obtener cédula del jefe de familia para usarla como "cédula parental" en menores
        const jefe = familia.personas.find((p) => p.esJefe);
        const cedulaJefe = jefe?.cedula ?? null;

        for (const persona of familia.personas) {
          const edad = calcularEdad(persona.fechaNacimiento);
          if (edad === null) continue;

          let match = false;
          // Filtro por rango de edad personalizado
          if (edadMin !== null && edadMax !== null) {
            match = edad >= edadMin && edad <= edadMax;
          } else if (edadMin !== null) {
            match = edad >= edadMin;
          } else if (edadMax !== null) {
            match = edad <= edadMax;
          }
          // Filtro por grupo predefinido
          else if (grupo === 'ninos') match = edad < 12;
          else if (grupo === 'adol') match = edad >= 12 && edad < 18;
          else if (grupo === 'adult') match = edad >= 18 && edad < 60;
          else if (grupo === 'abuelos') match = edad >= 60;
          else if (!grupo) match = true;

          if (match) {
            const esMenor = edad < 18;
            personasList.push({
              id: persona.id,
              nombre: persona.nombre,
              cedula: persona.cedula,
              cedulaParental: esMenor ? cedulaJefe : null,
              esMenor,
              edad,
              genero: persona.genero,
              parentesco: persona.parentesco,
              esJefe: persona.esJefe,
              calle: familia.calle.nombre,
              comunidad: familia.calle.comunidad.nombre.replace('Consejo Comunal ', ''),
            });
          }
        }
      }

      // Ordenar por nombre
      personasList.sort((a, b) => a.nombre.localeCompare(b.nombre));

      return NextResponse.json(personasList);
    }

    const global = crearConteoVacio();
    const porComunidad: Record<string, { nombre: string; conteo: DemografiaConteo }> = {};
    const porCalle: Record<string, { nombre: string; comunidadNombre: string; comunidadId: string; conteo: DemografiaConteo }> = {};

    const piramide: Record<string, { hombres: number; mujeres: number }> = {
      '0-4': { hombres: 0, mujeres: 0 },
      '5-9': { hombres: 0, mujeres: 0 },
      '10-14': { hombres: 0, mujeres: 0 },
      '15-19': { hombres: 0, mujeres: 0 },
      '20-24': { hombres: 0, mujeres: 0 },
      '25-29': { hombres: 0, mujeres: 0 },
      '30-34': { hombres: 0, mujeres: 0 },
      '35-39': { hombres: 0, mujeres: 0 },
      '40-44': { hombres: 0, mujeres: 0 },
      '45-49': { hombres: 0, mujeres: 0 },
      '50-54': { hombres: 0, mujeres: 0 },
      '55-59': { hombres: 0, mujeres: 0 },
      '60-64': { hombres: 0, mujeres: 0 },
      '65-69': { hombres: 0, mujeres: 0 },
      '70-74': { hombres: 0, mujeres: 0 },
      '75-79': { hombres: 0, mujeres: 0 },
      '80+': { hombres: 0, mujeres: 0 },
    };

    const clasificarPiramide = (edad: number | null, genero: string | null) => {
      if (edad === null || !genero) return;
      const key = genero === 'M' ? 'hombres' : 'mujeres';
      if (edad < 5) piramide['0-4'][key]++;
      else if (edad < 10) piramide['5-9'][key]++;
      else if (edad < 15) piramide['10-14'][key]++;
      else if (edad < 20) piramide['15-19'][key]++;
      else if (edad < 25) piramide['20-24'][key]++;
      else if (edad < 30) piramide['25-29'][key]++;
      else if (edad < 35) piramide['30-34'][key]++;
      else if (edad < 40) piramide['35-39'][key]++;
      else if (edad < 45) piramide['40-44'][key]++;
      else if (edad < 50) piramide['45-49'][key]++;
      else if (edad < 55) piramide['50-54'][key]++;
      else if (edad < 60) piramide['55-59'][key]++;
      else if (edad < 65) piramide['60-64'][key]++;
      else if (edad < 70) piramide['65-69'][key]++;
      else if (edad < 75) piramide['70-74'][key]++;
      else if (edad < 80) piramide['75-79'][key]++;
      else piramide['80+'][key]++;
    };

    const procesarPersona = (
      edad: number | null,
      genero: string | null,
      calleIdP: string,
      calleNombre: string,
      comunidadIdP: string,
      comunidadNombre: string
    ) => {
      clasificarPersona(global, edad, genero);
      clasificarPiramide(edad, genero);

      if (!porComunidad[comunidadIdP]) {
        porComunidad[comunidadIdP] = {
          nombre: comunidadNombre.replace('Consejo Comunal ', ''),
          conteo: crearConteoVacio(),
        };
      }
      clasificarPersona(porComunidad[comunidadIdP].conteo, edad, genero);

      if (!porCalle[calleIdP]) {
        porCalle[calleIdP] = {
          nombre: calleNombre,
          comunidadNombre: comunidadNombre.replace('Consejo Comunal ', ''),
          comunidadId: comunidadIdP,
          conteo: crearConteoVacio(),
        };
      }
      clasificarPersona(porCalle[calleIdP].conteo, edad, genero);
    };

    // Iteración uniforme sobre personas (sin distinción jefe/miembro)
    for (const familia of familias) {
      for (const persona of familia.personas) {
        const edad = calcularEdad(persona.fechaNacimiento);
        procesarPersona(
          edad, persona.genero,
          familia.calleId, familia.calle.nombre,
          familia.calle.comunidadId, familia.calle.comunidad.nombre
        );
      }
    }

    return NextResponse.json({
      global,
      porComunidad: Object.entries(porComunidad).map(([id, data]) => ({ id, ...data })),
      porCalle: Object.entries(porCalle).map(([id, data]) => ({ id, ...data })),
      piramide,
    });
  } catch (error) {
    console.error('Error demografía:', error);
    return NextResponse.json({ error: 'Error al obtener demografía' }, { status: 500 });
  }
}
