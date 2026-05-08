// =============================================================
// API: Usuarios (Gestión de Jefes de Comunidad y Calle)
// Solo accesible por Administradores
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { UserRole } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { userCreateSchema, userUpdateSchema } from '@/lib/validations/user';

// GET: Listar usuarios (filtrable por rol)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const search = searchParams.get('search');

    const where: { role?: UserRole; OR?: object[] } = {};
    if (role && Object.values(UserRole).includes(role as UserRole)) {
      where.role = role as UserRole;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { cedula: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        cedula: true,
        active: true,
        createdAt: true,
        comunidadId: true,
        comunidad: {
          select: { id: true, nombre: true },
        },
        callesAsignadas: {
          select: {
            id: true,
            nombre: true,
            comunidad: { select: { nombre: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 });
  }
}

// POST: Crear nuevo usuario (Jefe de Comunidad o Jefe de Calle)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const raw = await req.json();
    const parsed = userCreateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { name, email, password, phone, cedula, role, comunidadId, calleId } = parsed.data;

    // Verificar que el email no exista
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'El email ya está registrado' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Determinar comunidadId para Jefe de Calle (derivada de la calle asignada)
    let efectiveComunidadId: string | null = null;

    if (role === 'JEFE_COMUNIDAD') {
      efectiveComunidadId = comunidadId!;
    } else if (role === 'JEFE_CALLE' && calleId) {
      // Obtener la comunidad de la calle asignada
      const calle = await prisma.calle.findUnique({
        where: { id: calleId },
        select: { comunidadId: true },
      });
      if (!calle) {
        return NextResponse.json({ error: 'La calle especificada no existe' }, { status: 400 });
      }
      efectiveComunidadId = calle.comunidadId;
    }

    // Crear usuario con la comunidad correspondiente
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone ?? undefined,
        cedula: cedula ?? undefined,
        role: role as UserRole,
        comunidadId: efectiveComunidadId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        comunidadId: true,
        comunidad: { select: { id: true, nombre: true } },
      },
    });

    // Si es Jefe de Calle con calle asignada, vincular directamente
    if (role === 'JEFE_CALLE' && calleId) {
      await prisma.calle.update({
        where: { id: calleId },
        data: { jefeCalleId: user.id },
      });
    }

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 });
  }
}

// PUT: Actualizar usuario
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const raw = await req.json();
    const parsed = userUpdateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { id, name, email, password, phone, cedula, active, role, comunidadId, calleId } = parsed.data;

    // No permitir que el admin se desactive a sí mismo
    if (id === session.user.id && active === false) {
      return NextResponse.json({ error: 'No puede desactivar su propia cuenta' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password && password.length > 0) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    if (phone !== undefined) updateData.phone = phone;
    if (cedula !== undefined) updateData.cedula = cedula;
    if (active !== undefined) updateData.active = active;
    if (role) updateData.role = role as UserRole;

    // Lógica de comunidad según rol
    const targetRole = role || (await prisma.user.findUnique({ where: { id }, select: { role: true } }))?.role;

    if (targetRole === 'JEFE_COMUNIDAD') {
      updateData.comunidadId = comunidadId || null;
    } else if (targetRole === 'JEFE_CALLE' && calleId) {
      // Derivar comunidad de la calle
      const calle = await prisma.calle.findUnique({
        where: { id: calleId },
        select: { comunidadId: true },
      });
      updateData.comunidadId = calle?.comunidadId || null;
    } else if (comunidadId !== undefined) {
      updateData.comunidadId = null;
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData as Parameters<typeof prisma.user.update>[0]['data'],
      select: { id: true, name: true, email: true, role: true, active: true, comunidadId: true },
    });

    // Si cambió a Jefe de Calle con calle, vincular
    if (role === 'JEFE_CALLE' && calleId) {
      // Desvincular calles anteriores
      await prisma.calle.updateMany({
        where: { jefeCalleId: id },
        data: { jefeCalleId: null },
      });
      // Vincular nueva calle
      await prisma.calle.update({
        where: { id: calleId },
        data: { jefeCalleId: user.id },
      });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 });
  }
}

// DELETE: Eliminar usuario
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    // No permitir que el admin se elimine a sí mismo
    if (id === session.user.id) {
      return NextResponse.json({ error: 'No puede eliminar su propia cuenta' }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ message: 'Usuario eliminado' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500 });
  }
}
