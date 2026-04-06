import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'No disponible' }, { status: 404 });
  }
  try {
    const start = Date.now();
    const count = await prisma.user.count();
    const duration = Date.now() - start;
    
    // Also try to fetch the admin user to verify email
    const admin = await prisma.user.findFirst({
      where: { email: 'admin@comuna.com' }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      userCount: count,
      durationMs: duration,
      adminFound: !!admin,
      adminEmail: admin?.email,
      env: {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        databaseUrlLength: process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json(
      {
        success: false,
        message: 'Database connection failed',
        error: message,
      },
      { status: 500 }
    );
  }
}
