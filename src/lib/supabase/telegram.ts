// Helper functions for Telegram <-> StashIt user mapping
// TODO: Implement with your DB (Supabase)

import { supabase } from '@/lib/supabase';

export async function getUserIdByTelegramId(telegramUserId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('telegram_user_links')
    .select('stashit_user_id')
    .eq('telegram_user_id', telegramUserId)
    .single();
  if (error || !data) return null;
  return data.stashit_user_id;
}

export async function createMapping(telegramUserId: string, stashitUserId: string) {
  return supabase
    .from('telegram_user_links')
    .insert([{ telegram_user_id: telegramUserId, stashit_user_id: stashitUserId }]);
}

// Generate a random code and store it for the user
export async function generateLinkCode(stashitUserId: string): Promise<string> {
  const code = Math.random().toString(36).substring(2, 10).toUpperCase();
  await supabase.from('telegram_link_codes').insert([{ code, stashit_user_id: stashitUserId }]);
  return code;
}

// Validate the code and return the user id if valid (and not expired)
export async function validateLinkCode(code: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('telegram_link_codes')
    .select('stashit_user_id, expires_at')
    .eq('code', code)
    .single();
  if (error || !data) return null;
  if (new Date(data.expires_at) < new Date()) return null;
  return data.stashit_user_id;
}

// Optionally, delete the code after use
export async function deleteLinkCode(code: string) {
  await supabase.from('telegram_link_codes').delete().eq('code', code);
} 