"use client";

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/core/DashboardLayout';
import BasenameExplorer from '@/components/ui/BasenameExplorer';
import '@/components/ui/basename-explorer.css';

export default function BasenameExplorerPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="loading-container">Loading...</div>;

  return (
    <DashboardLayout>
      <main className="p-4 md:p-8 overflow-auto h-full">
        <div className="mt-4">
          <BasenameExplorer />
        </div>
      </main>
    </DashboardLayout>
  );
} 