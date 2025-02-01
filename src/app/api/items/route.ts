import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Helper function to add CORS headers
function corsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const item = await prisma.item.create({
      data: {
        type: data.type,
        title: data.title,
        url: data.url,
        content: data.content,
        tags: data.tags
      }
    });
    
    return corsHeaders(
      NextResponse.json(item)
    );
  } catch (error) {
    console.error('Error creating item:', error);
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