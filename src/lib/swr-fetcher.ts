// =============================================================
// Fetcher compartido para useSWR (usa apiFetch + errores claros)
// =============================================================

import { apiFetch, ApiError } from '@/lib/api';

export async function swrFetcher<T = unknown>(url: string): Promise<T> {
  const res = await apiFetch(url);
  if (res.status === 401) {
    throw new ApiError('No autorizado', 401);
  }
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      if (j && typeof j.error === 'string') msg = j.error;
    } catch {
      /* ignore */
    }
    throw new ApiError(msg, res.status);
  }
  return res.json() as Promise<T>;
}
