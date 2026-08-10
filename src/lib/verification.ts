import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/db';

export function createVerificationToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Prints the confirmation link to the server log.
 *
 * The spec asks for dev mode without a real SMTP server, so the link goes to
 * stdout instead of an inbox. In production this is where a mailer would go.
 */
export function logVerificationLink(email: string, token: string): void {
  const base = process.env.APP_URL ?? 'http://localhost:3000';
  console.log(`\nConfirm ${email}: ${base}/verify?token=${token}\n`);
}

export type VerifyResult = 'verified' | 'invalid';

/**
 * Confirms an address. The token is cleared on success, so the same link
 * cannot be used twice.
 */
export async function verifyEmail(token: string): Promise<VerifyResult> {
  const user = await prisma.user.findUnique({
    where: { verificationToken: token },
    select: { id: true },
  });
  if (!user) return 'invalid';

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date(), verificationToken: null },
  });
  return 'verified';
}
