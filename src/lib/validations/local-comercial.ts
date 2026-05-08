import { z } from 'zod';

const optStr = z.union([z.string(), z.null()]).optional();

export const localComercialCreateSchema = z.object({
  calleId: z.string().min(1, 'Calle requerida'),
  nombre: z.string().min(1, 'Nombre del local requerido'),
  rif: optStr,
  propietario: optStr,
  telefono: optStr,
  tipoNegocio: z.string().min(1, 'Tipo de negocio requerido'),
  direccion: optStr,
  observaciones: optStr,
});

export const localComercialUpdateSchema = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1).optional(),
  rif: optStr,
  propietario: optStr,
  telefono: optStr,
  tipoNegocio: z.string().min(1).optional(),
  direccion: optStr,
  activo: z.boolean().optional(),
  observaciones: optStr,
});
