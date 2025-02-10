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
  notes?: string
  scraped_content?: string
  scraped_at?: string
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
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [scrapedContent, setScrapedContent] = useState<string | null>(null)

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
    const url = formData.get('url') as string
    
    try {
      console.log('Adding new item...')
      
      // First, scrape the URL
      const scrapeResponse = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      
      if (!scrapeResponse.ok) {
        throw new Error('Failed to scrape URL')
      }
      
      const scrapedData = await scrapeResponse.json()
      const tags = formData.get('tags') as string
      const processedTags = tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : []

      const newItem = {
        type: 'link',
        title: formData.get('title') as string || scrapedData.title,
        url: url,
        content: formData.get('content') as string,
        tags: processedTags,
        user_id: userId,
        is_loved: false,
        scraped_content: scrapedData.content,
        scraped_at: new Date().toISOString(),
        image_url: scrapedData.image,
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

  const handleSaveNote = async () => {
    if (!selectedItem) return

    try {
      const { error } = await supabase
        .from('stashed_items')
        .update({ notes: noteContent })
        .eq('id', selectedItem.id)

      if (error) throw error

      setSavedItems(items =>
        items.map(item =>
          item.id === selectedItem.id
            ? { ...item, notes: noteContent }
            : item
        )
      )
    } catch (err) {
      console.error('Error saving note:', err)
      setError('Failed to save note')
    }
  }

  const PreviewPane = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [scrapedContent, setScrapedContent] = useState<string | null>(null);

    useEffect(() => {
      let mounted = true;
      let timeoutId: NodeJS.Timeout;

      const checkForScrapedContent = async () => {
        if (!selectedItem?.url) return;

        try {
          const { data, error } = await supabase
            .from('stashed_items')
            .select('scraped_content, scraped_at')
            .eq('url', selectedItem.url)
            .single();

          if (!mounted) return;

          if (error) {
            console.error('Error checking scraped content:', error);
            setError('Failed to load scraped content');
            setIsLoading(false);
            return;
          }

          if (data?.scraped_content) {
            setScrapedContent(data.scraped_content);
            setIsLoading(false);
          } else {
            // Check again in 2 seconds
            timeoutId = setTimeout(checkForScrapedContent, 2000);
          }
        } catch (err) {
          if (!mounted) return;
          console.error('Error checking scraped content:', err);
          setError('Failed to load scraped content');
          setIsLoading(false);
        }
      };

      setIsLoading(true);
      setError(null);
      setScrapedContent(null);
      checkForScrapedContent();

      return () => {
        mounted = false;
        if (timeoutId) clearTimeout(timeoutId);
      };
    }, [selectedItem?.url]);

    if (!selectedItem) return null;

    return (
      <div className="w-[800px] border-l bg-card flex flex-col h-screen fixed right-0 top-0">
        <div className="p-4 border-b flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <a 
              href={selectedItem.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm hover:underline flex items-center gap-1"
            >
              <ExternalLink className="h-4 w-4" />
              View Original
            </a>
            {selectedItem.scraped_at && (
              <span className="text-sm text-muted-foreground">
                Saved {new Date(selectedItem.scraped_at).toLocaleDateString()}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setIsPreviewOpen(false);
              setSelectedItem(null);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Tabs defaultValue="preview" className="flex-1 flex flex-col">
          <div className="border-b px-4 sticky top-[57px] bg-background z-10">
            <TabsList>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 relative">
            <TabsContent 
              value="preview" 
              className="absolute inset-0 data-[state=active]:block data-[state=inactive]:hidden"
            >
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-3 text-sm text-muted-foreground">Loading preview...</span>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full text-destructive">
                  {error}
                </div>
              ) : scrapedContent ? (
                <div className="h-full overflow-auto">
                  <article 
                    className="prose dark:prose-invert max-w-2xl mx-auto p-6"
                    dangerouslySetInnerHTML={{ __html: scrapedContent }}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <p>No preview available yet</p>
                  <p className="text-sm mt-2">The content is being processed...</p>
                </div>
              )}
            </TabsContent>

            <TabsContent 
              value="notes" 
              className="absolute inset-0 data-[state=active]:block data-[state=inactive]:hidden overflow-auto"
            >
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold">{selectedItem.title}</h2>
                      {selectedItem.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {selectedItem.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedItem.type === 'highlight' && (
                      <div className="bg-muted p-4 rounded-md">
                        <QuoteIcon />
                        <p className="italic text-muted-foreground">
                          {selectedItem.highlighted_text}
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        placeholder="Add your notes here..."
                        className="min-h-[200px]"
                      />
                      <Button 
                        onClick={handleSaveNote}
                        className="w-full"
                      >
                        Save Notes
                      </Button>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    )
  }

  const renderCardView = (items: SavedItem[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((item) => (
        <Card 
          key={item.id} 
          className="relative group overflow-hidden flex flex-col cursor-pointer"
          onClick={() => {
            setSelectedItem(item)
            setNoteContent(item.notes || '')
            setIsPreviewOpen(true)
          }}
        >
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
                  onClick={(e) => {
                    e.stopPropagation()
                    handleToggleLove(item.id, item.is_loved)
                  }}
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
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(item.id)
                  }}
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

          <div className="flex-1 min-w-0">
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
                  onClick={(e) => {
                    e.stopPropagation()
                    handleToggleLove(item.id, item.is_loved)
                  }}
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
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(item.id)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {(item.summary || item.content) && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {item.summary || item.content}
              </p>
            )}

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

  const handleRescrape = async (itemId: number, url: string) => {
    try {
      const { error: updateError } = await supabase
        .from('stashed_items')
        .update({
          needs_scraping: true
        })
        .eq('id', itemId);

      if (updateError) throw updateError;

      // Trigger immediate scrape
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!response.ok) throw new Error('Failed to scrape');

      // Refresh the items
      await fetchStashedItems();
    } catch (error) {
      console.error('Error rescraping:', error);
    }
  };

  return (
    <div className="flex h-screen">
      <div className="hidden md:flex w-64 bg-card border-r flex-col">
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

        <div className="flex-1 p-4">
          <MenuContent />
        </div>
      </div>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-[80%] sm:w-[350px] p-0">
          <div className="flex flex-col h-full">
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
            <div className="flex-1 p-4">
              <MenuContent />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <div className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-200 ${
        isPreviewOpen ? 'mr-[800px]' : ''
      }`}>
        <div className="container p-4 md:p-6 space-y-6 h-full flex flex-col">
          <div className="flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-4">
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

      {isPreviewOpen && <PreviewPane />}
    </div>
  )
}
 