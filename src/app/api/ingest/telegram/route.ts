import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserIdByTelegramId } from '@/lib/supabase/telegram'

export async function POST(req: Request) {
  try {
    const data = await req.json()
    const { type, content, file_url, url, telegram_user_id, file_name } = data
    if (!telegram_user_id || !type) {
      return NextResponse.json({ success: false, error: 'Missing telegram_user_id or type' }, { status: 400 })
    }
    // 1. Lookup stashit user_id from telegram_user_id
    const user_id = await getUserIdByTelegramId(telegram_user_id)
    if (!user_id) {
      return NextResponse.json({ success: false, error: 'Telegram user not linked to StashIt account' }, { status: 401 })
    }
    // 2. Build insert data based on type
    let insertData: any = { user_id, type }
    if (type === 'note') {
      if (!content) return NextResponse.json({ success: false, error: 'Missing content for note' }, { status: 400 })
      insertData.content = content
      insertData.title = content.slice(0, 60) // Use first 60 chars as title
    } else if (type === 'link') {
      if (!url) return NextResponse.json({ success: false, error: 'Missing url for link' }, { status: 400 })
      insertData.url = url
      insertData.title = url
    } else if (type === 'image' || type === 'document') {
      if (!file_url) return NextResponse.json({ success: false, error: 'Missing file_url' }, { status: 400 })
      insertData.image_url = file_url
      if (type === 'document') insertData.title = file_name || 'Document'
    } else {
      return NextResponse.json({ success: false, error: 'Unsupported type' }, { status: 400 })
    }
    // 3. Insert into stashed_items
    const { data: inserted, error } = await supabase.from('stashed_items').insert([insertData]).select().single()
    if (error) {
      console.error('[Telegram Ingest] Insert error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    console.log('[Telegram Ingest] Saved:', inserted)
    return NextResponse.json({ success: true, data: inserted })
  } catch (err) {
    console.error('[Telegram Ingest] Error:', err)
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
} 