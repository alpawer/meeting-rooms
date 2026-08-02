'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ApiError, api } from '@/lib/client-api';
import { usePreferences } from '@/components/Preferences';

type Mode = 'login' | 'register';

export function AuthForm({ mode }: { mode: Mode }) {
  const { t, locale } = usePreferences();
  const router = useRouter();

  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const isRegister = mode === 'register';

  function update(key: keyof typeof values, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: '' }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setFormError(null);
    setFieldErrors({});

    try {
      await api(isRegister ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Accept-Language': locale },
        body: JSON.stringify(
          isRegister ? values : { email: values.email, password: values.password },
        ),
      });
      router.replace('/rooms');
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'NETWORK') setFormError(t.ui.serverUnavailable);
        else if (error.fields && Object.keys(error.fields).length > 0) setFieldErrors(error.fields);
        else setFormError(error.message);
      } else {
        setFormError(t.ui.somethingWentWrong);
      }
      setPending(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <p className="eyebrow">{t.ui.appName}</p>
        <h1 style={{ marginBottom: 20 }}>{isRegister ? t.auth.registerTitle : t.auth.loginTitle}</h1>

        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}

        <form onSubmit={submit} noValidate>
          {isRegister && (
            <label className="field">
              <span className="field-label">{t.auth.name}</span>
              <input
                className="input"
                value={values.name}
                onChange={(event) => update('name', event.target.value)}
                aria-invalid={Boolean(fieldErrors.name)}
                autoComplete="name"
              />
              {fieldErrors.name ? (
                <span className="field-error">{fieldErrors.name}</span>
              ) : (
                <span className="field-hint">{t.auth.nameHint}</span>
              )}
            </label>
          )}

          <label className="field">
            <span className="field-label">{t.auth.email}</span>
            <input
              className="input"
              type="email"
              value={values.email}
              onChange={(event) => update('email', event.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
              autoComplete="email"
            />
            {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
          </label>

          <label className="field">
            <span className="field-label">{t.auth.password}</span>
            <span className="input-with-action">
              <input
                className="input"
                type={passwordVisible ? 'text' : 'password'}
                value={values.password}
                onChange={(event) => update('password', event.target.value)}
                aria-invalid={Boolean(fieldErrors.password)}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                className="input-action"
                onClick={() => setPasswordVisible((visible) => !visible)}
                aria-pressed={passwordVisible}
                aria-label={passwordVisible ? t.auth.hidePassword : t.auth.showPassword}
                title={passwordVisible ? t.auth.hidePassword : t.auth.showPassword}
              >
                {passwordVisible ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M3 3l18 18" strokeLinecap="round" />
                    <path d="M10.6 6.2A9.9 9.9 0 0 1 12 6c5 0 9 4.5 9 6a12 12 0 0 1-2.4 3.1M6.5 8.1C4.3 9.5 3 11.4 3 12c0 1.5 4 6 9 6a9.6 9.6 0 0 0 3.6-.7" strokeLinecap="round" />
                    <path d="M9.9 10.1a3 3 0 0 0 4.1 4.2" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M3 12s3.6-6 9-6 9 6 9 6-3.6 6-9 6-9-6-9-6Z" />
                    <circle cx="12" cy="12" r="2.6" />
                  </svg>
                )}
              </button>
            </span>
            {fieldErrors.password ? (
              <span className="field-error">{fieldErrors.password}</span>
            ) : (
              isRegister && <span className="field-hint">{t.auth.passwordHint}</span>
            )}
          </label>

          <button type="submit" className="btn btn-primary" disabled={pending} style={{ width: '100%' }}>
            {pending
              ? isRegister ? t.auth.pendingRegister : t.auth.pendingLogin
              : isRegister ? t.auth.submitRegister : t.auth.submitLogin}
          </button>
        </form>

        <p className="auth-footer">
          {isRegister ? t.auth.haveAccount : t.auth.noAccount}{' '}
          <Link href={isRegister ? '/login' : '/register'}>
            {isRegister ? t.auth.submitLogin : t.ui.signUp}
          </Link>
        </p>
      </div>
    </div>
  );
}
