// =============================================================
// Tipos personalizados para la aplicación
// =============================================================

import { DefaultSession } from 'next-auth';

// Extender tipos de NextAuth para incluir role, id y comunidadId
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      comunidadId?: string | null;
    } & DefaultSession['user'];
  }

  interface User {
    role: string;
    comunidadId?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string;
    id: string;
    comunidadId?: string | null;
  }
}

// Tipos de la aplicación
export type UserRole = 'ADMIN' | 'JEFE_COMUNIDAD' | 'JEFE_CALLE';

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
}
