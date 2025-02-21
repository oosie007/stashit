import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const POCKET_CONSUMER_KEY = process.env.POCKET_CONSUMER_KEY!

interface PocketAuth {
  request_token: string;
  created_at: string;
}

export async function GET(request: Request) {
  try {
    // Get cookies asynchronously
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })
    
    // Log the incoming request URL and params
    console.log('Callback URL:', request.url)
    const searchParams = new URL(request.url).searchParams
    console.log('Callback params:', Object.fromEntries(searchParams))

    // Get the current session
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession()

    if (authError || !session?.user) {
      console.error('Auth error:', authError)
      return NextResponse.redirect(new URL('/auth', request.url))
    }

    // Get the stored request token
    const { data: authData, error: dbError } = await supabase
      .from('user_pocket_auth')
      .select('request_token,created_at')
      .eq('user_id', session.user.id)
      .single() as { data: PocketAuth | null, error: any }

    if (dbError) {
      console.error('Database error:', dbError)
      throw new Error('Failed to get request token from database')
    }

    if (!authData?.request_token) {
      console.error('No request token found in database')
      throw new Error('No request token found')
    }

    console.log('Found request token:', authData.request_token)

    // Exchange request token for access token
    const response = await fetch('https://getpocket.com/v3/oauth/authorize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Accept': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        consumer_key: POCKET_CONSUMER_KEY,
        code: authData.request_token,
      }).toString(),
    })

    const responseText = await response.text()
    console.log('Pocket API response status:', response.status)
    console.log('Pocket API response headers:', Object.fromEntries(response.headers))
    console.log('Pocket API response body:', responseText)

    // Check if the token has expired (older than 1 hour)
    const tokenCreatedAt = new Date(authData.created_at)
    const now = new Date()
    const tokenAge = now.getTime() - tokenCreatedAt.getTime()
    const oneHour = 60 * 60 * 1000

    if (tokenAge > oneHour) {
      // Delete the expired token
      await supabase
        .from('user_pocket_auth')
        .delete()
        .eq('user_id', session.user.id)

      // Redirect back to start the auth process again
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      return NextResponse.redirect(new URL('/dashboard?pocket=expired', baseUrl))
    }

    // Parse the response as urlencoded data
    const params = new URLSearchParams(responseText)
    const access_token = params.get('access_token')
    const username = params.get('username')

    if (!access_token) {
      console.error('Response parsed but no access token found:', responseText)
      throw new Error('No access token in response')
    }

    console.log('Successfully got access token for user:', username)

    // Store the access token
    const { error: updateError } = await supabase
      .from('user_pocket_auth')
      .update({
        access_token,
        username: username || null,
        status: 'connected'
      })
      .eq('user_id', session.user.id)

    if (updateError) {
      console.error('Failed to update database:', updateError)
      throw new Error('Failed to store access token')
    }

    // Import Pocket items
    const importUrl = new URL('/api/pocket/import', request.url)
    console.log('Importing items from:', importUrl.toString())

    const importResponse = await fetch(importUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add cookie header to maintain session
        Cookie: request.headers.get('cookie') || '',
      },
      body: JSON.stringify({ access_token }),
    })

    if (!importResponse.ok) {
      const importError = await importResponse.text()
      console.error('Failed to import items:', importError)
      throw new Error(`Failed to import items: ${importError}`)
    }

    const importResult = await importResponse.json()
    console.log('Import result:', importResult)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return NextResponse.redirect(
      new URL(`/dashboard?pocket=connected&imported=${importResult.imported}`, baseUrl)
    )
  } catch (error) {
    console.error('Pocket callback error:', error)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return NextResponse.redirect(new URL('/dashboard?pocket=error', baseUrl))
  }
} 