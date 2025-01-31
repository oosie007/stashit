import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  // Handle CORS
  const headersList = headers();
  const origin = headersList.get('origin') || '';
  
  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const { title, content, url } = await req.json();

    const prompt = `Given the following webpage content, generate 2-3 relevant tags that categorize this content. Return only the tags as a JSON array of strings, nothing else.
    
    Title: ${title}
    URL: ${url}
    Content: ${content}
    
    Example response format: ["technology", "productivity"]`;

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
    } catch (e) {
      // If parsing fails, extract words from the response
      tags = tagsResponse?.match(/["'](\w+)["']/g)?.map(t => t.replace(/["']/g, '')) || [];
    }

    // Return response with CORS headers
    return new NextResponse(JSON.stringify({ tags }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Error generating tags:', error);
    
    // Return error response with CORS headers
    return new NextResponse(
      JSON.stringify({ error: 'Failed to generate tags' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
}

// Add OPTIONS handler for CORS preflight requests
export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 