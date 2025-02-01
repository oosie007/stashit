'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to auth page by default
    router.push('/auth')
  }, [router])

  return null
}