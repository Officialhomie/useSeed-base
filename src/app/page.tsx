"use client";

import { ConnectAndSIWE } from '@/components/ConnectAndSIWE';
import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';
import '../components/basename-explorer.css';
import '../components/navigation-bar.css';
import './page-styles.css';
import './smart-wallet.css';
import Link from 'next/link';
import NavigationBar from '@/components/NavigationBar';

export default function Home() {
  const account = useAccount();
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <NavigationBar />
      <main className="main-content">
        <section className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title">
              <span className="gradient-text">SpendSave</span> Protocol
            </h1>
            <p className="hero-subtitle">
              Automate your savings and investments with our sophisticated DeFi protocol built on Uniswap V4
            </p>
            <div className="hero-buttons">
              <Link href="/app-dashboard" className="primary-button">Get Started</Link>
              <Link href="/smart-wallet" className="secondary-button flex items-center">
                <span className="mr-2">Try Smart Wallet</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-value">$4.2M</span>
                <span className="stat-label">Total Savings</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-value">12.4K</span>
                <span className="stat-label">Active Users</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-value">3.2%</span>
                <span className="stat-label">Avg. APY</span>
              </div>
            </div>
          </div>
          <div className="hero-graphics">
            <div className="hero-graphic-item">
              <div className="hero-wallet-container">
                {/* Add your cool graphics here */}
                <div className="relative wallet-icon-container">
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 opacity-75 blur"></div>
                  <div className="relative bg-black rounded-full p-5">
                    <svg className="w-16 h-16 text-blue-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2"/>
                      <path d="M12 8V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        <section className="features-section">
          <div className="section-container">
            <div className="section-header">
              <h2 className="section-title">
                <span className="gradient-text">Smart Savings</span> Features
              </h2>
              <p className="section-description">
                SpendSave protocol makes it easy to optimize your crypto savings and investments
              </p>
            </div>
            
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">💰</div>
                <h3 className="feature-title">Automated Savings</h3>
                <p className="feature-description">
                  Set up recurring deposits and automate your crypto savings strategy
                </p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">📈</div>
                <h3 className="feature-title">Dollar-Cost Averaging</h3>
                <p className="feature-description">
                  Schedule regular investments to reduce the impact of volatility
                </p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">🔄</div>
                <h3 className="feature-title">Yield Optimization</h3>
                <p className="feature-description">
                  Automatically allocate funds to the highest yielding protocols
                </p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">🛡️</div>
                <h3 className="feature-title">Risk Management</h3>
                <p className="feature-description">
                  Set risk parameters and protect your savings with smart thresholds
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
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
