"use client";

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import SwapWithSavings from '@/components/SwapWithSavings';
import DashboardLayout from '@/components/core/DashboardLayout';

export default function SwapPage() {
  const { address } = useAccount();
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="loading-container">Loading...</div>;

  return (
    <DashboardLayout>
      <main className="flex flex-col w-full max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Swap with Savings</h1>
          <p className="text-gray-400 mt-1">Exchange tokens while automatically saving a portion</p>
        </div>
        <div className="w-full max-w-md mx-auto">
          <SwapWithSavings />
        </div>
      </main>
    </DashboardLayout>
  );
} 