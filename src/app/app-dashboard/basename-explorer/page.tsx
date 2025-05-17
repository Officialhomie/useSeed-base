"use client";

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import BasenameExplorer from '@/components/BasenameExplorer';

export default function BasenameExplorerPage() {
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="loading-container">Loading...</div>;

  return (
    <DashboardLayout>
      <main className="p-6 overflow-auto h-full">
        <BasenameExplorer />
      </main>
    </DashboardLayout>
  );
} 