import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import Papa from 'papaparse';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';

const BlockNoteEditor = dynamic(() => import('./blocknote-editor'), { ssr: false });

interface AddItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { type: 'note' | 'link'; title: string; url?: string; content?: string }) => void;
  loading?: boolean;
}

export function AddItemModal({ open, onOpenChange, onSave, loading }: AddItemModalProps) {
  const [tab, setTab] = useState<'note' | 'link'>('note');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [urlMode, setUrlMode] = useState<'single' | 'batch'>('single');
  const [batchUrls, setBatchUrls] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvRows, setCsvRows] = useState<{ url: string; created_at?: string }[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);

  const handleSave = () => {
    if (tab === 'note' && !title.trim()) {
      setError('Title is required');
      return;
    }
    if (tab === 'link') {
      if (urlMode === 'single') {
        if (!url.trim()) {
          setError('URL is required');
          return;
        }
        setError(null);
        onSave({ type: tab, title: '', url });
      } else if (csvFile && csvRows.length > 0) {
        setError(null);
        onSave({ type: tab, urls: csvRows });
      } else {
        // Batch mode with textarea
        const urls = batchUrls.split('\n').map(u => u.trim()).filter(Boolean);
        if (urls.length === 0) {
          setError('Please enter at least one URL');
          return;
        }
        setError(null);
        onSave({ type: tab, urls: urls.map(url => ({ url })) });
      }
      return;
    }
    setError(null);
    onSave({ type: tab, title, content });
  };

  const handleTabChange = (tabValue: string) => {
    setTab(tabValue as 'note' | 'link');
    setError(null);
  };

  const handleClose = () => {
    setTitle('');
    setUrl('');
    setContent('');
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-4 pb-2">
          <DialogTitle>Add New {tab === 'note' ? 'Note' : 'URL'}</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6">
          <Tabs value={tab} onValueChange={handleTabChange} className="mb-4">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="note">Note</TabsTrigger>
              <TabsTrigger value="link">URL</TabsTrigger>
            </TabsList>
            <TabsContent value="note">
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="note-title">Title</Label>
                  <Input id="note-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Note title" className="text-base font-semibold" />
                </div>
                <div>
                  <Label htmlFor="note-content">Content</Label>
                  <div className="border rounded-md overflow-hidden bg-background">
                    <BlockNoteEditor value={content} onChange={setContent} />
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="link">
              <div className="space-y-4 mt-4">
                <div className="flex gap-2 mb-2">
                  <Button
                    variant={urlMode === 'single' ? 'default' : 'outline'}
                    onClick={() => setUrlMode('single')}
                    size="sm"
                  >
                    Single URL
                  </Button>
                  <Button
                    variant={urlMode === 'batch' ? 'default' : 'outline'}
                    onClick={() => setUrlMode('batch')}
                    size="sm"
                  >
                    Batch Import
                  </Button>
                </div>
                {urlMode === 'single' ? (
                  <div>
                    <Label htmlFor="url-url">URL</Label>
                    <Input id="url-url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="batch-urls">Paste URLs (one per line) or upload CSV</Label>
                    <Textarea id="batch-urls" value={batchUrls} onChange={e => setBatchUrls(e.target.value)} rows={6} placeholder="https://site1.com\nhttps://site2.com" disabled={!!csvFile} />
                    <input
                      type="file"
                      accept=".csv"
                      onChange={e => {
                        const file = e.target.files?.[0] || null;
                        setCsvFile(file);
                        setCsvError(null);
                        setCsvRows([]);
                        if (file) {
                          Papa.parse(file, {
                            header: true,
                            skipEmptyLines: true,
                            complete: (results) => {
                              const rows = (results.data as any[]).map(row => {
                                let url = row.url?.trim() || row.URL?.trim() || '';
                                let created_at = row.created_at || row["created_at"] || row["Created At"] || row["created"] || '';
                                if (created_at) {
                                  // Convert to ISO
                                  const d = new Date(created_at);
                                  if (!isNaN(d.getTime())) created_at = d.toISOString();
                                  else created_at = '';
                                }
                                return url ? { url, created_at } : null;
                              }).filter(Boolean) as { url: string; created_at?: string }[];
                              setCsvRows(rows);
                              if (rows.length === 0) setCsvError('No valid URLs found in CSV.');
                            },
                            error: (err) => setCsvError('CSV parse error: ' + err.message),
                          });
                        }
                      }}
                      className="block mt-2"
                    />
                    {csvError && <div className="text-red-500 text-xs">{csvError}</div>}
                    {csvRows.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-2 max-h-32 overflow-auto border rounded p-2 bg-muted/30">
                        <div>Preview ({csvRows.length} URLs):</div>
                        {csvRows.slice(0, 10).map((row) => (
                          <div key={row.url + (row.created_at || '')}>{row.url} {row.created_at && <span className="ml-2 text-muted-foreground">({row.created_at})</span>}</div>
                        ))}
                        {csvRows.length > 10 && <div>...and {csvRows.length - 10} more</div>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
          {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="ghost" onClick={handleClose} disabled={loading}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading} className="bg-black text-white hover:bg-zinc-900">
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 