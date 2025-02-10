import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import * as cheerio from 'cheerio';
import { sanitizeHtml } from '@/lib/utils';
import { headers } from 'next/headers'

// Helper function to get base URL
function getBaseUrl(headers: Headers) {
  try {
    const protocol = headers.get('x-forwarded-proto') || 'http';
    const host = headers.get('host') || '';
    return `${protocol}://${host}`;
  } catch (error) {
    console.error('Error getting base URL:', error);
    // Fallback to relative URL which will work in both dev and prod
    return '';
  }
}

// Helper function to add CORS headers
function corsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
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
    const data = await req.json();
    console.log('📥 Received save request for URL:', data.url);
    
    const { error: insertError } = await supabase
      .from('stashed_items')
      .insert([{
        type: data.type,
        title: data.title,
        url: data.url,
        content: data.content,
        tags: data.tags,
        user_id: data.user_id,
        image_url: data.image_url,
        summary: data.summary,
        highlighted_text: data.highlighted_text,
        needs_scraping: true
      }]);
    
    if (insertError) throw insertError;
    console.log('💾 Initial save successful, triggering scraping');

    try {
      // Get headers safely
      const headersList = headers();
      const baseUrl = getBaseUrl(headersList);
      
      console.log('🔄 Calling scrape endpoint:', `${baseUrl}/api/scrape`);

      // Trigger scraping
      const scrapeResponse = await fetch(`${baseUrl}/api/scrape`, {
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
    }

    return corsHeaders(
      NextResponse.json({ success: true })
    );
  } catch (error) {
    console.error('❌ Error creating item:', error);
    return corsHeaders(
      NextResponse.json(
        { error: 'Failed to create item' },
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