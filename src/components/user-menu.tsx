'use client'

import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User as UserIcon } from 'lucide-react'

interface UserMenuProps {
  user: User
}

export default function UserMenu({ user }: UserMenuProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSignOut = async () => {
    try {
      setIsLoading(true)
      await supabase.auth.signOut()
      router.refresh()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full justify-start px-2 py-1.5 h-auto font-normal hover:bg-accent rounded-md"
        >
          <div className="flex items-center gap-2">
            <UserIcon size={18} />
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">
                {user.email?.split('@')[0]}
              </span>
              <span className="text-xs text-muted-foreground">
                {user.email}
              </span>
            </div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isLoading}
          onSelect={() => router.push('/settings')}
        >
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isLoading}
          onSelect={handleSignOut}
          className="text-red-600 focus:text-red-600"
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 