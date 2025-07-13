import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserIdByTelegramId } from '@/lib/supabase/telegram'
import { scrapeUrl } from '@/lib/utils';

function detectFileType(fileName: string = '', mimeType: string = ''): { type: string, field: string } {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (mimeType.startsWith('image/') || ['jpg','jpeg','png','gif','bmp','webp','svg'].includes(ext)) {
    return { type: 'image', field: 'image_url' };
  }
  if (mimeType.startsWith('audio/') || ['mp3','wav','ogg','m4a','aac'].includes(ext)) {
    return { type: 'audio', field: 'audio_url' };
  }
  if (mimeType.startsWith('video/') || ['mp4','mov','avi','webm','mkv'].includes(ext)) {
    return { type: 'video', field: 'video_url' };
  }
  if (['pdf','doc','docx','xls','xlsx','ppt','pptx','txt','rtf','odt','csv','zip','rar'].includes(ext)) {
    return { type: 'document', field: 'document_url' };
  }
  // Default to document for unknown
  return { type: 'document', field: 'document_url' };
}

export async function POST(req: Request) {
  try {
    const data = await req.json()
    const { content, file_url, url, telegram_user_id, file_name, mime_type } = data
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
      // Detect file type
      const { type, field } = detectFileType(file_name, mime_type)
      insertData.type = type
      insertData[field] = file_url
      insertData.file_url = file_url
      if (file_name) insertData.file_name = file_name
      if (mime_type) insertData.mime_type = mime_type
      // For images, also set image_url for legacy UI
      if (type === 'image') insertData.image_url = file_url
      // For documents, set title to file_name
      if (type === 'document' && file_name) insertData.title = file_name
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