"use client";

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/core/DashboardLayout';
import DCAComponent from '@/components/DCAComponent';

export default function DCADashboard() {
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="loading-container">Loading...</div>;

  return (
    <DashboardLayout>
      <main className="p-6 overflow-auto h-full">
        <h1 className="text-2xl font-bold mb-6">DCA Strategies</h1>
        <DCAComponent />
      </main>
    </DashboardLayout>
  );
} 