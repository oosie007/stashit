import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import * as cheerio from 'cheerio'
import { sanitizeHtml } from '@/lib/utils'

export async function POST(req: Request) {
  try {
    console.log('🔄 Scrape request received')
    const { url } = await req.json()
    
    if (!url) {
      console.error('❌ No URL provided for scraping')
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    console.log('🌐 Attempting to scrape URL:', url)
    
    try {
      const response = await fetch(url)
      if (!response.ok) {
        console.error('❌ Failed to fetch URL:', response.status, response.statusText)
        throw new Error(`Failed to fetch URL: ${response.status}`)
      }
      
      const html = await response.text()
      console.log('📥 Received HTML content length:', html.length)
      
      const $ = cheerio.load(html)

      // Remove scripts and other potentially harmful elements
      $('script').remove()
      $('iframe').remove()
      $('style').remove()
      $('noscript').remove()

      // Get metadata
      const description = $('meta[name="description"]').attr('content')
      const image = $('meta[property="og:image"]').attr('content')
      const favicon = $('link[rel="icon"]').attr('href')

      // Then remove meta and link tags
      $('meta').remove()
      $('link').remove()

      const content = sanitizeHtml($('body').html() || '')
      console.log('✅ Successfully scraped content, length:', content.length)

      return NextResponse.json({
        title: $('title').text(),
        content,
        description,
        image,
        favicon,
      })
    } catch (error) {
      console.error('❌ Error during scraping:', error)
      return NextResponse.json({ error: 'Failed to scrape URL' }, { status: 500 })
    }
  } catch (error) {
    console.error('❌ Error processing scrape request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 