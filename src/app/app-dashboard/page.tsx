"use client";

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import DashboardLayout from '@/components/core/DashboardLayout';
import DashboardOverview from '@/components/savings/overview/DashboardOverview';
import './dashboard.css';

export default function AppDashboard() {
  const { address } = useAccount();
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="loading-container">Loading...</div>;

  return (
    <DashboardLayout>
      <main className="p-6 overflow-auto h-full">
        <DashboardOverview />
      </main>
    </DashboardLayout>
  );
} 