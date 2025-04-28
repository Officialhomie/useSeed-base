"use client";

import { ConnectAndSIWE } from '@/components/ConnectAndSIWE';
import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';
import '../smart-wallet.css';
import Link from 'next/link';

export default function SmartWalletPage() {
  const account = useAccount();
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      <nav className="border-b border-gray-800 bg-black/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center gap-2">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-[1px] rounded-full">
                  <div className="bg-black rounded-full p-2">
                    <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2"/>
                      <path d="M12 8V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>
                <span className="font-semibold text-white">SpendSave</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <a href="https://docs.base.org/guides/smart-wallets" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-300 hover:text-white transition-colors">
                Documentation
              </a>
              <a href="https://github.com/base-org/guides/blob/main/smart-wallet-guide.md" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-300 hover:text-white transition-colors">
                GitHub
              </a>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-8">
            <div className="relative wallet-icon-container">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 opacity-75 blur"></div>
              <div className="relative bg-black rounded-full p-5">
                <svg className="w-12 h-12 text-blue-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 8V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
            Smart Wallet + SIWE
          </h1>
          
          <p className="text-gray-400 text-lg md:text-xl max-w-3xl mx-auto mb-8">
            Experience the future of web3 authentication with Coinbase Smart Wallet and Sign-In With Ethereum
          </p>
          
          {mounted && (
            <div className="flex justify-center">
              <ConnectAndSIWE />
            </div>
          )}
        </div>
        
        {mounted && account.address && (
          <div className="mt-16 max-w-3xl mx-auto">
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm gradient-border">
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">What's Next?</h2>
              <div className="grid gap-6 md:grid-cols-2">
                <FeatureCard 
                  icon="💸"
                  title="Transfer Assets" 
                  description="Send tokens between accounts or to friends with low gas fees using your smart wallet."
                />
                <FeatureCard 
                  icon="🔐"
                  title="Security Features" 
                  description="Explore security features like social recovery and multi-factor authentication."
                />
                <FeatureCard 
                  icon="🔄"
                  title="Batch Transactions" 
                  description="Combine multiple transactions into one to save on gas fees."
                />
                <FeatureCard 
                  icon="🌐"
                  title="Cross-Chain Bridge" 
                  description="Bridge assets between different blockchains with just a few clicks."
                />
              </div>
            </div>
          </div>
        )}

        <div className="mt-16 text-center">
          <div className="inline-block bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm">
            <h3 className="text-xl font-semibold mb-4 text-white">Learn More About Smart Wallets</h3>
            <div className="flex flex-wrap justify-center gap-4">
              <a 
                href="https://docs.base.org/guides/smart-wallets" 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-900/30 border border-blue-800 rounded-lg text-blue-300 hover:bg-blue-900/50 transition-colors"
              >
                Smart Wallet Guide
              </a>
              <a 
                href="https://www.coinbase.com/wallet/smart" 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-900/30 border border-blue-800 rounded-lg text-blue-300 hover:bg-blue-900/50 transition-colors"
              >
                Coinbase Smart Wallet
              </a>
              <a 
                href="https://login.xyz/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-900/30 border border-blue-800 rounded-lg text-blue-300 hover:bg-blue-900/50 transition-colors"
              >
                Sign-In With Ethereum
              </a>
            </div>
          </div>
        </div>
      </div>
      
      <footer className="py-6 text-center text-gray-500 text-sm">
        <p>
          Built with Coinbase Smart Wallet &amp; Next.js
        </p>
      </footer>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-black/60 border border-gray-800 rounded-lg p-5 hover:border-blue-800 transition-colors feature-card">
      <div className="text-2xl mb-2 feature-icon">{icon}</div>
      <h3 className="font-medium text-lg text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
} 