import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import * as cheerio from 'cheerio';
import { sanitizeHtml } from '@/lib/utils';
import { PostgrestError } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Helper function to add CORS headers
function corsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

// Helper function to format error for response
function formatError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      details: (error as any).details || null,
      code: (error as any).code || null,
    };
  }
  if (typeof error === 'object' && error !== null) {
    return {
      message: String((error as any).message || 'Unknown error'),
      details: (error as any).details || null,
      code: (error as any).code || null,
    };
  }
  return {
    message: String(error),
    details: null,
    code: null,
  };
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

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    console.log('--- [POST /api/items] Start ---');
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('Missing NEXT_PUBLIC_SUPABASE_URL');
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
    }
    console.log('Raw request headers:', Object.fromEntries(req.headers.entries()));
    const data = await req.json();
    console.log('📥 Received save request:', JSON.stringify(data, null, 2));

    // Support for notes
    if (data.type === 'note') {
      if (!data.title || !data.user_id || !data.content) {
        throw new Error('Missing required fields: title, user_id, and content are required for notes');
      }
      const insertData = {
        type: 'note',
        title: data.title,
        content: data.content,
        tags: data.tags || [],
        user_id: data.user_id,
      };
      const { data: insertedData, error: insertError } = await supabase
        .from('stashed_items')
        .insert([insertData])
        .select()
        .single();
      if (insertError) {
        throw insertError;
      }
      return corsHeaders(
        NextResponse.json({
          success: true,
          message: 'Note saved successfully',
          data: insertedData
        })
      );
    }

    // Support for links: fetch metadata from URL
    if (data.type === 'link') {
      // Batch import
      if (Array.isArray(data.urls) && data.urls.length > 0) {
        const results = [];
        for (const row of data.urls) {
          const url = row.url;
          const created_at = row.created_at;
          try {
            const meta = await scrapeUrl(url);
            console.log('Batch scraped meta:', meta);
            const insertData = {
              type: 'link',
              title: meta?.title || url,
              url,
              summary: meta?.description || '',
              image_url: meta?.image || meta?.favicon || row.image_url || null,
              user_id: data.user_id,
              ...(created_at ? { created_at } : {}),
            };
            console.log('Batch insertData:', insertData);
            const { data: insertedData, error: insertError } = await supabase
              .from('stashed_items')
              .insert([insertData])
              .select()
              .single();
            if (insertError) {
              results.push({ url, success: false, error: insertError.message });
            } else {
              results.push({ url, success: true, data: insertedData });
            }
          } catch (err: any) {
            results.push({ url, success: false, error: err.message || 'Unknown error' });
          }
        }
        return corsHeaders(
          NextResponse.json({
            success: true,
            message: 'Batch import complete',
            results
          })
        );
      }
      // Single URL logic: fetch metadata before insert
      if (!data.url || !data.user_id) {
        console.error('❌ Missing required fields:', { url: !!data.url, user_id: !!data.user_id });
        throw new Error('Missing required fields: url and user_id are required');
      }
      let meta = { title: '', description: '', image: '', favicon: '' };
      try {
        const scraped = await scrapeUrl(data.url);
        meta = {
          title: scraped?.title || '',
          description: scraped?.description || '',
          image: scraped?.image || '',
          favicon: scraped?.favicon || ''
        };
        console.log('Single scraped meta:', meta);
      } catch (e) {
        console.warn('Failed to fetch metadata, proceeding with URL as title');
      }
      // Ensure title is always a non-empty string
      const safeTitle = (meta.title && meta.title.trim()) || (data.title && data.title.trim()) || (data.url && data.url.trim()) || 'Untitled';
      const insertData = {
        type: data.type || 'link',
        title: safeTitle,
        url: data.url,
        content: data.content,
        tags: data.tags || [],
        user_id: data.user_id,
        image_url: meta.image || meta.favicon || data.image_url || null,
        summary: meta.description || data.summary,
        highlighted_text: data.highlighted_text
      };
      console.log('Single insertData:', insertData);
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
      // Trigger AI synopsis for links only (not highlights or images)
      // if (insertData.type === 'link' && insertedData?.id && insertedData?.url) {
      //   console.log('🧠 Triggering AI synopsis in background for item:', insertedData.id, insertedData.url);
      //   const host = req.headers.get('host');
      //   const protocol = host && host.startsWith('localhost') ? 'http' : 'https';
      //   const aiSynopsisUrl = `${protocol}://${host}/api/items/ai-synopsis`;
      //   fetch(aiSynopsisUrl, {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({ url: insertedData.url, item_id: insertedData.id })
      //   })
      //   .then(async (res) => {
      //     const text = await res.text();
      //     console.log('AI synopsis background response:', res.status, text);
      //   })
      //   .catch((err) => {
      //     console.error('Error triggering AI synopsis:', err);
      //   });
      // } else {
      //   console.log('AI synopsis not triggered: type is not link or missing id/url');
      // }
      // TODO: Re-enable AI synopsis background fetch when ready
      console.log('--- [POST /api/items] End ---');
      return corsHeaders(
        NextResponse.json({ 
          success: true, 
          message: 'Item saved successfully',
          data: insertedData
        })
      );
    }

    // Trigger AI synopsis for links only (not highlights or images)
    // if (insertData.type === 'link' && insertedData?.id && insertedData?.url) {
    //   console.log('🧠 Triggering AI synopsis in background for item:', insertedData.id, insertedData.url);
    //   const host = req.headers.get('host');
    //   const protocol = host && host.startsWith('localhost') ? 'http' : 'https';
    //   const aiSynopsisUrl = `${protocol}://${host}/api/items/ai-synopsis`;
    //   fetch(aiSynopsisUrl, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ url: insertedData.url, item_id: insertedData.id })
    //   })
    //   .then(async (res) => {
    //     const text = await res.text();
    //     console.log('AI synopsis background response:', res.status, text);
    //   })
    //   .catch((err) => {
    //     console.error('Error triggering AI synopsis:', err);
    //   });
    // } else {
    //   console.log('AI synopsis not triggered: type is not link or missing id/url');
    // }
    // TODO: Re-enable AI synopsis background fetch when ready
    console.log('--- [POST /api/items] End ---');
    return corsHeaders(
      NextResponse.json({ 
        success: true, 
        message: 'Item saved successfully',
        data: insertedData
      })
    );
  } catch (error) {
    console.error('❌ Error creating item:', error);
    const formattedError = formatError(error);
    console.error('Error details:', formattedError);
    return corsHeaders(
      NextResponse.json(
        { 
          success: false,
          ...formattedError
        },
        { status: 500 }
      )
    );
  }
}

