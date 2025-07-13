const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const { createCanvas } = require('canvas');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

module.exports = async (req, res) => {
  const { file_path, bucket } = req.body;
  if (!file_path || !bucket) return res.status(400).json({ error: 'Missing file_path or bucket' });

  // Download PDF
  const { data, error } = await supabase.storage.from(bucket).download(file_path);
  if (error) return res.status(500).json({ error: error.message });

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
  if (uploadError) return res.status(500).json({ error: uploadError.message });

  // Get public/signed URL
  const { data: urlData } = await supabase.storage.from(bucket).getPublicUrl(thumbPath);
  return res.status(200).json({ thumbnail_url: urlData.publicUrl, thumbPath });
};