"use client";

import { useState, useEffect } from 'react';
import EnhancedUserExperience from '@/components/EnhancedUserExperience';
import NavigationBar from '@/components/NavigationBar';

export default function EnhancedExperiencePage() {
  // Handle client-side hydration
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  if (!isClient) {
    return null;
  }
  
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