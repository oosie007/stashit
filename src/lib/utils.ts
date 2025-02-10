import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import DOMPurify from 'isomorphic-dompurify'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const sanitizeHtml = (html: string) => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'img',
      'ul', 'ol', 'li', 'blockquote', 'strong', 'em', 'br'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class'],
  })
}
