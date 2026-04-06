import { z } from 'zod';

const optionalStr = z.union([z.string(), z.null(), z.undefined()]).optional();

export const userCreateSchema = z
  .object({
    name: z.string().min(1, 'Nombre requerido'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    phone: optionalStr,
    cedula: optionalStr,
    role: z.enum(['JEFE_COMUNIDAD', 'JEFE_CALLE']),
    comunidadId: z.union([z.string().min(1), z.null(), z.undefined()]).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'JEFE_COMUNIDAD' && !data.comunidadId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debe asignar una comunidad al Jefe de Comunidad',
        path: ['comunidadId'],
      });
    }
  });

export const userUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.union([z.string().min(6), z.literal('')]).optional(),
  phone: optionalStr,
  cedula: optionalStr,
  active: z.boolean().optional(),
  role: z.enum(['ADMIN', 'JEFE_COMUNIDAD', 'JEFE_CALLE']).optional(),
  comunidadId: z.union([z.string(), z.null(), z.undefined()]).optional(),
});
