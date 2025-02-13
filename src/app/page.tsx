'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import AuthForm from '@/components/auth-form'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [showAuthForm, setShowAuthForm] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error
        
        if (session) {
          setHasSession(true)
          router.push('/dashboard')
        }
      } catch (error) {
        console.error('Error checking session:', error)
      } finally {
        setIsLoading(false)
      }
    }
    checkUser()
  }, [router])

  if (isLoading && hasSession) return null

  return (
    <div className="flex min-h-screen">
      {/* Left section with dark background */}
      <div className="hidden lg:flex w-1/2 bg-black text-white p-12 flex-col justify-between">
        <div>
          <img 
            src="/images/logo.png" 
            alt="StashIt Logo" 
            className="h-16 w-auto invert"
          />
        </div>
        
        <div className="space-y-4">
          <blockquote className="text-3xl font-medium leading-tight">
            "This app has saved me countless hours of work and helped me organize my online resources better than ever before."
          </blockquote>
          <p className="text-gray-400">Sofia Davis</p>
        </div>
      </div>

      {/* Right section */}
      <div className="flex-1 p-8 lg:p-12 flex flex-col">
        {/* Top navigation */}
        <div className="flex justify-between items-center mb-8">
          <div className="lg:hidden">
            <img 
              src="/images/logo.png" 
              alt="StashIt Logo" 
              className="h-12 w-auto dark:invert"
            />
          </div>
          <div className="ml-auto">
            <Button
              variant="ghost"
              onClick={() => {
                setShowAuthForm(true)
                setIsRegistering(false)
              }}
            >
              Login
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex items-center justify-center">
          {showAuthForm ? (
            <AuthForm 
              initialMode={isRegistering} 
              onCancel={() => setShowAuthForm(false)}
            />
          ) : (
            <div className="max-w-md mx-auto text-center space-y-6">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold">Create an account</h2>
                <p className="text-muted-foreground">
                  Enter your email below to create your account
                </p>
              </div>

              <div className="space-y-4">
                <Button 
                  className="w-full" 
                  onClick={() => {
                    setShowAuthForm(true)
                    setIsRegistering(true)
                  }}
                >
                  Sign up with Email
                </Button>
              </div>

              <p className="px-8 text-sm text-muted-foreground">
                By clicking continue, you agree to our{' '}
                <a href="#" className="underline underline-offset-4 hover:text-primary">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="underline underline-offset-4 hover:text-primary">
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground mt-6">
          &copy; {new Date().getFullYear()} StashIt. All rights reserved.
        </div>

        {process.env.NODE_ENV === 'development' && (
          <Button
            variant="outline"
            onClick={() => supabase.auth.signOut()}
            className="absolute top-4 right-4"
          >
            Clear Session (Dev)
          </Button>
        )}
      </div>
    </div>
  )
}