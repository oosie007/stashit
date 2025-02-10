import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { App } from '@/components/app'

export default async function DashboardPage() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth')
  }

  return <App userId={session.user.id} />
} 