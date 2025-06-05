"use client";

import { useState, useEffect } from 'react';
import EnhancedUserExperience from '@/components/ui/EnhancedUserExperience';
import NavigationBar from '@/components/core/NavigationBar';
import ClientOnly from '@/components/utils/ClientOnly';

export default function EnhancedExperiencePage() {
  return (
    <ClientOnly>
      <EnhancedExperiencePageContent />
    </ClientOnly>
  );
}

function EnhancedExperiencePageContent() {

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <main className="container max-w-6xl mx-auto py-10 px-4">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Enhanced User Experience</h1>
            <p className="text-muted-foreground">
              Discover our innovative features designed to provide a more intuitive and personalized DeFi experience.
            </p>
          </div>
          
          <EnhancedUserExperience />
        </div>
      </main>
    </div>
  );
} 