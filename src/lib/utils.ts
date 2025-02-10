import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import sanitizeHtmlLib from 'sanitize-html'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const sanitizeHtml = (html: string) => {
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
