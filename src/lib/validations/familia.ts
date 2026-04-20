import { z } from 'zod';

const optStr = z.union([z.string(), z.null()]).optional();

// ─── Persona (jefe + miembros, estructura unificada) ─────────

export const personaSchema = z.object({
  esJefe: z.boolean().optional(),
  nombre: z.string().min(1),
  cedula: optStr,
  nacionalidad: z.string().optional(),
  fechaNacimiento: z.string().min(1),
  genero: z.string().min(1),
  parentesco: optStr,
  estadoCivil: optStr,
  telefono: optStr,
  email: optStr,
  escolaridad: optStr,
  ocupacion: optStr,
  lugarTrabajo: optStr,
  enfermedad: optStr,
  pensionado: z.boolean().optional(),
  discapacidad: z.boolean().optional(),
  tipoDiscapacidad: optStr,
  embarazada: z.boolean().optional(),
  lactancia: z.boolean().optional(),
});

// ─── Vivienda ────────────────────────────────────────────────

export const viviendaSchema = z.object({
  direccion: z.string().min(1),
  tipo: z.string().min(1),
  tenencia: z.string().min(1),
  materialConstruccion: optStr,
  cantidadHabitaciones: z.union([z.string(), z.number(), z.null()]).optional(),
  cantidadBanos: z.union([z.string(), z.number(), z.null()]).optional(),
  observaciones: optStr,
});

// ─── Servicio de vivienda ────────────────────────────────────

export const servicioViviendaSchema = z.object({
  tipo: z.enum(['AGUA', 'ELECTRICIDAD', 'GAS', 'INTERNET', 'ASEO', 'TELEFONO']),
  estado: z.string().min(1),
});

// ─── Programas sociales ──────────────────────────────────────

export const programaSocialSchema = z.object({
  carnetPatria: z.boolean().optional(),
  codigoCarnetPatria: optStr,
  recibeClap: z.boolean().optional(),
  otrosBeneficios: optStr,
  ingresoFamiliar: optStr,
});

// ─── Familia (crear) ─────────────────────────────────────────

export const familiaCreateSchema = z.object({
  calleId: z.string().min(1),
  vivienda: viviendaSchema,
  servicios: z.array(servicioViviendaSchema).optional(),
  programaSocial: programaSocialSchema.optional(),
  jefe: personaSchema,
  miembros: z.array(personaSchema).optional(),
});

// ─── Familia (actualizar) ────────────────────────────────────

export const familiaUpdateSchema = z.object({
  id: z.string().min(1),
  calleId: z.string().min(1).optional(),
  vivienda: viviendaSchema.partial().optional(),
  servicios: z.array(servicioViviendaSchema).optional(),
  programaSocial: programaSocialSchema.optional(),
  jefe: personaSchema.optional(),
  miembros: z.array(personaSchema).optional(),
});
