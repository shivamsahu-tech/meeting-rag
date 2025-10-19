// app/components/HomeRedirect.js (Client Component)
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Perform client-side logic or checks here
    const userLoggedIn = true; // Example condition
    if (userLoggedIn) {
      router.replace('/upload-file'); // Redirect to '/user-profile'
    }
  }, [router]);

  return null; // This component doesn't render anything visually
}