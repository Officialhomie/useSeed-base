"use client";

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import DashboardLayout from '@/components/core/DashboardLayout';
import DashboardOverview from '@/components/savings/overview/DashboardOverview';
import './dashboard.css';


function useClientWagmi() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const account = mounted ? useAccount() : { address: undefined };
  return { ...account, mounted };
}

export default function AppDashboard() {
  const [localMounted, setLocalMounted] = useState(false);
  const { address, mounted: wagmiMounted } = useClientWagmi();

  useEffect(() => {
    setLocalMounted(true);
  }, []);

  if (!localMounted || !wagmiMounted) return (
    <div className="flex items-center justify-center h-full">
      <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6 flex items-center space-x-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <p className="text-white">Loading dashboard...</p>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <main className="p-6 overflow-auto h-full">
        <DashboardOverview />
      </main>
    </DashboardLayout>
  );
} 