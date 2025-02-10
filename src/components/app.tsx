// components/app.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Trash2, 
  Quote, 
  LayoutGrid, 
  List, 
  ChevronDown,
  Newspaper,
  Bookmark,
  User,
  Heart,
  Menu,
  Lock,
  X,
  PenLine,
  ExternalLink,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Checkbox } from "@/components/ui/checkbox"
import { User as SupabaseUser } from '@supabase/supabase-js'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ModeToggle } from '@/components/mode-toggle'

interface StashedItem {
  id: string
  title: string
  url: string
  content?: string
  tags: string[]
  image_url?: string
  created_at: string
  type: 'link' | 'highlight'
  highlighted_text?: string
  summary?: string
  user_id: string
}

interface AppProps {
  userId: string
}

// Add layout type
type LayoutType = 'card' | 'list'

type CategoryType = 'all' | 'articles' | 'highlights' | 'loved'

const QuoteIcon = ({ className = "h-4 w-4 mb-2" }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    className={className}
    fill="currentColor"
  >
    <path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" />
    <path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" />
  </svg>
)

export function App({ userId }: AppProps) {
  const [items, setItems] = useState<StashedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchItems() {
      try {
        console.log('Fetching items for user:', userId)
        const { data, error } = await supabase
          .from('stashed_items')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (error) {
          throw error
        }

        console.log('Fetched items:', data)
        setItems(data || [])
      } catch (err) {
        console.error('Error fetching items:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch items')
      } finally {
        setLoading(false)
      }
    }

    fetchItems()
  }, [userId, supabase])

  if (loading) {
    return <div>Loading your stashed items...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">StashIt</h1>
        <div className="flex items-center gap-4">
          <Input
            type="search"
            placeholder="Search stashed items..."
            className="w-64"
          />
          <ModeToggle />
          <form action="/auth/signout" method="post">
            <Button variant="outline" type="submit">
              Sign Out
            </Button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.length === 0 ? (
          <div className="col-span-full text-center py-10">
            <p>No items stashed yet. Use the extension to start saving!</p>
          </div>
        ) : (
          items.map((item) => (
            <Card key={item.id} className="p-4">
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt=""
                  className="w-full h-40 object-cover rounded-md mb-4"
                />
              )}
              <h2 className="text-xl font-semibold mb-2">{item.title}</h2>
              {item.type === 'highlight' && item.highlighted_text && (
                <blockquote className="border-l-4 border-primary pl-4 my-2 italic">
                  {item.highlighted_text}
                </blockquote>
              )}
              {item.summary && (
                <p className="text-muted-foreground text-sm mb-4">
                  {item.summary}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mb-4">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-primary/10 rounded-full text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline text-sm"
              >
                Visit Link →
              </a>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
 