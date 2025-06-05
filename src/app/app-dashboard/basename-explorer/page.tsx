"use client";

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/core/DashboardLayout';
import BasenameExplorer from '@/components/ui/BasenameExplorer';
import '@/components/ui/basename-explorer.css';
import ClientOnly from '@/components/utils/ClientOnly';

export default function BasenameExplorerPage() {
  return (
    <ClientOnly>
      <BasenameExplorerPageContent />
    </ClientOnly>
  );
}

function BasenameExplorerPageContent() {
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