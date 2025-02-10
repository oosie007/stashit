import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import { sanitizeHtml } from '@/lib/utils'

export async function POST(req: Request) {
  try {
    const { url } = await req.json()
    console.log('🔍 Starting scrape for URL:', url)

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`)
    }
    
    const html = await response.text()
    const $ = cheerio.load(html)

    // Remove unwanted elements
    $('script').remove()
    $('iframe').remove()
    $('style').remove()
    $('noscript').remove()
    $('meta').remove()
    $('link').remove()

    // Try to get the main content
    let mainContent = ''
    
    // Common content selectors
    const contentSelectors = [
      'article',
      '[role="main"]',
      '.main-content',
      '#main-content',
      '.post-content',
      '.article-content',
      '.entry-content',
      '.content',
      'main',
    ]

    // Try each selector until we find content
    for (const selector of contentSelectors) {
      const element = $(selector)
      if (element.length > 0) {
        mainContent = element.html() || ''
        break
      }
    }

    // If no content found with selectors, get the body
    if (!mainContent) {
      mainContent = $('body').html() || ''
    }

    // Clean up the content
    const cleanContent = sanitizeHtml(mainContent)

    console.log('✅ Scraping completed successfully')
    
    return NextResponse.json({
      content: cleanContent,
      success: true
    })

  } catch (error) {
    console.error('❌ Scraping error:', error)
    return NextResponse.json(
      { error: 'Failed to scrape content' },
      { status: 500 }
    )
  }
} 