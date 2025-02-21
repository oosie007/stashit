import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const POCKET_CONSUMER_KEY = process.env.POCKET_CONSUMER_KEY!
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/pocket/callback`

export async function POST() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get the current session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get request token from Pocket
    const response = await fetch('https://getpocket.com/v3/oauth/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Accept': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        consumer_key: POCKET_CONSUMER_KEY,
        redirect_uri: REDIRECT_URI,
        state: 'stashit',
      }).toString(),
    })

    const responseText = await response.text()
    console.log('Pocket request response:', responseText)

    if (!response.ok) {
      throw new Error(`Failed to get request token: ${response.status} ${response.statusText} - ${responseText}`)
    }

    // Parse the response as urlencoded
    const params = new URLSearchParams(responseText)
    const code = params.get('code')

    if (!code) {
      throw new Error('No request token in response')
    }

    // First delete any existing auth records for this user
    await supabase
      .from('user_pocket_auth')
      .delete()
      .eq('user_id', session.user.id)

    // Then store the new request token
    const { error: insertError } = await supabase
      .from('user_pocket_auth')
      .insert({
        user_id: session.user.id,
        request_token: code,
        status: 'pending',
        created_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('Failed to store request token:', insertError)
      throw new Error('Failed to store request token')
    }

    // Generate the authorization URL
    const authUrl = `https://getpocket.com/auth/authorize?request_token=${code}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=stashit`

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('Pocket auth error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Pocket authentication' },
      { status: 500 }
    )
  }
} 