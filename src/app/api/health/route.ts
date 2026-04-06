import { NextResponse } from 'next/server';

/** Comprobación ligera para balanceadores / monitoreo (sin secretos). */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'araure-tricentenaria-censo',
    time: new Date().toISOString(),
  });
}
