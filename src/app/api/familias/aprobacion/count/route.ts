import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Endpoint ultraligero exclusivo para obtener métricas de pendientes en la interfaz global (ej. Sidebar)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const count = await prisma.familia.count({
      where: { estado: 'PENDIENTE' }
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error GET count aprobacion:', error);
    return NextResponse.json({ error: 'Error interno', count: 0 }, { status: 500 });
  }
}
