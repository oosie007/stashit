import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const POCKET_CONSUMER_KEY = process.env.POCKET_CONSUMER_KEY!

interface PocketItem {
  item_id: string;
  resolved_title?: string;
  given_title?: string;
  resolved_url?: string;
  given_url: string;
  excerpt?: string;
  top_image_url?: string;
  time_added: string;
}

export async function POST(request: Request) {
  try {
    // Get cookies asynchronously
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })

    // Parse request body before any async operations
    const { access_token } = await request.json()
    
    // Get the current user
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession()

    if (authError || !session?.user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get items from Pocket
    const response = await fetch('https://getpocket.com/v3/get', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Accept': 'application/json',
      },
      body: new URLSearchParams({
        consumer_key: POCKET_CONSUMER_KEY,
        access_token,
        detailType: 'complete',
        state: 'all',
        sort: 'newest',
      }).toString(),
    })

    if (!response.ok) {
      console.error('Pocket API error:', await response.text())
      throw new Error('Failed to fetch Pocket items')
    }

    const data = await response.json()
    console.log('Pocket items received:', Object.keys(data.list || {}).length)

    if (!data.list) {
      console.log('No items found in Pocket')
      return NextResponse.json({ success: true, imported: 0 })
    }

    // Transform and store items
    const items = Object.values(data.list as Record<string, PocketItem>).map((item) => ({
      user_id: session.user.id,
      title: item.resolved_title || item.given_title || 'Untitled',
      url: item.resolved_url || item.given_url,
      type: 'pocket',
      source_id: item.item_id,
      summary: item.excerpt || null,
      image_url: item.top_image_url || null,
      created_at: new Date(parseInt(item.time_added) * 1000).toISOString(),
    }))

    console.log('Processing items:', items.length)
    console.log('Sample item:', items[0])

    // Insert items in batches
    const batchSize = 100
    let importedCount = 0

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)
      const { error } = await supabase.from('stashed_items').upsert(batch, {
        onConflict: 'user_id,source_id,type',
        ignoreDuplicates: true
      })

      if (error) {
        console.error('Batch insert error:', error)
        throw error
      }

      importedCount += batch.length
      console.log(`Imported batch ${i/batchSize + 1}:`, batch.length, 'items')
    }

    console.log('Total items imported:', importedCount)

    return NextResponse.json({ 
      success: true, 
      imported: importedCount 
    })
  } catch (error) {
    console.error('Pocket import error:', error)
    return NextResponse.json(
      { error: 'Failed to import Pocket items' },
      { status: 500 }
    )
  }
} 