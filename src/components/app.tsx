// components/app.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
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
  is_loved: boolean
}

interface AppProps {
  userId: string
}

// Add layout type
type LayoutType = 'card' | 'list'

type CategoryType = 'all' | 'articles' | 'highlights' | 'loved'

const QuoteIcon = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    className="h-4 w-4 mb-2"
    fill="currentColor"
  >
    <path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" />
    <path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" />
  </svg>
)

export const App = ({ userId }: AppProps) => {
  const [savedItems, setSavedItems] = useState<SavedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<'all' | SavedItem['type']>('all')
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [layout, setLayout] = useState<LayoutType>('card')
  const [category, setCategory] = useState<CategoryType>('all')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
      console.log('Fetching stashed items for user:', userId)
      setLoading(true)
      
      let query = supabase
        .from('stashed_items')
        .select('*')
        .eq('user_id', userId)

      if (searchQuery) {
        // Use simple ILIKE for better performance
        query = query.or(`
          title.ilike.%${searchQuery}%,
          content.ilike.%${searchQuery}%,
          summary.ilike.%${searchQuery}%,
          highlighted_text.ilike.%${searchQuery}%
        `)
      }

      const { data, error: dbError } = await query
        .order('created_at', { ascending: false })

      if (dbError) {
        console.error('Database error in fetchStashedItems:', {
          error: dbError,
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint
        })
        throw dbError
      }

      console.log('Successfully fetched items:', {
        count: data?.length || 0,
        items: data
      })

      setSavedItems(data || [])
    } catch (err) {
      console.error('Exception in fetchStashedItems:', {
        error: err,
        stack: err instanceof Error ? err.stack : undefined
      })
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

  const handleToggleLove = async (id: number, currentLoved: boolean) => {
    try {
      const { error } = await supabase
        .from('stashed_items')
        .update({ is_loved: !currentLoved })
        .eq('id', id)

      if (error) throw error

      setSavedItems(items => 
        items.map(item => 
          item.id === id ? { ...item, is_loved: !currentLoved } : item
        )
      )
    } catch (err) {
      console.error('Error updating item:', err)
      setError('Failed to update item')
    }
  }

  const filterItems = (items: SavedItem[]) => {
    return items.filter(item => {
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch = 
        item.title.toLowerCase().includes(searchLower) ||
        (item.content?.toLowerCase().includes(searchLower)) ||
        (item.summary?.toLowerCase().includes(searchLower)) ||
        (item.highlighted_text?.toLowerCase().includes(searchLower)) ||
        (item.tags.some(tag => tag.toLowerCase().includes(searchLower)))
      
      const matchesCategory = activeCategory === 'all' || item.type === activeCategory
      return matchesSearch && matchesCategory
    })
  }

  const handleAddItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    try {
      console.log('Adding new item...')
      const tags = formData.get('tags') as string
      const processedTags = tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : []

      const newItem = {
        type: 'link',
        title: formData.get('title') as string,
        url: formData.get('url') as string,
        content: formData.get('content') as string,
        tags: processedTags,
        user_id: userId,
        is_loved: false
      }

      console.log('New item data:', newItem)

      const { error: insertError } = await supabase
        .from('stashed_items')
        .insert([newItem])

      if (insertError) {
        console.error('Error inserting new item:', {
          error: insertError,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint
        })
        throw insertError
      }

      console.log('Successfully added new item')
      setOpen(false)
    } catch (err) {
      console.error('Exception in handleAddItem:', {
        error: err,
        stack: err instanceof Error ? err.stack : undefined
      })
      setError('Failed to add item')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const filterByCategory = (items: SavedItem[]) => {
    switch (category) {
      case 'articles':
        return items.filter(item => item.type === 'link')
      case 'highlights':
        return items.filter(item => item.type === 'highlight')
      case 'loved':
        return items.filter(item => item.is_loved)
      default:
        return items
    }
  }

  const filteredItems = filterByCategory(filterItems(savedItems))

  const MenuContent = () => (
    <nav className="flex flex-col space-y-2">
      <Button
        variant={category === 'all' ? 'secondary' : 'ghost'}
        className="w-full justify-start gap-2"
        onClick={() => {
          setCategory('all')
          setMobileMenuOpen(false)
        }}
      >
        <Bookmark className="h-4 w-4" />
        All Stashes
      </Button>
      <Button
        variant={category === 'articles' ? 'secondary' : 'ghost'}
        className="w-full justify-start gap-2"
        onClick={() => {
          setCategory('articles')
          setMobileMenuOpen(false)
        }}
      >
        <Newspaper className="h-4 w-4" />
        Stashed Articles
      </Button>
      <Button
        variant={category === 'highlights' ? 'secondary' : 'ghost'}
        className="w-full justify-start gap-2"
        onClick={() => {
          setCategory('highlights')
          setMobileMenuOpen(false)
        }}
      >
        <QuoteIcon />
        Stashed Highlights
      </Button>
      <Button
        variant={category === 'loved' ? 'secondary' : 'ghost'}
        className="w-full justify-start gap-2"
        onClick={() => {
          setCategory('loved')
          setMobileMenuOpen(false)
        }}
      >
        <Heart className="h-4 w-4" />
        Loved Stashes
      </Button>
    </nav>
  )

  const renderCardView = (items: SavedItem[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((item) => (
        <Card key={item.id} className="relative group overflow-hidden flex flex-col">
          {item.image_url && item.type === 'link' && (
            <div className="relative w-full h-48">
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
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1 flex-1 min-w-0">
                <CardTitle className="text-base font-semibold line-clamp-2">
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {item.title}
                  </a>
                </CardTitle>
                {item.url && (
                  <a 
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:underline line-clamp-1 flex items-center gap-1"
                  >
                    <LayoutGrid className="h-3 w-3" />
                    {new URL(item.url).hostname}
                  </a>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0"
                  onClick={() => handleToggleLove(item.id, item.is_loved)}
                >
                  <Heart 
                    className={`h-4 w-4 transition-all duration-300 ease-in-out transform hover:scale-110 ${
                      item.is_loved 
                        ? 'fill-current text-red-500 scale-110' 
                        : 'text-muted-foreground hover:text-red-500'
                    }`} 
                  />
                  <span className="sr-only">Love</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {item.type === 'highlight' ? (
              <div className="bg-muted p-4 rounded-md">
                <QuoteIcon />
                <p className="italic text-muted-foreground">
                  {item.highlighted_text}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm line-clamp-2">
                {item.summary || item.content || 'No content available'}
              </p>
            )}
            {item.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )

  const renderListView = (items: SavedItem[]) => (
    <div className="space-y-3">
      {items.map((item) => (
        <div 
          key={item.id} 
          className="flex items-start gap-4 p-4 bg-card rounded-lg hover:shadow-md transition-shadow group"
        >
          {/* Image thumbnail */}
          {item.image_url ? (
            <div className="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-muted">
              <img
                src={item.image_url}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                }}
              />
            </div>
          ) : (
            <div className="w-16 h-16 flex-shrink-0 rounded-md bg-muted flex items-center justify-center">
              {item.type === 'highlight' ? (
                <QuoteIcon className="h-6 w-6" />
              ) : (
                <LayoutGrid className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title and Delete button */}
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <h3 className="font-semibold line-clamp-1">
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="hover:underline"
                  >
                    {item.title}
                  </a>
                </h3>
                {item.url && (
                  <a 
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:underline line-clamp-1"
                  >
                    {new URL(item.url).hostname}
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity"
                  onClick={() => handleToggleLove(item.id, item.is_loved)}
                >
                  <Heart 
                    className={`h-4 w-4 transition-all duration-300 ease-in-out transform hover:scale-110 ${
                      item.is_loved 
                        ? 'fill-current text-red-500 scale-110' 
                        : 'text-muted-foreground hover:text-red-500'
                    }`} 
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 flex-shrink-0"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Summary or Content */}
            {(item.summary || item.content) && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {item.summary || item.content}
              </p>
            )}

            {/* Tags */}
            {item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {item.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="flex h-screen">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden md:flex w-64 bg-card border-r flex-col">
        {/* User section */}
        <div className="p-4 border-b">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <User className="h-4 w-4" />
                <span className="truncate">{user?.user_metadata.email}</span>
                <ChevronDown className="h-4 w-4 ml-auto opacity-50" />
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
        </div>

        {/* Desktop Menu items */}
        <div className="flex-1 p-4">
          <MenuContent />
        </div>
      </div>

      {/* Mobile Menu Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-[80%] sm:w-[350px] p-0">
          <div className="flex flex-col h-full">
            {/* User section in mobile menu */}
            <div className="p-4 border-b">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start gap-2">
                    <User className="h-4 w-4" />
                    <span className="truncate">{user?.user_metadata.email}</span>
                    <ChevronDown className="h-4 w-4 ml-auto opacity-50" />
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
            </div>
            {/* Mobile Menu items */}
            <div className="flex-1 p-4">
              <MenuContent />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="container p-4 md:p-6 space-y-6 h-full flex flex-col">
          {/* Top navigation row */}
          <div className="flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-4">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl md:text-3xl font-bold">StashIt</h1>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <ThemeToggle />
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
            </div>
          </div>

          {/* Search and layout toggle */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b flex-shrink-0">
            <div className="w-full md:flex-1 md:max-w-2xl">
              <input
                type="search"
                placeholder="Search stashed items..."
                className="w-full px-4 py-2 rounded-md border bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-muted rounded-lg p-1">
                <Button
                  variant={layout === 'card' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setLayout('card')}
                  className="h-8 w-8"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={layout === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setLayout('list')}
                  className="h-8 w-8"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content area with overflow */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div>Loading...</div>
            ) : error ? (
              <div>Error: {error}</div>
            ) : (
              layout === 'card' 
                ? renderCardView(filteredItems)
                : renderListView(filteredItems)
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
 