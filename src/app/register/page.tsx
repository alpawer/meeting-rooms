import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import { AuthForm } from '@/components/AuthForm';

export default async function RegisterPage() {
  if (await getSessionUser()) redirect('/rooms');
  return <AuthForm mode="register" />;
}
