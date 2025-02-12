import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AuthForm from '@/components/auth-form';

export default async function Auth({
  searchParams,
}: {
  searchParams: { mode?: string };
}) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-2">
      <AuthForm initialMode={searchParams.mode === 'register'} />
    </div>
  );
} 