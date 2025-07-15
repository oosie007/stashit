// components/app.tsx 
'use client'

import React, { useEffect, useState, useRef } from 'react'
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
  FileText,
  Home,
  Highlighter,
  Plus,
  ArrowDownAZ,
  ArrowUpAZ,
  Search
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
  SheetTrigger,
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
import dynamic from 'next/dynamic'
import { AddItemModal } from './add-item-modal'
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
const BlockNoteEditor = dynamic(() => import('./blocknote-editor'), { ssr: false });

export interface StashedItem {
  id: string
  user_id: string
  title: string
  url: string
  type: 'link' | 'highlight' | 'image' | 'saved_image' | 'note' | 'document' | 'audio' | 'video'
  summary?: string
  highlighted_text?: string
  is_loved: boolean
  created_at: string
  image_url?: string
  document_url?: string
  audio_url?: string
  file_name?: string
  mime_type?: string
  tags?: string[]
  scraped_content?: string
  ai_synopsis?: string
  ai_synopsis_title?: string
  ai_synopsis_purpose?: string
  ai_synopsis_structure?: string
  ai_synopsis_key_points?: string
  ai_synopsis_takeaways?: string
  content?: string
  file_path?: string // Added file_path to StashedItem interface
  thumbnail_url?: string // Added thumbnail_url for previews
}

type LayoutType = 'card' | 'list'
type CategoryType = 'all' | 'articles' | 'highlights' | 'loved' | 'images' | 'notes'

interface AppProps {
  userId: string
  filter?: 'article' | 'highlight' | 'image'
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const PAGE_SIZE = 16;

const filterOptions: { id: CategoryType, icon: React.ReactNode, label: string }[] = [
  { id: 'all', icon: <Home />, label: 'All' },
  { id: 'articles', icon: <Bookmark />, label: 'Articles' },
  { id: 'notes', icon: <FileText />, label: 'Notes' },
  { id: 'highlights', icon: <Highlighter />, label: 'Highlights' },
  { id: 'images', icon: <Image />, label: 'Images' },
  { id: 'loved', icon: <Heart />, label: 'Loved' },
];

function useSignedUrl(filePath?: string) {
  const [url, setUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!filePath) return;
    let cancelled = false;
    const fetchSignedUrl = async () => {
      const res = await fetch('/api/files/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: filePath }),
      });
      const { signedUrl } = await res.json();
      if (!cancelled) setUrl(signedUrl);
    };
    fetchSignedUrl();
    return () => { cancelled = true; };
  }, [filePath]);
  return url;
}

function getFileTypeAndPath(item: StashedItem) {
  if (['image', 'audio', 'document', 'video'].includes(item.type) && item.file_path) {
    return { isFile: true, fileType: item.type, filePath: item.file_path };
  }
  return { isFile: false };
}

// Helper to get a preview from BlockNote content
function getNotePreview(content?: string): string {
  if (!content) return '';
  try {
    const blocks = JSON.parse(content);
    if (Array.isArray(blocks) && blocks.length > 0) {
      // BlockNote v1: blocks[0].content is a string
      if (typeof blocks[0].content === 'string') {
        return blocks[0].content;
      }
      // BlockNote v2: blocks[0].children is an array of text nodes
      if (Array.isArray(blocks[0].children) && blocks[0].children.length > 0) {
        return blocks[0].children.map((child: any) => child.text || '').join(' ');
      }
    }
  } catch {}
  return '';
}

