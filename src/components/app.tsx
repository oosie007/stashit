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
  is_loved?: boolean
}

type LayoutType = 'card' | 'list'
type CategoryType = 'all' | 'articles' | 'highlights' | 'loved'

export function App({ userId }: { userId: string }) {
  const [items, setItems] = useState<StashedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [layout, setLayout] = useState<LayoutType>('card')
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [selectedItem, setSelectedItem] = useState<StashedItem | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchItems()
  }, [userId])

  async function fetchItems() {
    try {
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

  if (loading) return <div>Loading your stashed items...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-background border-r`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold">StashIt</h1>
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <nav className="space-y-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setSelectedCategory('all')}
            >
              <Bookmark className="mr-2 h-4 w-4" />
              All Stashes
            </Button>
            <Button
              variant={selectedCategory === 'articles' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setSelectedCategory('articles')}
            >
              <Newspaper className="mr-2 h-4 w-4" />
              Stashed Articles
            </Button>
            <Button
              variant={selectedCategory === 'highlights' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setSelectedCategory('highlights')}
            >
              <Quote className="mr-2 h-4 w-4" />
              Stashed Highlights
            </Button>
            <Button
              variant={selectedCategory === 'loved' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setSelectedCategory('loved')}
            >
              <Heart className="mr-2 h-4 w-4" />
              Loved Stashes
            </Button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="border-b p-4">
          <div className="flex items-center justify-between">
            {!isSidebarOpen && (
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
                <Menu className="h-4 w-4" />
              </Button>
            )}
            <div className="flex-1 mx-4">
              <Input
                type="search"
                placeholder="Search stashed items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex border rounded-lg">
                <Button
                  variant={layout === 'card' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setLayout('card')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={layout === 'list' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setLayout('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              <ModeToggle />
              <form action="/auth/signout" method="post">
                <Button variant="outline" type="submit">
                  Sign Out
                </Button>
              </form>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex">
            {/* Items List */}
            <div className={`${selectedItem ? 'w-2/5' : 'w-full'} overflow-y-auto p-4`}>
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
                  {filteredItems.map((item: StashedItem) => {
                    if (!item?.id) return null;
                    
                    return selectedItem || layout === 'list' ? (
                      // List View Item
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
                      // Card View
                      <Card 
                        key={item.id}
                        className={`cursor-pointer hover:shadow-md transition-shadow ${
                          selectedItem?.id === item.id ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => setSelectedItem(item)}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h2 className="text-xl font-semibold">{item.title}</h2>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
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
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteItem(item.id)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {item.image_url && layout === 'card' && (
                            <img
                              src={item.image_url}
                              alt=""
                              className="w-full h-40 object-cover rounded-md mb-4"
                            />
                          )}
                          {item.type === 'highlight' && item.highlighted_text && (
                            <blockquote className="border-l-4 border-primary pl-4 my-2 italic">
                              {item.highlighted_text}
                            </blockquote>
                          )}
                          {item.summary && (
                            <p className="text-muted-foreground text-sm line-clamp-3">
                              {item.summary}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-4">
                            {item.tags?.map((tag) => (
                              <Badge key={tag} variant="secondary">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Preview Pane - made wider */}
            {selectedItem && (
              <div className="w-3/5 border-l overflow-y-auto">
                <div className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-2xl font-bold">{selectedItem.title}</h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedItem(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {selectedItem.image_url && (
                    <img
                      src={selectedItem.image_url}
                      alt=""
                      className="w-full rounded-lg mb-4"
                    />
                  )}
                  {selectedItem.type === 'highlight' && selectedItem.highlighted_text && (
                    <blockquote className="border-l-4 border-primary pl-4 my-4 italic">
                      {selectedItem.highlighted_text}
                    </blockquote>
                  )}
                  {selectedItem.summary && (
                    <p className="text-muted-foreground mb-4">
                      {selectedItem.summary}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedItem.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex justify-between items-center">
                    <a
                      href={selectedItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline flex items-center gap-2"
                    >
                      Visit Original <ExternalLink className="h-4 w-4" />
                    </a>
                    <span className="text-sm text-muted-foreground">
                      {new Date(selectedItem.created_at).toLocaleDateString()}
                    </span>
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
 