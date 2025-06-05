"use client";

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import DashboardLayout from '@/components/core/DashboardLayout';
import DashboardOverview from '@/components/savings/overview/DashboardOverview';
import ClientOnly from '@/components/utils/ClientOnly';
import './dashboard.css';

export default function AppDashboard() {
  return (
    <ClientOnly>
      <AppDashboardContent />
    </ClientOnly>
  );
}

function AppDashboardContent() {
  const { address } = useAccount(); // Direct wagmi hook usage - safe since we're client-only

  return (
    <DashboardLayout>
      <main className="p-6 overflow-auto h-full">
        <DashboardOverview />
      </main>
    </DashboardLayout>
  );
}