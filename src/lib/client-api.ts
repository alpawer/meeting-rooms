import type { ApiErrorBody } from '@/lib/http';

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

/**
 * Wrapper around fetch. Every failure becomes an ApiError with a message
 * that can be shown to the user, including a network failure, so a screen
 * never gets stuck in a loading state without an explanation.
 */
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError('NETWORK', 'network', 0);
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      body?.error.code ?? 'UNKNOWN',
      body?.error.message ?? 'unknown',
      response.status,
      body?.error.fields,
    );
  }

  return (await response.json()) as T;
}
