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
