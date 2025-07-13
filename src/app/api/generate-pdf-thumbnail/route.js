import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createCanvas } from 'canvas';
import pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(req) {
  try {
    const { file_path, bucket } = await req.json();
    if (!file_path || !bucket) return NextResponse.json({ error: 'Missing file_path or bucket' }, { status: 400 });

    // Download PDF
    const { data, error } = await supabase.storage.from(bucket).download(file_path);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Render PDF
    const pdfData = await data.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.0 });
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');
    await page.render({ canvasContext: context, viewport }).promise;
    const buffer = canvas.toBuffer('image/png');

    // Upload thumbnail
    const thumbPath = file_path.replace(/\.pdf$/i, '_thumb.png');
    const { error: uploadError } = await supabase.storage.from(bucket).upload(thumbPath, buffer, {
      contentType: 'image/png',
      upsert: true,
    });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    // Get public/signed URL
    const { data: urlData } = await supabase.storage.from(bucket).getPublicUrl(thumbPath);
    return NextResponse.json({ thumbnail_url: urlData.publicUrl, thumbPath });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
} 