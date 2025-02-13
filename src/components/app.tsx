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
  Link2,
  Clock,
  Image,
  LogOut,
  ChevronLeft,
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

export interface StashedItem {
  id: string;
  title: string;
  url: string;
  type: 'link' | 'highlight' | 'saved_image';
  content?: string;
  highlighted_text?: string;
  scraped_content?: string;
  screenshot?: string;
  image_url?: string;
  source_url?: string;
  tags: string[];
  created_at: string;
  is_loved?: boolean;
}

type LayoutType = 'card' | 'list'
type CategoryType = 'all' | 'articles' | 'highlights' | 'loved' | 'images'

export function App({ userId }: { userId: string }) {
  const [items, setItems] = useState<StashedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [layout, setLayout] = useState<LayoutType>('card')
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [selectedItem, setSelectedItem] = useState<StashedItem | null>(null)
  const [iframeError, setIframeError] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [userEmail, setUserEmail] = useState<string>('')

  useEffect(() => {
    fetchItems()
  }, [userId])

  useEffect(() => {
    // Fetch user email
    const getUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
      }
    }
    getUserEmail()
  }, [supabase.auth])

  async function fetchItems() {
    try {
      console.log('Fetching items for user:', userId)
      const { data, error } = await supabase
        .from('stashed_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log('Fetched items:', data?.length || 0)
      setItems(data || [])
    } catch (err) {
      console.error('Error fetching items:', err)
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
      selectedCategory === 'all' ||
      (selectedCategory === 'articles' && item.type === 'link') ||
      (selectedCategory === 'highlights' && item.type === 'highlight') ||
      (selectedCategory === 'images' && item.type === 'saved_image') ||
      (selectedCategory === 'loved' && item.is_loved)

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

  if (loading) return (
    <div className="flex h-screen">
      {/* Sidebar skeleton */}
      <div className="w-64 border-r p-4">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 p-4">
        {/* Header skeleton */}
        <div className="mb-8 flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>

        {/* Cards grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-lg border">
              <Skeleton className="h-48 rounded-t-lg" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  if (error) return <div>Error: {error}</div>

  return (
    <div className="flex flex-col h-screen">
      {/* Top Navigation Bar */}
      <div className="h-16 border-b px-4 flex items-center justify-between bg-background">
        {/* Logo */}
        <div className="flex items-center">
          <img 
            src="/images/logo.png"
            alt="StashIt" 
            className="h-16 translate-y-1.5"
            style={{ 
              filter: 'var(--logo-filter)'
            }}
          />
        </div>

        {/* Right side: User Menu and Theme Toggle */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium">{userEmail}</span>
          </div>
          <ModeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Toggle for Collapsed State */}
        {!isSidebarOpen && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsSidebarOpen(true)}
            className="m-2"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Sidebar */}
        <div className={`
          ${isSidebarOpen ? 'w-64' : 'w-0'} 
          transition-all duration-300 
          bg-background border-r
          overflow-hidden
        `}>
          <div className="p-4">
            <div className="flex justify-end mb-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsSidebarOpen(false)}
                className="hover:bg-secondary"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Sidebar Navigation */}
            <nav className="space-y-1 mt-4">
              <div className="space-y-1">
                <Button
                  variant={selectedCategory === 'all' ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setSelectedCategory('all')}
                >
                  <Bookmark className="mr-2 h-4 w-4" />
                  All Items
                </Button>
                <Button
                  variant={selectedCategory === 'articles' ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setSelectedCategory('articles')}
                >
                  <Newspaper className="mr-2 h-4 w-4" />
                  Articles
                </Button>
                <Button
                  variant={selectedCategory === 'highlights' ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setSelectedCategory('highlights')}
                >
                  <Quote className="mr-2 h-4 w-4" />
                  Highlights
                </Button>
                <Button
                  variant={selectedCategory === 'images' ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setSelectedCategory('images')}
                >
                  <Image className="mr-2 h-4 w-4" />
                  Stashed Images
                </Button>
                <Button
                  variant={selectedCategory === 'loved' ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setSelectedCategory('loved')}
                >
                  <Heart className="mr-2 h-4 w-4" />
                  Loved Items
                </Button>
              </div>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="h-full flex">
            {/* Items List */}
            <div 
              className={`
                overflow-y-auto p-4
                transition-[width] ease-in-out duration-200
                ${selectedItem ? 'w-[400px]' : 'w-full'}
              `}
            >
              {filteredItems.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? 'No items match your search'
                      : 'No items stashed yet. Use the extension to start saving!'}
                  </p>
                </div>
              ) : (
                <div className={
                  selectedItem || layout === 'list'
                    ? 'flex flex-col'
                    : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                }>
                  {filteredItems
                    .map((item) => {
                      return (
                        selectedItem || layout === 'list' ? (
                          <div
                            key={item.id}
                            className={`flex items-center gap-4 p-3 hover:bg-accent/50 transition-colors border-b last:border-b-0 ${
                              selectedItem?.id === item.id ? 'bg-accent' : ''
                            }`}
                            onClick={() => setSelectedItem(item)}
                          >
                            {/* Left side - Icon or small image */}
                            <div className="shrink-0">
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt=""
                                  className="w-10 h-10 rounded object-cover"
                                />
                              ) : (
                                <Link2 className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>

                            {/* Middle - Main content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium truncate">{item.title}</h3>
                                {item.tags?.length > 0 && (
                                  <div className="flex gap-1">
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
                              
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <a 
                                  href={item.url}
                                  className="truncate hover:underline"
                                  onClick={e => e.stopPropagation()}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {item.url}
                                </a>
                                {item.type === 'highlight' && (
                                  <Badge variant="outline" className="text-xs">Highlight</Badge>
                                )}
                              </div>
                            </div>

                            {/* Right side - Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleFavorite(item)
                                }}
                              >
                                <Heart
                                  className={`h-4 w-4 ${
                                    item.is_loved ? 'fill-current text-red-500' : ''
                                  }`}
                                />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteItem(item.id)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Card 
                            key={item.id}
                            className={`group cursor-pointer hover:shadow-md transition-all relative ${
                              selectedItem?.id === item.id ? 'ring-2 ring-primary' : ''
                            }`}
                            onClick={() => setSelectedItem(item)}
                          >
                            {/* Image container with overlay */}
                            <div className="relative">
                              {item.image_url ? (
                                <>
                                  <img
                                    src={item.image_url}
                                    alt=""
                                    className="w-full h-48 object-cover rounded-t-xl"
                                  />
                                  {/* Dark overlay on hover */}
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors rounded-t-xl" />
                                </>
                              ) : (
                                <div className="w-full h-48 bg-muted flex items-center justify-center rounded-t-xl">
                                  <Link2 className="h-8 w-8 text-muted-foreground" />
                                </div>
                              )}
                              
                              {/* Action buttons - only show on hover */}
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <Button
                                  variant="secondary"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleFavorite(item)
                                  }}
                                >
                                  <Heart
                                    className={`h-4 w-4 ${
                                      item.is_loved ? 'fill-current text-red-500' : ''
                                    }`}
                                  />
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteItem(item.id)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            <CardContent className="p-4">
                              <h2 className="text-xl font-semibold mb-2 line-clamp-2">{item.title}</h2>
                              
                              {/* Tags right after title */}
                              <div className="flex flex-wrap gap-1 mb-3">
                                {item.tags?.map((tag) => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>

                              {item.type === 'highlight' && item.highlighted_text && (
                                <blockquote className="border-l-4 border-primary pl-4 my-2 italic text-sm line-clamp-3">
                                  {item.highlighted_text}
                                </blockquote>
                              )}
                              
                              {item.summary && (
                                <p className="text-muted-foreground text-sm line-clamp-2 mb-2">
                                  {item.summary}
                                </p>
                              )}

                              {/* Just URL at bottom */}
                              <div className="mt-auto pt-2 border-t text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Link2 className="h-3 w-3" />
                                  <a 
                                    href={item.url}
                                    className="hover:underline truncate"
                                    onClick={e => e.stopPropagation()}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {item.url}
                                  </a>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      );
                    })}
                </div>
              )}
            </div>

            {/* Preview Pane */}
            {selectedItem && (
              <div 
                className="flex-1 flex flex-col border-l"
                style={{ animation: 'slideIn 0.2s ease-out' }}
              >
                {/* Fixed Header */}
                <div className="sticky top-0 bg-background border-b p-4 z-10">
                  <div className="flex justify-between items-start">
                    <h2 className="text-2xl font-bold">{selectedItem.title}</h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedItem(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4">
                  {selectedItem.image_url && (
                    <img
                      src={selectedItem.image_url}
                      alt=""
                      className="w-full rounded-lg mb-4"
                    />
                  )}

                  {selectedItem.type === 'highlight' ? (
                    <blockquote className="border-l-4 border-primary pl-4 my-4 italic text-lg">
                      {selectedItem.highlighted_text}
                    </blockquote>
                  ) : (
                    <>
                      {selectedItem.summary && (
                        <p className="text-muted-foreground mb-4">
                          {selectedItem.summary}
                        </p>
                      )}
                      {selectedItem.scraped_content && (
                        <div 
                          className="prose max-w-none"
                          dangerouslySetInnerHTML={{ 
                            __html: DOMPurify.sanitize(selectedItem.scraped_content) 
                          }} 
                        />
                      )}
                    </>
                  )}

                  <div className="mt-4">
                    <a
                      href={selectedItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:underline"
                    >
                      Visit original page →
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
 