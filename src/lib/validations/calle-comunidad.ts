import { z } from 'zod';

const optionalStr = z.union([z.string(), z.null()]).optional();

export const calleCreateSchema = z.object({
  nombre: z.string().min(1),
  avenida: optionalStr,
  puntoReferencia: optionalStr,
  comunidadId: z.string().min(1),
  jefeCalleId: z.union([z.string(), z.null()]).optional(),
});

export const calleUpdateSchema = z.object({
  id: z.string().min(1),
  nombre: z.string().optional(),
  avenida: optionalStr,
  puntoReferencia: optionalStr,
  comunidadId: z.string().optional(),
  jefeCalleId: z.union([z.string(), z.null()]).optional(),
});

export const comunidadCreateSchema = z.object({
  nombre: z.string().min(1),
  descripcion: optionalStr,
  sector: optionalStr,
});

export const comunidadUpdateSchema = z.object({
  id: z.string().min(1),
  nombre: z.string().optional(),
  descripcion: optionalStr,
  sector: optionalStr,
});
