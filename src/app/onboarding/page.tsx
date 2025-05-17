"use client";

import { useEffect, useState } from 'react';
import OnboardingHero from '@/components/OnboardingHero';
import NavigationBar from '@/components/NavigationBar';
import { ConnectAndSIWE } from '@/components/ConnectAndSIWE';
import { motion } from 'framer-motion';

export default function OnboardingPage() {
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <NavigationBar />
      <main className="min-h-screen bg-black text-white">
        <OnboardingHero />
        
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto">
            <motion.div 
              className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-2xl p-8 shadow-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h2 className="text-2xl font-bold mb-6">Connect Your Wallet to Get Started</h2>
              <p className="text-gray-400 mb-8">
                Connect your wallet to access the SpendSave Protocol and start optimizing your crypto portfolio.
              </p>
              
              <div className="flex justify-center">
                <ConnectAndSIWE />
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-800">
                <h3 className="text-lg font-medium mb-4">Why connect your wallet?</h3>
                <ul className="space-y-2 text-gray-400">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Access your personalized dashboard
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Set up automated savings strategies
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Track your savings and investment growth
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Configure DCA plans and yield farming strategies
                  </li>
                </ul>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
    </>
  );
} 