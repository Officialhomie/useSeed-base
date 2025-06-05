"use client";

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/core/DashboardLayout';
import DCAComponent from '@/components/trading/dca/DCAComponent';
import ClientOnly from '@/components/utils/ClientOnly';

export default function DCADashboard() {
  return (
    <ClientOnly>
      <DCADashboardContent />
    </ClientOnly>
  );
}

function DCADashboardContent() {
  return (
    <DashboardLayout>
      <main className="p-6 overflow-auto h-full">
        <h1 className="text-2xl font-bold mb-6">DCA Strategies</h1>
        <DCAComponent />
      </main>
    </DashboardLayout>
  );
}