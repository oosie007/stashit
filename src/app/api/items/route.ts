import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import * as cheerio from 'cheerio';
import { sanitizeHtml } from '@/lib/utils';

// Helper function to add CORS headers
function corsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

async function scrapeUrl(url: string) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove scripts and other potentially harmful elements
    $('script').remove();
    $('iframe').remove();
    $('style').remove();
    $('noscript').remove();

    // Get metadata before removing meta tags
    const description = $('meta[name="description"]').attr('content');
    const image = $('meta[property="og:image"]').attr('content');
    const favicon = $('link[rel="icon"]').attr('href');

    // Then remove meta and link tags
    $('meta').remove();
    $('link').remove();

    return {
      title: $('title').text(),
      content: sanitizeHtml($('body').html() || ''),
      description,
      image,
      favicon,
    };
  } catch (error) {
    console.error('Error scraping URL:', error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    // Log the raw request
    console.log('Raw request headers:', Object.fromEntries(req.headers.entries()));
    
    const data = await req.json();
    console.log('📥 Received save request:', JSON.stringify(data, null, 2));
    
    // Validate required fields
    if (!data.url || !data.user_id) {
      console.error('❌ Missing required fields:', { url: !!data.url, user_id: !!data.user_id });
      throw new Error('Missing required fields: url and user_id are required');
    }

    // Log the data we're about to insert
    const insertData = {
      type: data.type || 'link',
      title: data.title,
      url: data.url,
      content: data.content,
      tags: data.tags || [],
      user_id: data.user_id,
      image_url: data.image_url,
      summary: data.summary,
      highlighted_text: data.highlighted_text,
      needs_scraping: true
    };

    // Log Supabase connection details (don't log keys!)
    console.log('🔌 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('🔑 Service Role Key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    console.log('💾 Attempting to insert:', JSON.stringify(insertData, null, 2));

    const { data: insertedData, error: insertError } = await supabase
      .from('stashed_items')
      .insert([insertData])
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Insert error:', JSON.stringify(insertError, null, 2));
      throw insertError;
    }

    console.log('✅ Initial save successful:', insertedData);

    try {
      // Use relative URL for API call
      const scrapeUrl = '/api/scrape';
      console.log('🔄 Calling scrape endpoint:', scrapeUrl);

      // Trigger scraping
      const scrapeResponse = await fetch(scrapeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: data.url })
      });

      console.log('📡 Scrape response status:', scrapeResponse.status);

      if (scrapeResponse.ok) {
        const scrapedData = await scrapeResponse.json();
        console.log('📥 Received scraped content length:', scrapedData.content?.length || 0);
        
        if (scrapedData.content) {
          // Update the item with scraped content
          const { error: updateError } = await supabase
            .from('stashed_items')
            .update({
              scraped_content: scrapedData.content,
              scraped_at: new Date().toISOString(),
              needs_scraping: false
            })
            .match({ url: data.url, user_id: data.user_id });

          if (updateError) {
            console.error('❌ Error updating with scraped content:', updateError);
          } else {
            console.log('✅ Updated item with scraped content');
          }
        } else {
          console.error('❌ No content in scrape response');
        }
      } else {
        const errorText = await scrapeResponse.text();
        console.error('❌ Scraping failed:', errorText);
      }
    } catch (scrapeError) {
      console.error('❌ Error during scraping process:', scrapeError);
      // Don't throw here - we still want to return success for the initial save
    }

    return corsHeaders(
      NextResponse.json({ 
        success: true, 
        message: 'Item saved successfully',
        data: insertedData
      })
    );
  } catch (error) {
    console.error('❌ Error creating item:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      details: error.details,
      hint: error.hint,
      code: error.code
    });

    return corsHeaders(
      NextResponse.json(
        { 
          error: error.message || 'Failed to create item',
          details: error.details || null,
          code: error.code || null
        },
        { status: 500 }
      )
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS(req: Request) {
  return corsHeaders(
    new NextResponse(null, { status: 200 })
  );
} 