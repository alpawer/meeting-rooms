import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { DEFAULT_LOCALE, LOCALES, messages, type Locale } from '@/lib/messages';

/**
 * Every API error has the same shape:
 *   { error: { code, message, fields? } }
 * code drives client logic, message is shown to the user, fields is filled
 * for validation errors so the form can highlight the right input.
 */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

export function apiError(
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string>,
): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error: { code, message, ...(fields ? { fields } : {}) } }, { status });
}

/** Locale from the Accept-Language header, falling back to the default. */
export function localeFrom(request: Request): Locale {
  const header = request.headers.get('accept-language') ?? '';
  const first = header.split(',')[0]?.trim().slice(0, 2).toLowerCase();
  return (LOCALES as readonly string[]).includes(first) ? (first as Locale) : DEFAULT_LOCALE;
}

/** Flattens a zod error into a field to message map. */
export function zodFields(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

/** Request body as JSON. An empty or broken body must not throw a 500. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function validationError(error: ZodError, locale: Locale): NextResponse<ApiErrorBody> {
  return apiError(422, 'VALIDATION_FAILED', messages(locale).api.validationFailed, zodFields(error));
}

export function unauthorized(locale: Locale): NextResponse<ApiErrorBody> {
  return apiError(401, 'UNAUTHORIZED', messages(locale).api.unauthorized);
}

export function forbidden(locale: Locale): NextResponse<ApiErrorBody> {
  return apiError(403, 'FORBIDDEN', messages(locale).api.forbidden);
}

export function notFound(locale: Locale): NextResponse<ApiErrorBody> {
  return apiError(404, 'NOT_FOUND', messages(locale).api.notFound);
}
