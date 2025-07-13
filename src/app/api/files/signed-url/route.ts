import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const BUCKET_NAME = 'stashit-bucket'; // Change if your bucket name is different

export async function POST(req: Request) {
  try {
    const { file_path } = await req.json();
    if (!file_path) {
      return NextResponse.json({ error: 'Missing file_path' }, { status: 400 });
    }
    const { data, error } = await supabase
      .storage
      .from(BUCKET_NAME)
      .createSignedUrl(file_path, 60 * 60 * 24 * 7); // 7 days
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
} 