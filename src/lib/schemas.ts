import { z } from 'zod';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/lib/password';
import { messages } from '@/lib/messages';

/**
 * Schemas are built per locale so validation errors come back already
 * translated. The API resolves the locale from the request.
 */
export function buildSchemas(locale?: Parameters<typeof messages>[0]) {
  const m = messages(locale).validation;

  return {
    register: z.object({
      name: z.string().trim().min(1, m.nameEmpty).max(80, m.nameTooLong),
      email: z.string().trim().min(1, m.emailRequired).email(m.emailInvalid),
      password: z
        .string()
        .min(PASSWORD_MIN_LENGTH, m.passwordTooShort)
        .max(PASSWORD_MAX_LENGTH, m.passwordTooLong),
    }),

    login: z.object({
      email: z.string().trim().min(1, m.emailRequired),
      password: z.string().min(1, m.passwordRequired),
    }),

    createBooking: z.object({
      roomId: z.string().min(1, m.roomRequired),
      title: z.string().trim().min(1, m.titleRequired).max(100, m.titleTooLong),
      startsAt: z.string().datetime({ message: m.startInvalid }),
      endsAt: z.string().datetime({ message: m.endInvalid }),
    }),
  };
}

export type CreateBookingInput = z.infer<ReturnType<typeof buildSchemas>['createBooking']>;
