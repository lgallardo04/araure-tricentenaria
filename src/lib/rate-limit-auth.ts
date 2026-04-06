// =============================================================
// Límite de intentos de login (Edge / middleware).
// Ventana deslizante en memoria por IP (~15 intentos / 15 min por instancia).
// En serverless cada instancia tiene su propio contador (mitigación básica).
// =============================================================

import type { NextRequest } from 'next/server';

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'local'
  );
}

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 15;

const memoryBuckets = new Map<string, number[]>();

function memorySlidingLimit(ip: string): boolean {
  const now = Date.now();
  const arr = memoryBuckets.get(ip) ?? [];
  const fresh = arr.filter((t) => now - t < WINDOW_MS);
  if (fresh.length >= MAX_ATTEMPTS) return false;
  fresh.push(now);
  memoryBuckets.set(ip, fresh);
  if (memoryBuckets.size > 8000) {
    const k = memoryBuckets.keys().next().value;
    if (k) memoryBuckets.delete(k);
  }
  return true;
}

/** POST a rutas de credenciales de NextAuth */
export async function rateLimitAuthRequest(req: NextRequest): Promise<{ allowed: boolean }> {
  if (req.method !== 'POST') return { allowed: true };
  const path = req.nextUrl.pathname;
  if (!path.includes('credentials')) return { allowed: true };

  const ip = clientIp(req);
  return { allowed: memorySlidingLimit(ip) };
}
