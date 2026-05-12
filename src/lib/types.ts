// =============================================================
// Tipos personalizados para la aplicación
// =============================================================

import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface User {
    role: string;
    comunidadId: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: string;
      comunidadId: string | null;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: string;
    comunidadId?: string | null;
  }
}

// Tipos de la aplicación
export type UserRole = 'ADMIN' | 'JEFE_COMUNIDAD' | 'JEFE_CALLE';

export interface PersonaBasic {
  id: string;
  esJefe: boolean;
  nombre: string;
  cedula: string | null;
  nacionalidad: string;
  fechaNacimiento: Date | null;
  genero: string;
  parentesco: string | null;
  estadoCivil: string | null;
  telefono: string | null;
  email: string | null;
  escolaridad: string | null;
  ocupacion: string | null;
  lugarTrabajo: string | null;
  pensionado: boolean;
  discapacidad: boolean;
  tipoDiscapacidad: string | null;
  embarazada: boolean;
  lactancia: boolean;
  esVotante: boolean;
  votaEnEscuela: boolean;
  centroVotacion: string | null;
}

export interface ViviendaBasic {
  id: string;
  direccion: string;
  numeroCasa: string | null;
  tipo: string;
  tenencia: string;
  materialConstruccion: string | null;
  cantidadHabitaciones: number | null;
  cantidadBanos: number | null;
  observaciones: string | null;
  servicios: { tipo: string; estado: string }[];
}

export interface ProgramaSocialBasic {
  carnetPatria: boolean;
  codigoCarnetPatria: string | null;
  recibeClap: boolean;
  otrosBeneficios: string | null;
  ingresoFamiliar: string | null;
}

export interface ComunidadWithCalles {
  id: string;
  nombre: string;
  descripcion: string | null;
  sector: string | null;
  jefesComunidad: { id: string; name: string; email: string }[];
  calles: CalleBasic[];
}

export interface CalleBasic {
  id: string;
  nombre: string;
  avenida: string | null;
  comunidadId: string;
}

export interface LocalComercialBasic {
  id: string;
  nombre: string;
  rif: string | null;
  propietario: string | null;
  telefono: string | null;
  tipoNegocio: string;
  direccion: string | null;
  activo: boolean;
  observaciones: string | null;
  calle: CalleBasic;
}

export interface EstadisticasGenerales {
  totalFamilias: number;
  totalMiembros: number;
  totalMayores: number;
  totalMenores: number;
  totalPensionados: number;
  totalDiscapacidad: number;
  totalComunidades: number;
  totalCalles: number;
  totalEmbarazadas: number;
  totalLactancia: number;
  totalCarnetPatria: number;
  totalClap: number;
  totalVotantes: number;
  totalVotanEscuela: number;
  // Demografía detallada
  totalBebesNinos: number;
  totalBebesNinas: number;
  totalNinos: number;
  totalNinas: number;
  totalAdolescentes: number;
  totalAdultos: number;
  totalAbuelosHombres: number;
  totalAbuelasMujeres: number;
  totalTerceraEdad: number;
  edadesPorRango: Record<string, number>;
  edadesPorRangoGenero: Record<string, { hombres: number, mujeres: number }>;
}

export interface DemografiaConteo {
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

export interface DemografiaPorZona {
  id: string;
  nombre: string;
  conteo: DemografiaConteo;
}

export interface DemografiaResponse {
  global: DemografiaConteo;
  porComunidad: DemografiaPorZona[];
  porCalle: (DemografiaPorZona & { comunidadNombre: string; comunidadId: string })[];
  piramide: Record<string, { hombres: number; mujeres: number }>;
}
