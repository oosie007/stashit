import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import sanitizeHtmlLib from 'sanitize-html'
import * as cheerio from 'cheerio'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeHtml(html: string) {
  return sanitizeHtmlLib(html, {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'ul', 'ol', 
      'li', 'b', 'i', 'strong', 'em', 'blockquote', 'br', 'div',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img'
    ],
    allowedAttributes: {
      'a': ['href', 'target', 'rel'],
      'img': ['src', 'alt', 'title']
    }
  })
}

export async function scrapeUrl(url: string) {
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
