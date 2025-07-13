const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const fs = require('fs');
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

module.exports = async (req, res) => {
  const { file_path, bucket } = req.body;
  if (!file_path || !bucket) return res.status(400).json({ error: 'Missing file_path or bucket' });

  // Download video
  const { data, error } = await supabase.storage.from(bucket).download(file_path);
  if (error) return res.status(500).json({ error: error.message });

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
  if (uploadError) return res.status(500).json({ error: uploadError.message });

  // Get public/signed URL
  const { data: urlData } = await supabase.storage.from(bucket).getPublicUrl(thumbPath);
  return res.status(200).json({ thumbnail_url: urlData.publicUrl, thumbPath });
};