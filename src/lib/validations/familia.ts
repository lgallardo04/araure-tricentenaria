import { z } from 'zod';

const optionalStr = z.union([z.string(), z.null()]).optional();

const miembroSchema = z.object({
  nombre: z.string().min(1),
  cedula: optionalStr,
  nacionalidad: z.string().optional(),
  fechaNacimiento: z.string().min(1),
  genero: z.string().min(1),
  parentesco: z.string().min(1),
  estadoCivil: optionalStr,
  escolaridad: optionalStr,
  ocupacion: optionalStr,
  lugarTrabajo: optionalStr,
  salud: optionalStr,
  pensionado: z.boolean().optional(),
  discapacidad: z.boolean().optional(),
  tipoDiscapacidad: optionalStr,
  embarazada: z.boolean().optional(),
  lactancia: z.boolean().optional(),
});

export const familiaCreateSchema = z.object({
  calleId: z.string().min(1),
  direccion: z.string().min(1),
  tipoVivienda: z.string().min(1),
  tenencia: z.string().min(1),
  materialConstruccion: optionalStr,
  cantidadHabitaciones: z.union([z.string(), z.number(), z.null()]).optional(),
  cantidadBanos: z.union([z.string(), z.number(), z.null()]).optional(),
  observaciones: optionalStr,
  servicioAgua: optionalStr,
  servicioElectricidad: optionalStr,
  servicioGas: optionalStr,
  servicioInternet: optionalStr,
  servicioAseo: optionalStr,
  servicioTelefono: optionalStr,
  carnetPatria: z.boolean().optional(),
  codigoCarnetPatria: optionalStr,
  recibeClap: z.boolean().optional(),
  otrosBeneficios: optionalStr,
  ingresoFamiliar: optionalStr,
  jfNombre: z.string().min(1),
  jfCedula: z.string().min(1),
  jfNacionalidad: z.string().min(1).optional(),
  jfFechaNac: z.string().min(1),
  jfGenero: z.string().min(1),
  jfEstadoCivil: optionalStr,
  jfTelefono: optionalStr,
  jfEmail: optionalStr,
  jfEscolaridad: optionalStr,
  jfOcupacion: optionalStr,
  jfLugarTrabajo: optionalStr,
  jfPensionado: z.boolean().optional(),
  jfDiscapacidad: z.boolean().optional(),
  jfTipoDiscapacidad: optionalStr,
  jfEnfermedad: optionalStr,
  jfEmbarazada: z.boolean().optional(),
  jfLactancia: z.boolean().optional(),
  miembros: z.array(miembroSchema).optional(),
});

export const familiaUpdateSchema = z
  .object({
    id: z.string().min(1),
    miembros: z.array(miembroSchema).optional(),
    cantidadHabitaciones: z.union([z.string(), z.number(), z.null()]).optional(),
    cantidadBanos: z.union([z.string(), z.number(), z.null()]).optional(),
  })
  .passthrough();
