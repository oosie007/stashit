import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserIdByTelegramId } from '@/lib/supabase/telegram'
import { scrapeUrl } from '@/lib/utils'; 

function detectFileType(fileName: string = '', mimeType: string = ''): { type: string } {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (mimeType.startsWith('image/') || ['jpg','jpeg','png','gif','bmp','webp','svg'].includes(ext)) {
    return { type: 'image' };
  }
  if (mimeType.startsWith('audio/') || ['mp3','wav','ogg','m4a','aac'].includes(ext)) {
    return { type: 'audio' };
  }
  if (mimeType.startsWith('video/') || ['mp4','mov','avi','webm','mkv'].includes(ext)) {
    return { type: 'video' };
  }
  if (['pdf','doc','docx','xls','xlsx','ppt','pptx','txt','rtf','odt','csv','zip','rar'].includes(ext)) {
    return { type: 'document' };
  }
  // Default to document for unknown
  return { type: 'document' };
}

export async function POST(req: Request) {
  try {
    const data = await req.json()
    const { content, file_url, file_path, url, telegram_user_id, file_name, mime_type } = data
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
    if (file_path) {
      // Detect file type
      const { type } = detectFileType(file_name, mime_type)
      insertData.type = type
      insertData.file_path = file_path
      if (file_name) insertData.file_name = file_name
      if (mime_type) insertData.mime_type = mime_type
      if (['document', 'audio', 'image', 'video'].includes(type)) {
        insertData.title = file_name || type || 'Untitled';
      }
    } else if (detectedUrl) {
      // Handle link: enrich and save
      const meta = await scrapeUrl(detectedUrl)
      insertData.type = 'link'
      insertData.url = detectedUrl
      insertData.title = meta?.title || detectedUrl
      insertData.summary = meta?.description || ''
      insertData.content = content // Optionally save original message
    } else if (content) {
      // Fallback: save as note
      insertData.type = 'note'
      insertData.content = content
      insertData.title = content.slice(0, 60)
    } else {
      return NextResponse.json({ success: false, error: 'No content or file to save' }, { status: 400 })
    }
    // Ensure title is always set
    if (!insertData.title) {
      insertData.title = file_name || insertData.type || 'Untitled';
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