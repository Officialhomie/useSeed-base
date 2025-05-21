'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import './navigation-bar.css';
import SpendSaveWallet from './SpendSaveWallet';
import { FiHome, FiBarChart2, FiPieChart } from 'react-icons/fi';

export default function NavigationBar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isPressed, setIsPressed] = useState(false);
  
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

  // Mouse down and up handlers for the squeeze effect
  const handleMouseDown = () => {
    setIsPressed(true);
  };

  const handleMouseUp = () => {
    setIsPressed(false);
  };

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Navigation links data - simplified
  const navLinks = [
    { id: 'dashboard', label: 'Dashboard', href: '/', icon: <FiHome /> },
    { id: 'exchange', label: 'Exchange', href: '/exchange', icon: <FiBarChart2 /> },
    { id: 'staking', label: 'Staking', href: '/staking', icon: <FiPieChart /> },
  ];

  return (
    <div className="navbar-container-wrapper">
      <nav 
        className={`spendSave-navbar ${scrolled ? 'scrolled' : ''} ${isPressed ? 'pressed' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setIsPressed(false)}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="navbar-container">
          {/* Logo */}
          <div className="navbar-logo">
            <div className="logo-pill">
              <span className="logo-text">S²</span>
            </div>
            <h1 className="logo-title">SpendSave</h1>
          </div>
          
          {/* Mobile menu toggle */}
          <button 
            className="mobile-menu-toggle" 
            onClick={toggleMobileMenu} 
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            <div className={`menu-icon ${mobileMenuOpen ? 'open' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </button>
          
          {/* Navigation links - simplified */}
          <div className={`navbar-links ${mobileMenuOpen ? 'open' : ''}`}>
            <ul>
              {navLinks.map((link) => (
                <li key={link.id} className={activeSection === link.id ? 'active' : ''}>
                  <Link 
                    href={link.href} 
                    onClick={() => {
                      setActiveSection(link.id);
                      setMobileMenuOpen(false);
                    }}
                    aria-current={activeSection === link.id ? 'page' : undefined}
                  >
                    <span className="nav-link-icon">{link.icon}</span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Wallet integration */}
          <div className="navbar-actions">
            <SpendSaveWallet />
          </div>
        </div>
      </nav>
    </div>
  );
} 