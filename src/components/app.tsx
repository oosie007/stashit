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
  Link,
  Clock,
  Image,
  LogOut,
  ChevronLeft,
  Loader2,
  Link2,
} from 'lucide-react'
import { ModeToggle } from '@/components/mode-toggle'
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import DOMPurify from 'isomorphic-dompurify'
import { Skeleton } from "@/components/ui/skeleton"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/logo'
import { Nav } from '@/components/nav'
import UserMenu from '@/components/user-menu'
import { Sidebar } from '@/components/Sidebar'

export interface StashedItem {
  id: string
  user_id: string
  title: string
  url: string
  type: 'link' | 'highlight' | 'image' | 'saved_image' | 'pocket'
  source_id?: string
  summary?: string
  highlighted_text?: string
  is_loved: boolean
  created_at: string
  image_url?: string
  tags?: string[]
  scraped_content?: string
}

type LayoutType = 'card' | 'list'
type CategoryType = 'all' | 'articles' | 'highlights' | 'loved' | 'images'

interface AppProps {
  userId: string
  filter?: 'article' | 'highlight' | 'image'
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function App({ userId, filter }: AppProps) {
  const [items, setItems] = useState<StashedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [layout, setLayout] = useState<LayoutType>('card')
  const [activeCategory, setActiveCategory] = useState<CategoryType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [selectedItem, setSelectedItem] = useState<StashedItem | null>(null)
  const [iframeError, setIframeError] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [userEmail, setUserEmail] = useState<string>('')
  const [user, setUser] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')
  const [selectedListItem, setSelectedListItem] = useState<StashedItem | null>(null)

  useEffect(() => {
    fetchItems()
  }, [userId])

  useEffect(() => {
    // Fetch user email
    const getUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
        setUser(user)
      }
    }
    getUserEmail()
  }, [supabase.auth])

  async function fetchItems() {
    try {
      setLoading(true)
      console.log('Fetching items for user:', userId)
      
      const { data, error } = await supabase
        .from('stashed_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching items:', error)
        throw error
      }

      console.log('Fetched items:', data?.length || 0)
      setItems(data || [])
    } catch (err) {
      console.error('Error in fetchItems:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch items')
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.highlighted_text?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = 
      activeCategory === 'all' ? true :
      activeCategory === 'articles' ? item.type === 'link' :
      activeCategory === 'highlights' ? item.type === 'highlight' :
      activeCategory === 'images' ? ['image', 'saved_image'].includes(item.type) :
      activeCategory === 'loved' ? item.is_loved :
      false

    return matchesSearch && matchesCategory
  })

  async function toggleFavorite(item: StashedItem) {
    try {
      const newLovedStatus = !item.is_loved
      
      // First update the UI optimistically
      setItems(items.map(i => 
        i.id === item.id 
          ? { ...i, is_loved: newLovedStatus }
          : i
      ))

      // Then update the database
      const { error } = await supabase
        .from('stashed_items')
        .update({ is_loved: newLovedStatus })
        .eq('id', item.id)

      if (error) throw error
    } catch (err) {
      console.error('Error toggling loved status:', err)
    }
  }

  async function deleteItem(id: string) {
    try {
      const { error } = await supabase
        .from('stashed_items')
        .delete()
        .eq('id', id)

      if (error) throw error

      setItems(items.filter(item => item.id !== id))
      if (selectedItem?.id === id) {
        setSelectedItem(null)
      }
    } catch (err) {
      console.error('Error deleting item:', err)
    }
  }

  // Add a new function to clean and sanitize HTML
  function cleanHtml(html: string) {
    // Remove scripts and other potentially dangerous elements
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      // Keep basic formatting
      .replace(/(<\/?(?:div|p|br|h[1-6]|ul|ol|li|blockquote|pre|code)[^>]*>)/gi, '$1')
      // Remove all other tags
      .replace(/<(?!\/?(?:div|p|br|h[1-6]|ul|ol|li|blockquote|pre|code))[^>]+>/gi, '');
  }

  useEffect(() => {
    if (selectedItem) {
      // Check if the URL is accessible
      fetch(selectedItem.url, { mode: 'no-cors' })
        .catch(() => {
          setIframeError(true);
        });
    }
  }, [selectedItem]);

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  // Update the Nav component props to match CategoryType
  const handleCategoryChange = (category: CategoryType) => {
    setActiveCategory(category)
  }

  const renderListView = () => {
    return (
      <div className="flex h-[calc(100vh-4rem)]">
        {/* List of items */}
        <div className="w-1/2 border-r">
          <ScrollArea className="h-full">
            <div className="space-y-2 p-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedListItem?.id === item.id 
                      ? 'bg-primary/5 border-primary/20' 
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedListItem(item)}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-medium leading-none">{item.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.summary || item.highlighted_text || 'No preview available'}
                      </p>
                    </div>
                    {item.image_url && (
                      <img 
                        src={item.image_url} 
                        alt="" 
                        className="h-16 w-16 rounded object-cover ml-4"
                      />
                    )}
                  </div>
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {item.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {item.tags.length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{item.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Preview pane */}
        <div className="w-1/2 p-4">
          {selectedListItem ? (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">{selectedListItem.title}</h2>
              
              {selectedListItem.image_url && (
                <img 
                  src={selectedListItem.image_url} 
                  alt="" 
                  className="rounded-lg max-h-64 object-cover"
                />
              )}
              
              {selectedListItem.summary && (
                <p className="text-muted-foreground">{selectedListItem.summary}</p>
              )}
              
              {selectedListItem.highlighted_text && (
                <blockquote className="border-l-2 pl-4 italic">
                  {selectedListItem.highlighted_text}
                </blockquote>
              )}

              {selectedListItem.url && (
                <a 
                  href={selectedListItem.url}
                  target="_blank"
                  rel="noopener noreferrer" 
                  className="inline-flex items-center text-primary hover:underline"
                >
                  <Link className="h-4 w-4 mr-2" />
                  Visit Original
                </a>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Select an item to preview
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading your stashed items...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">Error: {error}</p>
          <Button onClick={fetchItems} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <Sidebar active={activeCategory} onCategoryChange={(cat) => setActiveCategory(cat as CategoryType)} />
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Input
                type="search"
                placeholder="Search stashed items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 ml-4">
              <ModeToggle />
              <UserMenu email={userEmail} />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          {viewMode === 'card' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
              {filteredItems.map((item) => (
                <Card 
                  key={item.id}
                  className="flex flex-col h-96 group cursor-pointer hover:shadow-md transition-all relative"
                  onClick={() => setSelectedItem(item)}
                >
                  {/* Image at the top */}
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-32 object-cover rounded-t-xl"
                    />
                  ) : (
                    <div className="w-full h-32 bg-muted flex items-center justify-center rounded-t-xl">
                      <Link className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}

                  {/* Card content */}
                  <div className="flex-1 flex flex-col p-4 overflow-hidden">
                    <h2 className="text-base font-semibold mb-1 line-clamp-1">{item.title}</h2>
                    {item.type === 'highlight' && item.highlighted_text && (
                      <blockquote className="border-l-4 border-primary pl-3 my-2 text-base text-muted-foreground line-clamp-3 overflow-hidden flex-shrink-0">
                        {item.highlighted_text}
                      </blockquote>
                    )}
                    {item.summary && (
                      <p className="text-muted-foreground text-xs line-clamp-2 mb-1">
                        {item.summary}
                      </p>
                    )}
                  </div>

                  {/* Action bar at bottom */}
                  <div className="flex items-center justify-between border-t px-4 h-12 mt-auto">
                    <span className="text-xs text-muted-foreground">{formatDate(item.created_at)}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={e => { e.stopPropagation(); toggleFavorite(item); }}
                      >
                        <Heart className={`h-4 w-4 ${item.is_loved ? 'fill-current text-red-500' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={e => {
                          e.stopPropagation();
                          window.open(item.url, "_blank", "noopener,noreferrer");
                        }}
                        aria-label="Open link in new tab"
                      >
                        <Link className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={e => { e.stopPropagation(); deleteItem(item.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex h-full">
              {/* List View */}
              <div className="w-1/2 border-r">
                <ScrollArea className="h-full">
                  <div className="space-y-2 p-4">
                    {filteredItems.map((item) => (
                      <div
                        key={item.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          selectedListItem?.id === item.id 
                            ? 'bg-primary/5 border-primary/20' 
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => setSelectedListItem(item)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h3 className="font-medium leading-none">{item.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {item.summary || item.highlighted_text || 'No preview available'}
                            </p>
                          </div>
                          {item.image_url && (
                            <img 
                              src={item.image_url} 
                              alt="" 
                              className="h-16 w-16 rounded object-cover ml-4"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Preview Pane */}
              <div className="w-1/2 p-4">
                {selectedListItem ? (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">{selectedListItem.title}</h2>
                    {selectedListItem.image_url && (
                      <img 
                        src={selectedListItem.image_url} 
                        alt="" 
                        className="w-full rounded-lg"
                      />
                    )}
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      {selectedListItem.scraped_content ? (
                        <div dangerouslySetInnerHTML={{ 
                          __html: DOMPurify.sanitize(selectedListItem.scraped_content) 
                        }} />
                      ) : (
                        <p>{selectedListItem.summary || selectedListItem.highlighted_text}</p>
                      )}
                    </div>
                    {selectedListItem.url && (
                      <a 
                        href={selectedListItem.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-primary hover:underline"
                      >
                        <Link className="h-4 w-4 mr-2" />
                        Visit Original
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Select an item to preview
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

<style jsx global>{`
  .custom-header-title {
    font-size: 0.85rem !important;
    line-height: 1.35rem !important;
  }
`}</style>
 