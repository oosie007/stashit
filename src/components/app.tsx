// components/app.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2, Quote } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

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
}

export const App = () => {
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery] = useState('');
  const [activeCategory] = useState<'all' | SavedItem['type']>('all');

  useEffect(() => {
    fetchStashedItems();

    // Setup realtime subscription
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
          console.log('New item received:', payload);
          setSavedItems((current) => [payload.new as SavedItem, ...current]);
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
          console.log('Item deleted:', payload);
          setSavedItems((current) =>
            current.filter((item) => item.id !== payload.old.id)
          );
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const fetchStashedItems = async () => {
    try {
      setLoading(true);
      const { data, error: dbError } = await supabase
        .from('stashed_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;

      setSavedItems(data || []);
    } catch (err) {
      console.error('Error fetching items:', err);
      setError('Failed to fetch saved items');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const { error: deleteError } = await supabase
        .from('stashed_items')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
    } catch (err) {
      console.error('Error deleting item:', err);
      setError('Failed to delete item');
    }
  };

  const filterItems = (items: SavedItem[]) => {
    return items.filter(item => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        item.title.toLowerCase().includes(searchLower) ||
        (item.content?.toLowerCase().includes(searchLower)) ||
        (item.summary?.toLowerCase().includes(searchLower)) ||
        (item.tags.some(tag => tag.toLowerCase().includes(searchLower)));
      
      const matchesCategory = activeCategory === 'all' || item.type === activeCategory;
      return matchesSearch && matchesCategory;
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">StashIt</h1>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
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
                        console.error('Image failed to load:', item.image_url);
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
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
  );
};