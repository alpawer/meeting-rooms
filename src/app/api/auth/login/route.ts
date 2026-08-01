import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { normalizeEmail, verifyPassword } from '@/lib/password';
import { buildSchemas } from '@/lib/schemas';
import { apiError, localeFrom, readJson, validationError } from '@/lib/http';
import { messages } from '@/lib/messages';
import { createSession } from '@/lib/session';

export async function POST(request: Request) {
  const locale = localeFrom(request);
  const parsed = buildSchemas(locale).login.safeParse(await readJson(request));

  if (!parsed.success) return validationError(parsed.error, locale);

  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(parsed.data.email) },
  });

  // The same answer for an unknown email and a wrong password, otherwise the
  // login form could be used to check whether an address is registered.
  const passwordMatches = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;

  if (!user || !passwordMatches) {
    return apiError(401, 'INVALID_CREDENTIALS', messages(locale).api.invalidCredentials);
  }

  await createSession(user.id);
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
}
