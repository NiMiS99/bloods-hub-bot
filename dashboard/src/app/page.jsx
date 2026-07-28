'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.push('/dashboard');
  }, [router]);
  return (
    <div className="flex h-screen items-center justify-center bg-dark-950">
      <div className="spinner" />
    </div>
  );
}
