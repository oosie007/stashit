import OpenAI from 'openai';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to add CORS headers
function corsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function POST(req: Request) {
  try {
    const { title, content, url } = await req.json();

    if (!title || !content || !url) {
      return corsHeaders(
        NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        )
      );
    }

    const prompt = `Given the following webpage content, generate 2-3 relevant tags that categorize this content. Return only the tags as a JSON array of strings, nothing else.
    
    Title: ${title}
    URL: ${url}
    Content: ${content.substring(0, 1000)}`; // Limit content length

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
      temperature: 0.5,
      max_tokens: 50,
    });

    const tagsResponse = completion.choices[0].message.content;
    let tags: string[];
    
    try {
      tags = JSON.parse(tagsResponse || '[]');
    } catch {
      tags = tagsResponse?.match(/["'](\w+)["']/g)?.map(t => t.replace(/["']/g, '')) || [];
    }

    return corsHeaders(
      NextResponse.json({ tags })
    );
  } catch (error) {
    console.error('Error generating tags:', error);
    return corsHeaders(
      NextResponse.json(
        { error: 'Failed to generate tags', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    );
  }
}

export async function OPTIONS(req: Request) {
  return corsHeaders(
    new NextResponse(null, { status: 200 })
  );
} 