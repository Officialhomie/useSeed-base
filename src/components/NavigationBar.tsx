'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import './navigation-bar.css';
import SpendSaveWallet from './SpendSaveWallet';

export default function NavigationBar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  
  // Handle scroll effect for the navigation bar
  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      if (offset > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <nav className={`spendSave-navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        <div className="navbar-logo">
          <div className="logo-hexagon">
            <div className="logo-inner">
              <span className="logo-text">S²</span>
            </div>
          </div>
          <h1 className="logo-title">SpendSave</h1>
          <div className="logo-pill">Protocol</div>
        </div>
        
        <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
          <div className={`menu-icon ${mobileMenuOpen ? 'open' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>
        
        <div className={`navbar-links ${mobileMenuOpen ? 'open' : ''}`}>
          <ul>
            <li className={activeSection === 'home' ? 'active' : ''}>
              <Link href="/" onClick={() => setActiveSection('home')}>
                Home
                <div className="nav-indicator"></div>
              </Link>
            </li>
            <li className={activeSection === 'features' ? 'active' : ''}>
              <Link href="/features" onClick={() => setActiveSection('features')}>
                Features
                <div className="nav-indicator"></div>
              </Link>
            </li>
            <li className={activeSection === 'protocol' ? 'active' : ''}>
              <Link href="/protocol" onClick={() => setActiveSection('protocol')}>
                Protocol
                <div className="nav-indicator"></div>
              </Link>
            </li>
            <li className={activeSection === 'balances' ? 'active' : ''}>
              <Link href="/balances" onClick={() => setActiveSection('balances')}>
                Balances
                <div className="nav-indicator"></div>
              </Link>
            </li>
            <li className={activeSection === 'docs' ? 'active' : ''}>
              <Link href="/docs" onClick={() => setActiveSection('docs')}>
                Documentation
                <div className="nav-indicator"></div>
              </Link>
            </li>
            <li className={activeSection === 'profiles' ? 'active' : ''}>
              <Link href="/profiles" onClick={() => setActiveSection('profiles')}>
                Profiles
                <div className="nav-indicator"></div>
              </Link>
            </li>
          </ul>
        </div>
        
        <div className="navbar-actions">
          <SpendSaveWallet />
        </div>
      </div>
      
      {/* DeFi Stats Ticker */}
      <div className="defi-stats-ticker">
        <div className="ticker-wrapper">
          <div className="ticker-content">
            <div className="ticker-item">
              <span className="ticker-label">Total Saved:</span>
              <span className="ticker-value">$4.2M</span>
            </div>
            <div className="ticker-divider"></div>
            <div className="ticker-item">
              <span className="ticker-label">Active Savers:</span>
              <span className="ticker-value">12.4K</span>
            </div>
            <div className="ticker-divider"></div>
            <div className="ticker-item">
              <span className="ticker-label">Avg. Savings Rate:</span>
              <span className="ticker-value">3.2%</span>
            </div>
            <div className="ticker-divider"></div>
            <div className="ticker-item">
              <span className="ticker-label">DCA Volume:</span>
              <span className="ticker-value">$850K</span>
            </div>
            <div className="ticker-divider"></div>
            <div className="ticker-item">
              <span className="ticker-label">Total Saved:</span>
              <span className="ticker-value">$4.2M</span>
            </div>
            <div className="ticker-divider"></div>
            <div className="ticker-item">
              <span className="ticker-label">Active Savers:</span>
              <span className="ticker-value">12.4K</span>
            </div>
            <div className="ticker-divider"></div>
            <div className="ticker-item">
              <span className="ticker-label">Avg. Savings Rate:</span>
              <span className="ticker-value">3.2%</span>
            </div>
            <div className="ticker-divider"></div>
            <div className="ticker-item">
              <span className="ticker-label">DCA Volume:</span>
              <span className="ticker-value">$850K</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
} 