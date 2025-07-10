'use client'

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Settings, LogOut, User as UserIcon } from 'lucide-react'
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';

function stringToInitials(name?: string, email?: string) {
  if (name) {
    const parts = name.split(' ')
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || ''
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  if (email) return email[0]?.toUpperCase() || ''
  return ''
}

export default function UserMenu({ email, avatarUrl, name }: { email: string, avatarUrl?: string, name?: string }) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [showTelegramDialog, setShowTelegramDialog] = useState(false);
  const [telegramCode, setTelegramCode] = useState<string | null>(null);
  const [loadingTelegram, setLoadingTelegram] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  async function handleLinkTelegram() {
    setLoadingTelegram(true);
    setTelegramCode(null);
    try {
      const res = await fetch('/api/generate-telegram-link-code', { method: 'POST' });
      const data = await res.json();
      if (data.code) setTelegramCode(data.code);
    } catch (e) {
      setTelegramCode('Error generating code');
    } finally {
      setLoadingTelegram(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative flex items-center gap-2 px-2 py-1">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name || email}
                className="w-8 h-8 rounded-full object-cover border border-zinc-200 bg-zinc-100"
              />
            ) : (
              <span className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-600 font-semibold text-base border border-zinc-200">
                {stringToInitials(name, email)}
              </span>
            )}
            <span className="truncate max-w-[120px] text-left text-sm font-medium">{email}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <UserIcon className="mr-2 h-4 w-4" />
            <span>My Account</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="outline" className="w-full mt-2" onClick={() => { setShowTelegramDialog(true); handleLinkTelegram(); }}>
        Link Telegram
      </Button>
      <Dialog open={showTelegramDialog} onOpenChange={setShowTelegramDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link your Telegram</DialogTitle>
          </DialogHeader>
          {loadingTelegram ? (
            <div>Generating code...</div>
          ) : telegramCode ? (
            <div>
              <div className="font-mono text-lg mb-2">{telegramCode}</div>
              <div>Send <span className="font-mono">/link {telegramCode}</span> to the StashIt Telegram bot.</div>
            </div>
          ) : null}
          <DialogClose asChild>
            <Button variant="secondary">Close</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </>
  )
} 