// Add this new child component above the App function
function StashCard({ item, onSelect, onToggleFavorite, onDelete }: {
  item: StashedItem,
  onSelect: (item: StashedItem) => void,
  onToggleFavorite: (item: StashedItem) => void,
  onDelete: (id: string) => void,
}) {
  const { isFile, fileType, filePath } = getFileTypeAndPath(item);
  const signedUrl = isFile ? useSignedUrl(filePath) : undefined;
  // Card preview logic:
  let cardPreview = null;
  if (isFile && fileType === 'image' && signedUrl) {
    cardPreview = (
      <img
        src={signedUrl}
        alt={item.file_name || 'Photo'}
        className="w-full h-48 object-cover rounded-t-xl bg-muted"
      />
    );
  } else if (item.image_url) {
    cardPreview = (
      <img
        src={item.image_url}
        alt={item.title || 'Preview'}
        className="w-full h-48 object-cover rounded-t-xl bg-muted"
      />
    );
  } else if (isFile && fileType === 'audio' && signedUrl) {
    cardPreview = (
      <div className="w-full h-48 flex items-center justify-center bg-muted rounded-t-xl">
        <audio controls src={signedUrl} className="w-full max-w-xs" />
      </div>
    );
  } else if (isFile && fileType === 'document' && item.thumbnail_url) {
    cardPreview = (
      <img
        src={item.thumbnail_url}
        alt={item.file_name || 'Document preview'}
        className="w-full h-48 object-cover rounded-t-xl bg-muted"
      />
    );
  } else if (isFile && fileType === 'video' && item.thumbnail_url) {
    cardPreview = (
      <img
        src={item.thumbnail_url}
        alt={item.file_name || 'Video preview'}
        className="w-full h-48 object-cover rounded-t-xl bg-muted"
      />
    );
  } else if (isFile && fileType === 'document' && signedUrl) {
    // PDF preview
    if (item.file_name?.toLowerCase().endsWith('.pdf')) {
      cardPreview = (
        <div className="w-full h-48 flex flex-col items-center justify-center bg-muted rounded-t-xl p-4">
          <embed src={signedUrl + '#page=1&zoom=50'} type="application/pdf" width="100%" height="100" />
          <a
            href={signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline text-sm text-center break-all mt-2"
            download={item.file_name || true}
            onClick={e => e.stopPropagation()}
          >
            {item.file_name || 'Download document'}
          </a>
        </div>
      );
    } else {
      // Fallback for other docs
      cardPreview = (
        <div className="w-full h-48 flex flex-col items-center justify-center bg-muted rounded-t-xl p-4">
          <FileText className="h-10 w-10 text-muted-foreground mb-2" />
          <a
            href={signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline text-sm text-center break-all"
            download={item.file_name || true}
            onClick={e => e.stopPropagation()}
          >
            {item.file_name || 'Download document'}
          </a>
        </div>
      );
    }
  } else if (isFile && fileType === 'video' && signedUrl) {
    cardPreview = (
      <div className="w-full h-48 flex items-center justify-center bg-muted rounded-t-xl">
        <video controls src={signedUrl} className="w-full max-w-xs" />
      </div>
    );
  } else {
    cardPreview = (
      <div className="w-full h-48 flex items-center justify-center bg-muted rounded-t-xl">
        <FileText className="h-10 w-10 text-muted-foreground" />
      </div>
    );
  }
  return (
    <Card 
      key={item.id + '-' + item.url}
      className="flex flex-col h-[28rem] group cursor-pointer hover:shadow-md transition-all relative w-full max-w-full"
      onClick={() => onSelect(item)}
    >
      {cardPreview}
      {/* Card content */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        {item.type === 'note' && (
          <>
            <span className="block font-bold stash-title-xl leading-tight mb-1 line-clamp-2">{item.title}</span>
            <p className="stash-text-base text-muted-foreground line-clamp-4 mt-2">
              {getNotePreview(item.content) || 'No preview available'}
            </p>
          </>
        )}
        {item.type !== 'note' && (
          <>
            <h2 className="stash-title-xl font-semibold mb-1 line-clamp-2">
              {item.type === 'image' ? 'Photo' :
               item.type === 'audio' ? 'Audio' :
               item.type === 'document' ? (item.file_name || 'Document') :
               item.title}
            </h2>
            <p className="stash-text-base text-muted-foreground line-clamp-4 mt-2">
              {item.summary || item.highlighted_text || 'No preview available'}
            </p>
          </>
        )}
      </div>
      {/* Action bar at bottom */}
      <div className="flex items-center justify-between border-t px-4 h-12 mt-auto">
        <span className="text-xs text-muted-foreground">{formatDate(item.created_at)}</span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={e => { e.stopPropagation(); onToggleFavorite(item); }}
          >
            <Heart className={`h-4 w-4 ${item.is_loved ? 'fill-current text-red-500' : ''}`} />
          </Button>
          {item.type !== 'note' && item.url && (
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
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={e => { e.stopPropagation(); onDelete(item.id); }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

// Move this to the top of the file, before the App component
function NoteDetailEditor({ note, editMode, setEditContent }: { note: StashedItem, editMode: boolean, setEditContent: (v: string) => void }) {
  let initialContent;
  try {
    initialContent = note.content ? JSON.parse(note.content) : [{ type: 'paragraph', content: '' }];
  } catch {
    initialContent = [{ type: 'paragraph', content: '' }];
  }
  const editor = useCreateBlockNote({ initialContent });

  React.useEffect(() => {
    if (editor) {
      editor.readOnly = !editMode;
    }
  }, [editMode, editor]);

  return (
    <BlockNoteView
      key={note.id}
      editor={editor}
      readOnly={!editMode}
      {...(editMode ? { onChange: () => setEditContent(JSON.stringify(editor.document)) } : {})}
    />
  );
}

export function App({ userId, filter }: AppProps) {
  const [items, setItems] = useState<StashedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
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
  const [showAddModal, setShowAddModal] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  // Restore editMode, editTitle, and editLoading state
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editContent, setEditContent] = useState('');
  const observerRef = useRef<HTMLDivElement | null>(null);
  const [sortDesc, setSortDesc] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showMobileSearchBar, setShowMobileSearchBar] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  // Debug: log when popover opens/closes
  function handleMobileSearchOpenChange(open: boolean) {
    console.log('Mobile search popover open:', open);
    setShowMobileSearch(open);
  }

  useEffect(() => {
    fetchItems({ reset: true, offset: 0, sort: sortDesc });
  }, [userId, sortDesc]);

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

  // Supabase Realtime: Listen for new stashed_items for this user
  useEffect(() => {
    const channel = supabase
      .channel('realtime:stashed_items')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'stashed_items', filter: `user_id=eq.${userId}` },
        (payload) => {
          // Only add if not already present
          setItems((prev) => {
            if (prev.some((item) => item.id === payload.new.id)) return prev;
            return [payload.new as StashedItem, ...prev];
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Fetch items with pagination and filter
  async function fetchItems({ reset = false, offset = 0, sort = sortDesc }: { reset?: boolean, offset?: number, sort?: boolean } = {}) {
    try {
      if (reset) {
        setLoading(true);
        setHasMore(true);
        setItems([]);
      } else {
        setLoadingMore(true);
      }
      let query = supabase
        .from('stashed_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: !sort })
        .range(offset, offset + PAGE_SIZE - 1);
      const { data, error } = await query;
      if (error) throw error;
      if (reset) {
        setItems(data || []);
      } else {
        setItems(prev => [...prev, ...(data || [])]);
      }
      setHasMore((data?.length || 0) === PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch items');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  // Infinite scroll: load more when bottom is visible
  useEffect(() => {
    if (!hasMore || loadingMore || loading) return;
    if (!observerRef.current) {
      console.log('Observer ref not set');
      return;
    }
    const observer = new window.IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        console.log('Observer triggered!');
        fetchItems({ offset: items.length, sort: sortDesc });
      }
    }, { threshold: 0 });
    console.log('Attaching observer', observerRef.current);
    observer.observe(observerRef.current);
    return () => { if (observerRef.current) observer.unobserve(observerRef.current); };
  }, [items.length, hasMore, loadingMore, loading, sortDesc]);

  const filteredItems = items.filter(item => {
    const matchesSearch = searchQuery.trim() === '' ||
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.highlighted_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = 
      activeCategory === 'all' ? true :
      activeCategory === 'articles' ? item.type === 'link' :
      activeCategory === 'highlights' ? item.type === 'highlight' :
      activeCategory === 'images' ? ['image', 'saved_image'].includes(item.type) :
      activeCategory === 'loved' ? item.is_loved :
      activeCategory === 'notes' ? item.type === 'note' :
      false

    return matchesSearch && matchesCategory
  })

  // Deduplicate filteredItems before rendering
  const dedupedItems = Array.from(
    new Map(filteredItems.map(item => [item.id + '-' + item.url, item])).values()
  );

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
    const listKeys = dedupedItems.map(item => item.id + '-' + item.url);
    console.log('List keys:', listKeys);
    return (
      <div className="flex h-[calc(100vh-4rem)]">
        {/* List of items */}
        <div className="w-1/2 border-r">
          <ScrollArea className="h-full">
            <div className="space-y-2 p-4">
              {dedupedItems.map((item) => (
                <div
                  key={item.id + '-' + item.url}
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

  // Helper to ensure content is always valid BlockNote JSON
  function ensureBlockNoteContent(content: string | undefined): string {
    try {
      const parsed = JSON.parse(content || '');
      if (Array.isArray(parsed) && parsed.length > 0) return content!;
    } catch {}
    return JSON.stringify([{ type: 'paragraph', content: '' }]);
  }

  // Handler for saving new note or URL
  async function handleAddItem(data: { type: 'note' | 'link'; title?: string; url?: string; content?: string; urls?: { url: string; created_at?: string }[] }) {
    setAddLoading(true)
    try {
      let payload = {
        ...data,
        user_id: userId,
      };
      if (data.type === 'note') {
        payload = { ...payload, content: ensureBlockNoteContent(data.content) };
      }
      console.log('handleAddItem payload:', payload);
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      console.log('handleAddItem result:', result);
      if (!result.success) {
        throw new Error(result.message || 'Failed to save');
      }
      setShowAddModal(false)
      await fetchItems()
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setAddLoading(false)
    }
  }

  // Restore handleEditNote and handleSaveEditNote
  const handleEditNote = () => {
    if (selectedItem) {
      setEditTitle(selectedItem.title);
      setEditContent(selectedItem.content || '');
      setEditMode(true);
    }
  };
  async function handleSaveEditNote() {
    if (!selectedItem) return;
    setEditLoading(true);
    try {
      const res = await fetch('/api/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedItem.id,
          type: 'note',
          title: editTitle,
          content: editContent,
          user_id: userId,
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || 'Failed to update note');
      setEditMode(false);
      setSelectedItem({ ...selectedItem, title: editTitle, content: editContent });
      await fetchItems();
    } catch (err: any) {
      setError(err.message || 'Failed to update note');
    } finally {
      setEditLoading(false);
    }
  }

  // Update the effect that syncs editContent to selectedItem.content
  useEffect(() => {
    if (selectedItem && selectedItem.type === 'note') {
      setEditMode(false);
      setEditTitle(selectedItem.title);
      setEditContent(selectedItem.content || '');
    }
  }, [selectedItem]);

  useEffect(() => {
    if (selectedItem && selectedItem.type === 'note') {
      console.log('Opening note detail, selectedItem.content:', selectedItem.content);
    }
  }, [selectedItem]);

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
          <Button onClick={() => fetchItems({ reset: true })} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // Before rendering card grid
  const cardKeys = dedupedItems.map(item => item.id + '-' + item.url);
  console.log('Card keys:', cardKeys);

  return (
    <div className="flex h-screen">
      {/* Sidebar: hidden on mobile, visible on md+ */}
      <div className="hidden md:block h-full">
        <Sidebar
          active={activeCategory}
          onCategoryChange={(cat) => setActiveCategory(cat as CategoryType)}
          onAddClick={() => setShowAddModal(true)}
          email={userEmail}
          avatarUrl={user?.user_metadata?.avatar_url}
          name={user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email}
        />
      </div>
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="border-b p-4 flex items-center justify-between relative">
          {/* Mobile: Three-column flex layout */}
          <div className="flex w-full items-center md:hidden">
            {/* Hamburger left */}
            <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileSidebarOpen(true)} aria-label="Open menu">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 max-w-full">
                <SheetTitle className="sr-only">Sidebar Navigation</SheetTitle>
                <Sidebar
                  active={activeCategory}
                  onCategoryChange={(cat) => { setActiveCategory(cat as CategoryType); setIsMobileSidebarOpen(false); }}
                  onAddClick={() => { setShowAddModal(true); setIsMobileSidebarOpen(false); }}
                  email={userEmail}
                  avatarUrl={user?.user_metadata?.avatar_url}
                  name={user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email}
                />
              </SheetContent>
            </Sheet>
            {/* Logo center (mobile only) */}
            <div className="flex-1 flex justify-center">
              <img src="/images/logo.png" alt="StashIt Logo" className="h-14 w-auto" />
            </div>
            {/* Search icon right */}
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Search"
                onClick={() => setShowMobileSearchBar((v) => !v)}
              >
                <Search />
              </Button>
            </div>
          </div>
          {/* Desktop header layout */}
          <div className="hidden md:flex flex-1 items-center md:ml-4 gap-6">
            {/* Search bar and filters (centered, wide) */}
            <div className="flex-1 flex gap-2 items-center justify-center max-w-4xl mx-auto">
              <Input
                type="search"
                placeholder="Search stashed items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-base px-4 py-2"
              />
              <div className="flex gap-1 ml-2">
                {filterOptions.map(opt => (
                  <Button
                    key={opt.id}
                    variant={activeCategory === opt.id ? 'secondary' : 'ghost'}
                    size="icon"
                    className="rounded-full"
                    onClick={() => setActiveCategory(opt.id)}
                    aria-label={opt.label}
                  >
                    {opt.icon}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full ml-2"
                  onClick={() => setSortDesc(s => !s)}
                  aria-label="Sort order"
                >
                  {sortDesc ? <ArrowDownAZ /> : <ArrowUpAZ />}
                </Button>
              </div>
            </div>
            {/* User menu right-aligned */}
            <div className="flex items-center gap-2 ml-4">
              <ModeToggle />
            </div>
          </div>
        </header>
        {/* Mobile accordion search bar row */}
        <div
          className={
            `md:hidden transition-all duration-300 overflow-hidden bg-background px-4 ${showMobileSearchBar ? 'max-h-20 py-3' : 'max-h-0 py-0'}`
          }
        >
          <Input
            type="search"
            placeholder="Search stashed items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus={showMobileSearchBar}
            className="w-full text-base"
          />
        </div>
        {/* Add Modal */}
        <AddItemModal open={showAddModal} onOpenChange={setShowAddModal} onSave={handleAddItem} loading={addLoading} />
        {/* Content Area */}
        <main className="flex-1 overflow-y-auto h-full px-4 md:px-0" style={{ background: 'hsla(var(--ds-background-200-value),0,0%,98%,1)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-4 md:p-6 min-h-[80vh]">
            {dedupedItems.filter(Boolean).map((item) => (
              <StashCard
                key={item.id + '-' + item.url}
                item={item}
                onSelect={setSelectedItem}
                onToggleFavorite={toggleFavorite}
                onDelete={deleteItem}
              />
            ))}
          </div>
          {/* Observer div for infinite scroll - must be outside the grid */}
          <div ref={observerRef} className="h-8"></div>
          {loadingMore && <div className="text-center py-4 text-muted-foreground">Loading more...</div>}

          {/* Detail Modal for selected item */}
          <Dialog open={!!selectedItem} onOpenChange={async open => {
            if (!open && selectedItem && selectedItem.type === 'note' && editContent !== (selectedItem.content || '')) {
              setSaveStatus('saving');
              console.log('Saving note on modal close:', { id: selectedItem.id, content: editContent });
              const res = await fetch('/api/items', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: selectedItem.id,
                  type: 'note',
                  title: selectedItem.title,
                  content: editContent,
                  user_id: userId,
                }),
              });
              const result = await res.json();
              console.log('Save result:', result);
              setSaveStatus('saved');
              setTimeout(() => setSaveStatus('idle'), 1000);
            }
            if (!open) setSelectedItem(null);
          }}>
            <DialogContent className="max-w-3xl w-full p-0 overflow-hidden flex flex-col">
              {selectedItem && (
                <div className="flex flex-col h-full max-h-[80vh] relative">
                  {/* Main image at the top */}
                  {selectedItem.image_url && (
                    <img
                      src={selectedItem.image_url}
                      alt={selectedItem.title}
                      className="w-full max-h-64 object-cover rounded-t-lg mb-4"
                    />
                  )}
                  {/* DialogTitle for accessibility */}
                  <DialogTitle className="text-xl font-bold px-6 pt-4 pb-2 break-words flex items-center gap-2">
                    {selectedItem.type === 'note' && <FileText className="h-5 w-5 text-accent-foreground" />}
                    {editMode ? (
                      <Input
                        className="text-xl font-bold px-0 py-1 border-none bg-transparent focus:ring-0 focus-visible:ring-0"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        placeholder="Note title"
                        autoFocus
                      />
                    ) : (
                      selectedItem.ai_synopsis_title || selectedItem.title || "Details"
                    )}
                    {/* Edit icon for notes */}
                    {selectedItem.type === 'note' && !editMode && (
                      <Button variant="ghost" size="icon" className="ml-2" onClick={handleEditNote}>
                        <PenLine className="h-5 w-5 text-muted-foreground" />
                      </Button>
                    )}
                  </DialogTitle>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {selectedItem && selectedItem.type === 'note' && (
                      <div className="border rounded-md overflow-hidden bg-background">
                        <NoteDetailEditor note={{ ...selectedItem, content: editMode ? editContent : selectedItem.content }} editMode={editMode} setEditContent={setEditContent} />
                      </div>
                    )}
                    {/* Show full highlight text if item is a highlight */}
                    {selectedItem.type === 'highlight' && selectedItem.highlighted_text && (
                      <blockquote className="border-l-4 border-primary pl-4 my-2 text-base bg-muted/30 rounded">
                        {selectedItem.highlighted_text}
                      </blockquote>
                    )}
                    {/* Summary at the top */}
                    {selectedItem.summary && (
                      <p className="text-muted-foreground text-base font-medium mb-2">{selectedItem.summary}</p>
                    )}
                    {/* AI Synopsis fields */}
                    {selectedItem.ai_synopsis && (
                      <div className="space-y-2 border rounded-lg p-4 bg-muted/50 relative">
                        {/* AI icon at top left */}
                        <span className="absolute left-3 top-3 text-primary/80">
                          {/* Using Lucide Sparkles icon for AI flair */}
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M6.343 17.657l-1.414 1.414m12.728 0l-1.414-1.414M6.343 6.343L4.929 4.929M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                        </span>
                        {selectedItem.ai_synopsis_title && (
                          <div><span className="font-semibold">Title/Author:</span> {selectedItem.ai_synopsis_title}</div>
                        )}
                        {selectedItem.ai_synopsis_purpose && (
                          <div><span className="font-semibold">Purpose:</span> {selectedItem.ai_synopsis_purpose}</div>
                        )}
                        {selectedItem.ai_synopsis_structure && (
                          <div><span className="font-semibold">Structure:</span> {selectedItem.ai_synopsis_structure}</div>
                        )}
                        {selectedItem.ai_synopsis_key_points && (
                          <div><span className="font-semibold">Key Points:</span> {selectedItem.ai_synopsis_key_points}</div>
                        )}
                        {selectedItem.ai_synopsis_takeaways && (
                          <div><span className="font-semibold">Takeaways:</span> {selectedItem.ai_synopsis_takeaways}</div>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Fixed action bar at the bottom */}
                  <div className="flex items-center justify-between border-t px-6 py-3 bg-background sticky bottom-0 z-10">
                    <span className="text-xs text-muted-foreground">{formatDate(selectedItem.created_at)}</span>
                    <div className="flex items-center gap-2">
                      {editMode && selectedItem.type === 'note' ? (
                        <>
                          <Button onClick={() => setEditMode(false)} variant="ghost" disabled={editLoading}>Cancel</Button>
                          <Button onClick={handleSaveEditNote} disabled={editLoading} className="bg-black text-white hover:bg-zinc-900">
                            {editLoading ? 'Saving...' : 'Save'}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={e => { e.stopPropagation(); toggleFavorite(selectedItem); }}
                          >
                            <Heart className={`h-4 w-4 ${selectedItem.is_loved ? 'fill-current text-red-500' : ''}`} />
                          </Button>
                          {selectedItem.type !== 'note' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={e => {
                                e.stopPropagation();
                                window.open(selectedItem.url, "_blank", "noopener,noreferrer");
                              }}
                              aria-label="Open link in new tab"
                            >
                              <Link className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={e => { e.stopPropagation(); deleteItem(selectedItem.id); setSelectedItem(null); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </main>
        {/* Mobile filter/action bar fixed to bottom */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t flex justify-around items-center h-16 shadow-lg">
          {filterOptions.map(opt => (
            <Button
              key={opt.id}
              variant={activeCategory === opt.id ? 'secondary' : 'ghost'}
              size="icon"
              className="flex flex-col items-center justify-center rounded-full"
              onClick={() => setActiveCategory(opt.id)}
              aria-label={opt.label}
            >
              {opt.icon}
              <span className="text-[10px] mt-1">{opt.label}</span>
            </Button>
          ))}
        </div>
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
 
 