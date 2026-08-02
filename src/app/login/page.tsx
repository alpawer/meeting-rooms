import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import { AuthForm } from '@/components/AuthForm';

export default async function LoginPage() {
  if (await getSessionUser()) redirect('/rooms');
  return <AuthForm mode="login" />;
}
