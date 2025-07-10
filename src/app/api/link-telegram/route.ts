import { NextResponse } from 'next/server'
import { createMapping, validateLinkCode, deleteLinkCode } from '@/lib/supabase/telegram'

export async function POST(req: Request) {
  try {
    const { code, telegram_user_id } = await req.json()
    if (!code || !telegram_user_id) {
      return NextResponse.json({ success: false, error: 'Missing code or telegram_user_id' }, { status: 400 })
    }
    // Validate the code and get the stashit user id
    const stashit_user_id = await validateLinkCode(code)
    if (!stashit_user_id) {
      return NextResponse.json({ success: false, error: 'Invalid or expired code' }, { status: 401 })
    }
    // Create the mapping
    const { error } = await createMapping(telegram_user_id, stashit_user_id)
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    await deleteLinkCode(code)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
} 