// =============================================================
// Cliente HTTP para llamadas a la API (cookies + errores)
// =============================================================

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function buildHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers);
  const method = (init?.method ?? 'GET').toUpperCase();
  if (
    method !== 'GET' &&
    method !== 'HEAD' &&
    init?.body != null &&
    !(init.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }
  return headers;
}

/**
 * fetch con cookies de sesión y redirección a login si 401.
 */
export async function apiFetch(input: string | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, {
    ...init,
    credentials: 'include',
    headers: buildHeaders(init),
  });

  if (res.status === 401 && typeof window !== 'undefined') {
    const path = window.location.pathname;
    if (!path.startsWith('/login')) {
      window.location.href = '/login';
    }
  }

  return res;
}

export async function apiJson<T>(input: string | URL, init?: RequestInit): Promise<T> {
  const res = await apiFetch(input, init);
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const msg =
      typeof body === 'object' && body !== null && 'error' in body && typeof (body as { error: string }).error === 'string'
        ? (body as { error: string }).error
        : res.statusText || 'Error en la solicitud';
    throw new ApiError(msg, res.status, body);
  }

  return body as T;
}
