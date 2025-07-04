const fs = require('fs');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');

// === CONFIGURATION ===
const supabaseUrl = 'https://YOUR_PROJECT.supabase.co'; // <-- Replace with your Supabase project URL
const supabaseKey = 'YOUR_SERVICE_ROLE_KEY';            // <-- Replace with your Supabase service role key
const userId = 'YOUR_USER_ID';                          // <-- Replace with your Supabase user id
const csvFile = 'Oosie_Links_all.csv';                  // Path to your CSV file

const supabase = createClient(supabaseUrl, supabaseKey);

const results = [];
fs.createReadStream(csvFile)
  .pipe(csv())
  .on('data', (row) => {
    // Map CSV columns to Supabase fields
    // Fallbacks for missing fields
    results.push({
      title: row.Name || null,
      created_at: row.Created ? new Date(row.Created).toISOString() : null,
      highlighted_text: row.Highlight || null,
      url: row.URL || row.url || null,
      tags: row.Tags ? row.Tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      user_id: userId,
      image_url: row.image_url || null,
      summary: row.summary || null,
      // Add more mappings if you have more columns
      type: row.Highlight ? 'highlight' : 'link', // Guess type based on presence of highlight
    });
  })
  .on('end', async () => {
    console.log(`Read ${results.length} rows from CSV. Importing...`);
    for (const item of results) {
      // Remove empty fields
      Object.keys(item).forEach(key => (item[key] === null || item[key] === '') && delete item[key]);
      const { error } = await supabase.from('stashed_items').insert([item]);
      if (error) {
        console.error('Error inserting:', item, error);
      } else {
        console.log('Inserted:', item.title);
      }
    }
    console.log('Import complete!');
  });
