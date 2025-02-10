import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth')
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p>Welcome, {session.user.email}</p>
      <form action="/auth/signout" method="post">
        <button type="submit" className="text-red-500 hover:underline">
          Sign Out
        </button>
      </form>
    </div>
  )
} 