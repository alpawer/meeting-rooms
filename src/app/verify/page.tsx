import { verifyEmail } from '@/lib/verification';
import { VerifyResultView } from '@/components/VerifyResultView';

export const dynamic = 'force-dynamic';

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token ? await verifyEmail(token) : 'invalid';

  return <VerifyResultView ok={result === 'verified'} />;
}
