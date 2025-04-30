"use client";

import SwapWithSavings from '@/components/SwapWithSavings';

export default function SwapPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-screen-lg mx-auto py-8">
        <h1 className="text-2xl font-bold mb-8 text-center">Swap with Savings</h1>
        <SwapWithSavings />
      </div>
    </div>
  );
} 