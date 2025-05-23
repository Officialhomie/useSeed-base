"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAccount } from "wagmi";
import { cn, color, pressable, text } from "@coinbase/onchainkit/theme";

export default function OnboardingHero() {
  const [currentStep, setCurrentStep] = useState(0);
  const { isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Features animation
  const features = [
    {
      title: "Automate Your Savings",
      description: "Set up recurring deposits that happen automatically, without you having to lift a finger",
      icon: "💰",
      color: "from-blue-500 to-blue-600"
    },
    {
      title: "Dollar-Cost Averaging",
      description: "Invest regularly regardless of market conditions to reduce the impact of volatility",
      icon: "📈",
      color: "from-purple-500 to-purple-600"
    },
    {
      title: "Yield Optimization",
      description: "Automatically allocate your funds to the highest-yielding protocols",
      icon: "✨",
      color: "from-green-500 to-green-600"
    },
    {
      title: "Smart Risk Management",
      description: "Set your risk parameters and let our protocol handle the rest",
      icon: "🛡️",
      color: "from-orange-500 to-orange-600"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % features.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [features.length]);

  if (!mounted) return null;

  return (
    <div className="relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-black opacity-90 z-0"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600 rounded-full filter blur-3xl opacity-20"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600 rounded-full filter blur-3xl opacity-20"></div>
      
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12">
          {/* Left side - Text Content */}
          <motion.div 
            className="flex-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mb-4 inline-block"
            >
              <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-transparent bg-clip-text text-sm font-semibold px-3 py-1 rounded-full border border-blue-500/30">
                Powered by Base
              </span>
            </motion.div>
            
            <motion.h1 
              className="text-4xl md:text-6xl font-extrabold mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              Automate Your <span className="bg-gradient-to-r from-blue-400 to-purple-600 text-transparent bg-clip-text">Financial Future</span>
            </motion.h1>
            
            <motion.p 
              className="text-xl text-gray-300 mb-8 max-w-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              SpendSave Protocol helps you save, invest, and earn yield automatically with next-generation DeFi technology.
            </motion.p>
            
            <motion.div 
              className="space-y-4 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              {features.map((feature, index) => (
                <motion.div 
                  key={index}
                  className={`flex items-start ${index === currentStep ? 'opacity-100' : 'opacity-60'} transition-opacity duration-300`}
                >
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${feature.color} flex items-center justify-center mr-4 flex-shrink-0`}>
                    <span className="text-lg">{feature.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{feature.title}</h3>
                    <p className="text-gray-400 text-sm">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              {!isConnected ? (
                <Link href="/onboarding">
                  <button 
                    className={cn(
                      pressable.primary,
                      "px-8 py-4 rounded-xl font-medium text-lg",
                      "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500",
                      "shadow-lg shadow-blue-500/20 transition-all"
                    )}
                  >
                    <span className={cn(text.headline, color.inverse)}>
                      Get Started
                    </span>
                  </button>
                </Link>
              ) : (
                <Link href="/app-dashboard">
                  <button 
                    className={cn(
                      pressable.primary,
                      "px-8 py-4 rounded-xl font-medium text-lg",
                      "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500",
                      "shadow-lg shadow-blue-500/20 transition-all"
                    )}
                  >
                    <span className={cn(text.headline, color.inverse)}>
                      Go to Dashboard
                    </span>
                  </button>
                </Link>
              )}
              
              <Link href="/learn-more" className="px-8 py-4 rounded-xl font-medium text-lg border border-gray-700 hover:border-gray-500 transition-all text-center flex items-center justify-center">
                Learn More
                <svg className="w-5 h-5 ml-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </motion.div>
          </motion.div>
          
          {/* Right side - Visual Content */}
          <motion.div 
            className="flex-1 relative"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <div className="relative rounded-2xl overflow-hidden border border-gray-800 bg-black/40 backdrop-blur-sm shadow-xl">
              {/* Animated graphs and charts */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 text-transparent bg-clip-text">Your Savings Growth</h3>
                    <p className="text-gray-400 text-sm">Last 30 days</p>
                  </div>
                  <div className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-sm font-medium">+12.4%</div>
                </div>
                
                {/* Savings chart */}
                <div className="h-64 mb-6">
                  <div className="w-full h-full flex items-end">
                    {[...Array(24)].map((_, i) => {
                      const height = 30 + Math.sin(i * 0.5) * 20 + Math.random() * 20;
                      return (
                        <motion.div
                          key={i}
                          className="h-full flex-1 mx-0.5 flex flex-col justify-end"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "100%" }}
                          transition={{ delay: 0.8 + i * 0.02, duration: 0.5 }}
                        >
                          <motion.div 
                            className={`rounded-t-sm bg-gradient-to-t from-blue-600 to-purple-600`}
                            initial={{ height: "0%" }}
                            animate={{ height: `${height}%` }}
                            transition={{ delay: 1 + i * 0.03, duration: 0.5 }}
                          />
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-black/30 rounded-lg p-4 border border-gray-800">
                    <p className="text-gray-400 text-xs mb-1">Total Saved</p>
                    <p className="text-xl font-bold text-white">$4,285.67</p>
                  </div>
                  <div className="bg-black/30 rounded-lg p-4 border border-gray-800">
                    <p className="text-gray-400 text-xs mb-1">Daily Average</p>
                    <p className="text-xl font-bold text-white">$42.50</p>
                  </div>
                  <div className="bg-black/30 rounded-lg p-4 border border-gray-800">
                    <p className="text-gray-400 text-xs mb-1">Yield Earned</p>
                    <p className="text-xl font-bold text-white">$127.89</p>
                  </div>
                </div>
              </div>
              
              {/* Glow effect */}
              <div className="absolute -inset-px bg-gradient-to-r from-blue-600/20 to-purple-600/20 opacity-50 rounded-2xl pointer-events-none"></div>
            </div>
            
            {/* Floating elements */}
            <motion.div 
              className="absolute -top-8 -right-8 bg-blue-500/10 backdrop-blur-md border border-blue-500/20 rounded-lg p-3 shadow-lg"
              animate={{ y: [0, -10, 0] }} 
              transition={{ repeat: Infinity, duration: 4 }}
            >
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <span className="text-blue-500 text-lg">🔄</span>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Auto-Investment</p>
                  <p className="text-sm font-semibold">Every Monday</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              className="absolute -bottom-6 -left-6 bg-purple-500/10 backdrop-blur-md border border-purple-500/20 rounded-lg p-3 shadow-lg"
              animate={{ y: [0, 10, 0] }} 
              transition={{ repeat: Infinity, duration: 5, delay: 0.5 }}
            >
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <span className="text-purple-500 text-lg">📈</span>
                </div>
                <div>
                  <p className="text-xs text-gray-400">ETH Price Alert</p>
                  <p className="text-sm font-semibold">+5.2% Today</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
} 