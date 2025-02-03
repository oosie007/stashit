// components/app.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2, Quote } from 'lucide-react'
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
import { User } from '@supabase/supabase-js'
import { ChevronDown } from 'lucide-react'

interface SavedItem {
  id: number
  type: 'link' | 'highlight' | 'note' | 'image' | 'email'
  url?: string
  title: string
  summary?: string
  content?: string
  highlighted_text?: string
  image_url?: string
  tags: string[]
  created_at: string
  user_id: string
}

interface AppProps {
  userId: string
}

export const App = ({ userId }: AppProps) => {
  const [savedItems, setSavedItems] = useState<SavedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<'all' | SavedItem['type']>('all')
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    fetchStashedItems()

    const channel = supabase
      .channel('stashed_items_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stashed_items',
        },
        (payload) => {
          console.log('New item received:', payload)
          setSavedItems((current) => [payload.new as SavedItem, ...current])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'stashed_items',
        },
        (payload) => {
          console.log('Item deleted:', payload)
          setSavedItems((current) =>
            current.filter((item) => item.id !== payload.old.id)
          )
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  const fetchStashedItems = async () => {
    try {
      setLoading(true)
      const { data, error: dbError } = await supabase
        .from('stashed_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (dbError) throw dbError

      setSavedItems(data || [])
    } catch (err) {
      console.error('Error fetching items:', err)
      setError('Failed to fetch saved items')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const { error: deleteError } = await supabase
        .from('stashed_items')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
    } catch (err) {
      console.error('Error deleting item:', err)
      setError('Failed to delete item')
    }
  }

  const filterItems = (items: SavedItem[]) => {
    return items.filter(item => {
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch = 
        item.title.toLowerCase().includes(searchLower) ||
        (item.content?.toLowerCase().includes(searchLower)) ||
        (item.summary?.toLowerCase().includes(searchLower)) ||
        (item.tags.some(tag => tag.toLowerCase().includes(searchLower)))
      
      const matchesCategory = activeCategory === 'all' || item.type === activeCategory
      return matchesSearch && matchesCategory
    })
  }

  const handleAddItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    try {
      const tags = formData.get('tags') as string;
      const processedTags = tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];

      const newItem = {
        type: 'link',
        title: formData.get('title') as string,
        url: formData.get('url') as string,
        content: formData.get('content') as string,
        tags: processedTags,
        user_id: userId
      }

      const { error: insertError } = await supabase
        .from('stashed_items')
        .insert([newItem])

      if (insertError) throw insertError
      setOpen(false)
    } catch (err) {
      console.error('Error adding item:', err)
      setError('Failed to add item')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center gap-4">
            <h1 className="text-2xl font-bold">StashIt</h1>
            
            <div className="flex-1 max-w-xl">
              <input
                type="search"
                placeholder="Search stashed items..."
                className="w-full px-4 py-2 rounded-md border bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button>StashIt</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Item</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddItem} className="space-y-4">
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input id="title" name="title" required />
                    </div>
                    <div>
                      <Label htmlFor="url">URL</Label>
                      <Input id="url" name="url" type="url" required />
                    </div>
                    <div>
                      <Label htmlFor="content">Content</Label>
                      <Textarea id="content" name="content" />
                    </div>
                    <div>
                      <Label htmlFor="tags">Tags (comma-separated)</Label>
                      <Input id="tags" name="tags" placeholder="tag1, tag2, tag3" />
                    </div>
                    <Button type="submit">Save</Button>
                  </form>
                </DialogContent>
              </Dialog>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <span className="hidden sm:inline-block">
                      {user?.email}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filterItems(savedItems).map((item) => (
              <Card key={item.id} className="hover:bg-muted/50 transition-colors">
                {item.image_url && item.type === 'link' && (
                  <div className="relative w-full h-48 overflow-hidden bg-muted">
                    <img
                      src={item.image_url}
                      alt={`Image for ${item.title}`}
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        console.error('Image failed to load:', item.image_url)
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  </div>
                )}
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-semibold">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {item.title}
                    </a>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(item.id)}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </CardHeader>
                <CardContent>
                  {item.type === 'highlight' ? (
                    <div className="bg-muted p-4 rounded-md">
                      <Quote className="h-4 w-4 mb-2 text-muted-foreground" />
                      <p className="italic text-muted-foreground">
                        {item.highlighted_text}
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      {item.summary || item.content || 'No content available'}
                    </p>
                  )}
                  <div className="mt-4 flex gap-2">
                    {item.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}