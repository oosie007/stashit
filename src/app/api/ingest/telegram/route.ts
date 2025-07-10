import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserIdByTelegramId } from '@/lib/supabase/telegram'
import { scrapeUrl } from '@/lib/utils';

export async function POST(req: Request) {
  try {
    const data = await req.json()
    const { content, file_url, url, telegram_user_id, file_name } = data
    if (!telegram_user_id) {
      return NextResponse.json({ success: false, error: 'Missing telegram_user_id' }, { status: 400 })
    }
    // 1. Lookup stashit user_id from telegram_user_id
    const user_id = await getUserIdByTelegramId(telegram_user_id)
    if (!user_id) {
      return NextResponse.json({ success: false, error: 'Telegram user not linked to StashIt account' }, { status: 401 })
    }
    // 2. Detect if content or url contains a link
    let insertData: any = { user_id }
    const urlRegex = /(https?:\/\/[^\s]+)/g
    let detectedUrl = url || (typeof content === 'string' && content.match(urlRegex)?.[0])
    if (file_url) {
      // Handle image or document
      insertData.type = 'image'
      insertData.image_url = file_url
      if (file_name) insertData.title = file_name
    } else if (detectedUrl) {
      // Handle link: enrich and save
      const meta = await scrapeUrl(detectedUrl)
      insertData.type = 'link'
      insertData.url = detectedUrl
      insertData.title = meta?.title || detectedUrl
      insertData.summary = meta?.description || ''
      insertData.image_url = meta?.image || meta?.favicon || null
      insertData.content = content // Optionally save original message
    } else if (content) {
      // Fallback: save as note
      insertData.type = 'note'
      insertData.content = content
      insertData.title = content.slice(0, 60)
    } else {
      return NextResponse.json({ success: false, error: 'No content or file to save' }, { status: 400 })
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