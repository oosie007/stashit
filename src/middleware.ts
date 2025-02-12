import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Allow the home page (/) to be accessible without auth
  if (req.nextUrl.pathname === '/') {
    return res
  }

  // Protect dashboard and other routes
  if (!session && req.nextUrl.pathname !== '/auth') {
    return NextResponse.redirect(new URL('/auth', req.url))
  }

  // If user is signed in and tries to access /auth, redirect to dashboard
  if (session && req.nextUrl.pathname === '/auth') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/auth']
} 

