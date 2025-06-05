"use client";

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/core/DashboardLayout';
import SavingsComponent from '@/components/savings/actions/SavingsComponent';
import SavingsOverview from '@/components/savings/overview/SavingsOverview';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiClock, FiCheckCircle } from 'react-icons/fi';
import ClientOnly from '@/components/utils/ClientOnly';


// Feature card component
const FeatureCard = ({ icon, title, description, color }: { 
  icon: React.ReactNode;
  title: string;
  description: string;
  color: 'blue' | 'green' | 'purple';
}) => {
  const colorClasses = {
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    green: 'bg-green-500/10 border-green-500/30 text-green-400',
    purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
  };

  return (
    <motion.div 
      className={`${colorClasses[color]} border rounded-xl p-5`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -5 }}
    >
      <div className="flex items-start">
        <div className="mr-4 p-3 bg-gray-800/60 rounded-full">
          {icon}
        </div>
        <div>
          <h3 className="font-medium text-white mb-1">{title}</h3>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default function SavingsDashboard() {
  return (
    <ClientOnly>
      <SavingsDashboardContent />
    </ClientOnly>
  );
}

function SavingsDashboardContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'savings'>('overview');

  useEffect(() => {
    const initializePage = async () => {
      try {
        // Any additional initialization can go here
      } catch (err) {
        console.error("Error initializing savings dashboard:", err);
        setError("Failed to load savings dashboard. Please try refreshing the page.");
      } finally {
        setIsLoading(false);
      }
    };

    initializePage();
  }, []);

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6 text-center">
            <svg className="w-12 h-12 text-red-500 mx-auto mb-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="text-white">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <main className="p-6 overflow-auto h-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Savings Dashboard</h1>
            <p className="text-gray-400">Track, manage, and grow your crypto savings</p>
          </div>
          
          <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg mt-4 md:mt-0">
            <button
              className={`px-4 py-2 text-sm rounded-md transition-colors ${
                activeTab === 'overview' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={`px-4 py-2 text-sm rounded-md transition-colors ${
                activeTab === 'savings' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setActiveTab('savings')}
            >
              Savings Plans
            </button>
          </div>
        </div>
        
        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <FeatureCard
            icon={<FiTrendingUp size={20} />}
            title="Savings Analytics"
            description="Track your savings progress with real-time metrics"
            color="blue"
          />
          <FeatureCard
            icon={<FiClock size={20} />}
            title="Automated Savings"
            description="Set up DCA plans and automatic savings strategies"
            color="green"
          />
          <FeatureCard
            icon={<FiCheckCircle size={20} />}
            title="Goal Tracking"
            description="Set and monitor your savings goals and milestones"
            color="purple"
          />
        </div>

        <div className="relative">
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <SavingsOverview />
              
              {/* Additional content that could go below the overview */}
              <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
                <p className="text-gray-400 text-center py-4">
                  Your recent savings activity will appear here
                </p>
              </div>
            </motion.div>
          )}
          
          {activeTab === 'savings' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <SavingsComponent />
            </motion.div>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
} 