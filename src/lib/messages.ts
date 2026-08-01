/**
 * All user facing strings live here so both locales stay in sync.
 * The English dictionary is typed from the Ukrainian one, so a missing
 * translation is a compile error rather than a runtime surprise.
 */

export const LOCALES = ['uk', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'uk';

const uk = {
  validation: {
    nameEmpty: "Ім'я не може бути порожнім",
    nameTooLong: "Ім'я задовге",
    emailRequired: 'Вкажіть email',
    emailInvalid: 'Схоже, це не email',
    passwordRequired: 'Вкажіть пароль',
    passwordTooShort: 'Пароль від 8 символів',
    passwordTooLong: 'Пароль до 72 символів',
    roomRequired: 'Оберіть кімнату',
    titleRequired: "Назва обов'язкова",
    titleTooLong: 'Назва до 100 символів',
    startInvalid: 'Некоректний час початку',
    endInvalid: 'Некоректний час завершення',
  },
  api: {
    validationFailed: 'Перевірте заповнені поля.',
    emailTaken: 'Такий email уже зареєстрований.',
    invalidCredentials: 'Невірний email або пароль.',
    unauthorized: 'Потрібно увійти.',
    forbidden: 'Немає доступу до цього ресурсу.',
    notFound: 'Не знайдено.',
  },
  booking: {
    invalidRange: 'Час завершення має бути пізніше за час початку.',
    notAligned: 'Час має бути кратним 30 хвилинам.',
    tooShort: 'Мінімальна тривалість 30 хвилин.',
    tooLong: 'Максимальна тривалість 4 години.',
    inThePast: 'Бронювати можна лише майбутній час.',
    outsideWorkingHours: 'Кімнати доступні з 09:00 до 19:00 за часом офісу.',
    slotTaken: 'Цей час уже зайнятий.',
  },
} as const;

/**
 * Keys come from the Ukrainian dictionary, values relax to string.
 * A missing key is a compile error, a translated value is not.
 */
type Dictionary = { [S in keyof typeof uk]: { [K in keyof (typeof uk)[S]]: string } };

const en: Dictionary = {
  validation: {
    nameEmpty: 'Name cannot be empty',
    nameTooLong: 'Name is too long',
    emailRequired: 'Enter an email',
    emailInvalid: 'This does not look like an email',
    passwordRequired: 'Enter a password',
    passwordTooShort: 'Password must be at least 8 characters',
    passwordTooLong: 'Password must be at most 72 characters',
    roomRequired: 'Pick a room',
    titleRequired: 'Title is required',
    titleTooLong: 'Title must be at most 100 characters',
    startInvalid: 'Invalid start time',
    endInvalid: 'Invalid end time',
  },
  api: {
    validationFailed: 'Check the submitted fields.',
    emailTaken: 'This email is already registered.',
    invalidCredentials: 'Wrong email or password.',
    unauthorized: 'You need to sign in.',
    forbidden: 'You do not have access to this resource.',
    notFound: 'Not found.',
  },
  booking: {
    invalidRange: 'The end time must be later than the start time.',
    notAligned: 'Time must be aligned to 30 minutes.',
    tooShort: 'Minimum duration is 30 minutes.',
    tooLong: 'Maximum duration is 4 hours.',
    inThePast: 'Only future time can be booked.',
    outsideWorkingHours: 'Rooms are available from 09:00 to 19:00 office time.',
    slotTaken: 'This time is already taken.',
  },
};

const DICTIONARIES: Record<Locale, Dictionary> = { uk, en };

export function messages(locale: Locale = DEFAULT_LOCALE): Dictionary {
  return DICTIONARIES[locale];
}
