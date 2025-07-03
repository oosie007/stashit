import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { url, item_id } = await req.json();
    console.log('AI synopsis request:', { url, item_id });
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
      const match = ai_synopsis_raw.match(new RegExp(`-? ?${label}[:\n\-]+([^\n]*)`, 'i'));
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
      console.error('Supabase update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.log('AI synopsis saved for item:', item_id);
    return NextResponse.json({
      ai_synopsis: ai_synopsis_raw,
      ai_synopsis_title,
      ai_synopsis_purpose,
      ai_synopsis_structure,
      ai_synopsis_key_points,
      ai_synopsis_takeaways
    });
  } catch (err) {
    console.error('AI synopsis endpoint error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
} 