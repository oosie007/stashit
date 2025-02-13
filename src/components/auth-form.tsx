'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { AuthError } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AuthFormProps {
  initialMode?: boolean;
  onCancel?: () => void;
}

export default function AuthForm({ initialMode = false, onCancel }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(initialMode);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        
        if (error) throw error;
        
        setMessage({
          text: 'Check your email for the confirmation link.',
          type: 'success'
        });
        setEmail('');
        setPassword('');
      } else {
        const { error, data } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        if (data.session) {
          router.refresh();
          router.push('/dashboard');
        }
      }
    } catch (error) {
      if (error instanceof AuthError) {
        setMessage({
          text: error.message,
          type: 'error'
        });
      } else {
        setMessage({
          text: 'An unexpected error occurred',
          type: 'error'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{isRegistering ? 'Create Account' : 'Welcome Back'}</CardTitle>
            <CardDescription>
              {isRegistering 
                ? 'Enter your email below to create your account'
                : 'Enter your email and password to sign in'
              }
            </CardDescription>
          </div>
          {onCancel && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              className="rounded-full"
            >
              ✕
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              <AlertDescription>
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading 
              ? 'Loading...' 
              : isRegistering 
                ? 'Create Account' 
                : 'Sign In'
            }
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => {
            setIsRegistering(!isRegistering);
            setMessage(null);
            setEmail('');
            setPassword('');
          }}
        >
          {isRegistering
            ? 'Already have an account? Sign in'
            : "Don't have an account? Sign up"}
        </Button>
      </CardFooter>
    </Card>
  );
} 