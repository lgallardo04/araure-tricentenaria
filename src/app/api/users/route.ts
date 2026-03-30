// =============================================================
// API: Usuarios (Gestión de Jefes de Comunidad y Calle)
// Solo accesible por Administradores
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET: Listar usuarios (filtrable por rol)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const search = searchParams.get('search');

    const where: any = {};
    if (role) where.role = role;
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
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, phone, cedula, role, comunidadId } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nombre, email y contraseña son requeridos' }, { status: 400 });
    }

    if (!role || !['JEFE_COMUNIDAD', 'JEFE_CALLE'].includes(role)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
    }

    if (role === 'JEFE_COMUNIDAD' && !comunidadId) {
      return NextResponse.json({ error: 'Debe asignar una comunidad al Jefe de Comunidad' }, { status: 400 });
    }

    // Verificar que el email no exista
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'El email ya está registrado' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        cedula,
        role,
        comunidadId: role === 'JEFE_COMUNIDAD' ? comunidadId : null,
      },
      select: { id: true, name: true, email: true, role: true, comunidadId: true },
    });

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
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, email, password, phone, cedula, active, role, comunidadId } = body;

    // No permitir que el admin se desactive a sí mismo
    if (id === (session.user as any).id && active === false) {
      return NextResponse.json({ error: 'No puede desactivar su propia cuenta' }, { status: 400 });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password) updateData.password = await bcrypt.hash(password, 10);
    if (phone !== undefined) updateData.phone = phone;
    if (cedula !== undefined) updateData.cedula = cedula;
    if (active !== undefined) updateData.active = active;
    if (role) updateData.role = role;
    if (comunidadId !== undefined) {
      updateData.comunidadId = role === 'JEFE_COMUNIDAD' ? comunidadId : null;
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, active: true, comunidadId: true },
    });

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
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    // No permitir que el admin se elimine a sí mismo
    if (id === (session.user as any).id) {
      return NextResponse.json({ error: 'No puede eliminar su propia cuenta' }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ message: 'Usuario eliminado' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500 });
  }
}