// New endpoint: POST /api/items/ai-synopsis
export async function POST_ai_synopsis(req: Request) {
  try {
    const { url, item_id } = await req.json();
    if (!url || !item_id) {
      return NextResponse.json({ error: 'Missing url or item_id' }, { status: 400 });
    }
    // Use the provided prompt template, only send the URL
    const prompt = `Summarize the content at this URL: ${url}\n\nI want the output in a structured bullet format with the following:\n\n- Article Title and Author\n- Purpose of the article/post\n- Structure or approach taken by the author (if applicable)\n- Key projects, ideas, or sections (grouped by difficulty or theme if relevant)\n- Main takeaways or final thoughts\n\nKeep it concise, clear, and easy to skim. Avoid unnecessary filler.`;
    // Call OpenAI to summarize
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that summarizes web pages for a tech-savvy reader.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 700,
      temperature: 0.7
    });
    const ai_synopsis_raw = completion.choices[0]?.message?.content || '';
    function extractField(label: string) {
      const match = ai_synopsis_raw.match(new RegExp(`-? ?${label}[:\-\n]+([^\n]*)`, 'i'));
      return match ? match[1].trim() : '';
    }
    const ai_synopsis_title = extractField('Article Title and Author');
    const ai_synopsis_purpose = extractField('Purpose of the article/post');
    const ai_synopsis_structure = extractField('Structure or approach taken by the author');
    const ai_synopsis_key_points = extractField('Key projects, ideas, or sections');
    const ai_synopsis_takeaways = extractField('Main takeaways or final thoughts');
    // Save to Supabase
    const { error } = await supabase
      .from('stashed_items')
      .update({
        ai_synopsis: ai_synopsis_raw,
        ai_synopsis_title,
        ai_synopsis_purpose,
        ai_synopsis_structure,
        ai_synopsis_key_points,
        ai_synopsis_takeaways
      })
      .eq('id', item_id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({
      ai_synopsis: ai_synopsis_raw,
      ai_synopsis_title,
      ai_synopsis_purpose,
      ai_synopsis_structure,
      ai_synopsis_key_points,
      ai_synopsis_takeaways
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS(req: Request) {
  return corsHeaders(
    new NextResponse(null, { status: 200 })
  );
}

export async function PATCH(req: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const data = await req.json();

    if (!data.id || !data.user_id || !data.title || !data.content) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    const { error } = await supabase
      .from('stashed_items')
      .update({ title: data.title, content: data.content })
      .eq('id', data.id)
      .eq('user_id', data.user_id);

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Note updated' });
  } catch (err) {
    return NextResponse.json({ success: false, message: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
} 