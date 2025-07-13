import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(req) {
  try {
    const { file_path, bucket } = await req.json();
    if (!file_path || !bucket) return NextResponse.json({ error: 'Missing file_path or bucket' }, { status: 400 });

    // Download video
    const { data, error } = await supabase.storage.from(bucket).download(file_path);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Save to temp file
    const tempVideo = `/tmp/video.mp4`;
    const tempThumb = `/tmp/thumb.png`;
    fs.writeFileSync(tempVideo, Buffer.from(await data.arrayBuffer()));

    // Generate thumbnail
    await new Promise((resolve, reject) => {
      ffmpeg(tempVideo)
        .screenshots({
          timestamps: ['1'],
          filename: 'thumb.png',
          folder: '/tmp',
          size: '320x240'
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Upload thumbnail
    const buffer = fs.readFileSync(tempThumb);
    const thumbPath = file_path.replace(/\.[^.]+$/, '_thumb.png');
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