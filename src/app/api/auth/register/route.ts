import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { hashPassword, normalizeEmail } from '@/lib/password';
import { buildSchemas } from '@/lib/schemas';
import { apiError, localeFrom, readJson, validationError } from '@/lib/http';
import { messages } from '@/lib/messages';
import { createSession } from '@/lib/session';

export async function POST(request: Request) {
  const locale = localeFrom(request);
  const parsed = buildSchemas(locale).register.safeParse(await readJson(request));

  if (!parsed.success) return validationError(parsed.error, locale);

  try {
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name.trim(),
        email: normalizeEmail(parsed.data.email),
        passwordHash: await hashPassword(parsed.data.password),
      },
      select: { id: true, name: true, email: true },
    });

    await createSession(user.id);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    // Uniqueness is enforced by the database rather than a lookup before
    // insert, which would leave a gap between the check and the write.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const message = messages(locale).api.emailTaken;
      return apiError(409, 'EMAIL_TAKEN', message, { email: message });
    }
    throw error;
  }
}
