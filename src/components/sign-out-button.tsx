'use client';

import { useRouter } from 'next/navigation';
import { Button } from './ui/button';

export default function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    const response = await fetch('/auth/signout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      router.refresh();
      router.push('/');
    }
  };

  return (
    <Button onClick={handleSignOut} variant="outline">
      Sign Out
    </Button>
  );
} 