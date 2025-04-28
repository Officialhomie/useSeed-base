"use client";

import { ConnectAndSIWE } from '@/components/ConnectAndSIWE';
import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';
import NavigationBar from '@/components/NavigationBar';
import '../page-styles.css';
import '../smart-wallet.css';
import './dashboard.css';

export default function AppDashboard() {
  const account = useAccount();
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="loading-container">Loading...</div>;

  return (
    <>
      <NavigationBar />
      <main className="main-content">
        <section className="dashboard-section">
          <div className="dashboard-container">
            <h1 className="dashboard-title">
              <span className="gradient-text">SpendSave</span> Dashboard
            </h1>
            <p className="dashboard-subtitle">
              Manage your DeFi savings, investments, and automated strategies
            </p>
            
            <div className="connect-wallet-section">
              <ConnectAndSIWE />
            </div>
            
            {account.address && (
              <div className="dashboard-content">
                <div className="dashboard-card">
                  <h2 className="card-title">Your Savings Summary</h2>
                  <div className="card-content">
                    <p>Connect your wallet to view your savings and investments</p>
                  </div>
                </div>
                
                <div className="dashboard-card">
                  <h2 className="card-title">Investment Strategies</h2>
                  <div className="card-content">
                    <p>Create and manage your automated investment strategies</p>
                  </div>
                </div>
                
                <div className="dashboard-card">
                  <h2 className="card-title">Performance Analytics</h2>
                  <div className="card-content">
                    <p>View your portfolio performance and analytics</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
} 