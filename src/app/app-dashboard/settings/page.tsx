"use client";

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/core/DashboardLayout';
import { useAccount, useDisconnect } from 'wagmi';
import { motion } from 'framer-motion';
import { FiUser, FiEye, FiGlobe, FiBell, FiShield, FiToggleRight, FiMoon, FiSun, FiInfo, FiCheck } from 'react-icons/fi';

export default function SettingsDashboard() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('account');
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState({
    transactions: true,
    promotions: false,
    security: true,
    newsletter: false,
  });
  const [network, setNetwork] = useState('ethereum');
  const [currency, setCurrency] = useState('usd');
  const [language, setLanguage] = useState('english');
  const [slippageTolerance, setSlippageTolerance] = useState(0.5);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="loading-container">Loading...</div>;

  const handleSave = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };
  
  const handleToggleNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  
  const shortenAddress = (address: string | undefined) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  
  return (
    <DashboardLayout>
      <main className="p-6 overflow-auto h-full">
        <motion.div 
          className="w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-2xl font-bold mb-6">Settings</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-4">
                <ul className="space-y-1">
                  <li>
                    <button
                      onClick={() => setActiveTab('account')}
                      className={`w-full text-left px-4 py-3 rounded-lg flex items-center ${
                        activeTab === 'account' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      <FiUser className="mr-3" />
                      <span>Account</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setActiveTab('appearance')}
                      className={`w-full text-left px-4 py-3 rounded-lg flex items-center ${
                        activeTab === 'appearance' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      <FiEye className="mr-3" />
                      <span>Appearance</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setActiveTab('network')}
                      className={`w-full text-left px-4 py-3 rounded-lg flex items-center ${
                        activeTab === 'network' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      <FiGlobe className="mr-3" />
                      <span>Network</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setActiveTab('notifications')}
                      className={`w-full text-left px-4 py-3 rounded-lg flex items-center ${
                        activeTab === 'notifications' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      <FiBell className="mr-3" />
                      <span>Notifications</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setActiveTab('security')}
                      className={`w-full text-left px-4 py-3 rounded-lg flex items-center ${
                        activeTab === 'security' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      <FiShield className="mr-3" />
                      <span>Security</span>
                    </button>
                  </li>
                </ul>
              </div>
            </div>
            
            {/* Main Content */}
            <div className="lg:col-span-3">
              <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6">
                {/* Account Settings */}
                {activeTab === 'account' && (
                  <div>
                    <h2 className="text-xl font-bold mb-4">Account Settings</h2>
                    
                    <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-400">Connected Address</p>
                          <p className="font-mono font-medium">{isConnected ? shortenAddress(address) : 'Not connected'}</p>
                        </div>
                        {isConnected && (
                          <button 
                            onClick={() => disconnect()}
                            className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg text-sm hover:bg-red-600/30 transition"
                          >
                            Disconnect
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Display Name
                        </label>
                        <input
                          type="text"
                          placeholder="Enter a display name"
                          className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          placeholder="Enter your email address"
                          className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <button
                          onClick={handleSave}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
                        >
                          {saveSuccess ? (
                            <>
                              <FiCheck className="mr-2" />
                              Saved!
                            </>
                          ) : (
                            'Save Changes'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Appearance Settings */}
                {activeTab === 'appearance' && (
                  <div>
                    <h2 className="text-xl font-bold mb-4">Appearance</h2>
                    
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Theme
                        </label>
                        <div className="flex space-x-4">
                          <button
                            onClick={() => setDarkMode(true)}
                            className={`flex-1 flex items-center justify-center p-4 rounded-lg border ${
                              darkMode ? 'border-blue-500 bg-blue-500/20' : 'border-gray-700 bg-gray-800/50'
                            }`}
                          >
                            <FiMoon className="mr-2" />
                            <span>Dark</span>
                          </button>
                          <button
                            onClick={() => setDarkMode(false)}
                            className={`flex-1 flex items-center justify-center p-4 rounded-lg border ${
                              !darkMode ? 'border-blue-500 bg-blue-500/20' : 'border-gray-700 bg-gray-800/50'
                            }`}
                          >
                            <FiSun className="mr-2" />
                            <span>Light</span>
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Display Currency
                        </label>
                        <select
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="usd">USD ($)</option>
                          <option value="eur">EUR (€)</option>
                          <option value="gbp">GBP (£)</option>
                          <option value="jpy">JPY (¥)</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Language
                        </label>
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="english">English</option>
                          <option value="spanish">Spanish</option>
                          <option value="french">French</option>
                          <option value="german">German</option>
                          <option value="japanese">Japanese</option>
                        </select>
                      </div>
                      
                      <div>
                        <button
                          onClick={handleSave}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
                        >
                          {saveSuccess ? (
                            <>
                              <FiCheck className="mr-2" />
                              Saved!
                            </>
                          ) : (
                            'Save Changes'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Network Settings */}
                {activeTab === 'network' && (
                  <div>
                    <h2 className="text-xl font-bold mb-4">Network Settings</h2>
                    
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Default Network
                        </label>
                        <select
                          value={network}
                          onChange={(e) => setNetwork(e.target.value)}
                          className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="ethereum">Ethereum Mainnet</option>
                          <option value="arbitrum">Arbitrum</option>
                          <option value="optimism">Optimism</option>
                          <option value="polygon">Polygon</option>
                          <option value="avalanche">Avalanche</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Gas Price Preference
                        </label>
                        <div className="flex space-x-4">
                          <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg">Fast</button>
                          <button className="flex-1 px-4 py-2 bg-gray-800/50 text-gray-300 rounded-lg border border-gray-700">Average</button>
                          <button className="flex-1 px-4 py-2 bg-gray-800/50 text-gray-300 rounded-lg border border-gray-700">Slow</button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Slippage Tolerance
                        </label>
                        <div className="mb-2">
                          <input
                            type="range"
                            min="0.1"
                            max="5"
                            step="0.1"
                            value={slippageTolerance}
                            onChange={(e) => setSlippageTolerance(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                        <div className="flex justify-between text-sm text-gray-400">
                          <span>Current: {slippageTolerance}%</span>
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => setSlippageTolerance(0.5)}
                              className="px-2 py-1 bg-gray-800 rounded"
                            >
                              0.5%
                            </button>
                            <button 
                              onClick={() => setSlippageTolerance(1)}
                              className="px-2 py-1 bg-gray-800 rounded"
                            >
                              1%
                            </button>
                            <button 
                              onClick={() => setSlippageTolerance(3)}
                              className="px-2 py-1 bg-gray-800 rounded"
                            >
                              3%
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <button
                          onClick={handleSave}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
                        >
                          {saveSuccess ? (
                            <>
                              <FiCheck className="mr-2" />
                              Saved!
                            </>
                          ) : (
                            'Save Changes'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Notifications Settings */}
                {activeTab === 'notifications' && (
                  <div>
                    <h2 className="text-xl font-bold mb-4">Notification Preferences</h2>
                    
                    <div className="space-y-4">
                      <div className="p-4 border border-gray-700 rounded-lg bg-gray-800/30 flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Transaction Updates</h3>
                          <p className="text-sm text-gray-400">Get notified about your pending and completed transactions</p>
                        </div>
                        <button 
                          onClick={() => handleToggleNotification('transactions')}
                          className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out ${
                            notifications.transactions ? 'bg-blue-600' : 'bg-gray-700'
                          }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${
                              notifications.transactions ? 'translate-x-6' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                      
                      <div className="p-4 border border-gray-700 rounded-lg bg-gray-800/30 flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Security Alerts</h3>
                          <p className="text-sm text-gray-400">Important security-related notifications</p>
                        </div>
                        <button 
                          onClick={() => handleToggleNotification('security')}
                          className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out ${
                            notifications.security ? 'bg-blue-600' : 'bg-gray-700'
                          }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${
                              notifications.security ? 'translate-x-6' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                      
                      <div className="p-4 border border-gray-700 rounded-lg bg-gray-800/30 flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Promotions & Announcements</h3>
                          <p className="text-sm text-gray-400">New features, promotions, and platform updates</p>
                        </div>
                        <button 
                          onClick={() => handleToggleNotification('promotions')}
                          className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out ${
                            notifications.promotions ? 'bg-blue-600' : 'bg-gray-700'
                          }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${
                              notifications.promotions ? 'translate-x-6' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                      
                      <div className="p-4 border border-gray-700 rounded-lg bg-gray-800/30 flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Newsletter</h3>
                          <p className="text-sm text-gray-400">Weekly digest of crypto news and market insights</p>
                        </div>
                        <button 
                          onClick={() => handleToggleNotification('newsletter')}
                          className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out ${
                            notifications.newsletter ? 'bg-blue-600' : 'bg-gray-700'
                          }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${
                              notifications.newsletter ? 'translate-x-6' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                      
                      <div className="mt-6">
                        <button
                          onClick={handleSave}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
                        >
                          {saveSuccess ? (
                            <>
                              <FiCheck className="mr-2" />
                              Saved!
                            </>
                          ) : (
                            'Save Changes'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Security Settings */}
                {activeTab === 'security' && (
                  <div>
                    <h2 className="text-xl font-bold mb-4">Security Settings</h2>
                    
                    <div className="space-y-6">
                      <div className="p-4 border border-gray-700 rounded-lg bg-gray-800/30">
                        <h3 className="font-medium mb-4 flex items-center">
                          <FiShield className="mr-2 text-blue-400" /> 
                          Two-Factor Authentication
                        </h3>
                        <p className="text-sm text-gray-400 mb-4">Enable 2FA for an extra layer of security. We recommend using an authenticator app.</p>
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                          Enable 2FA
                        </button>
                      </div>
                      
                      <div className="p-4 border border-gray-700 rounded-lg bg-gray-800/30">
                        <h3 className="font-medium mb-2 flex items-center">
                          <FiInfo className="mr-2 text-yellow-400" /> 
                          Session Activity
                        </h3>
                        <p className="text-sm text-gray-400 mb-3">Monitor and manage your active sessions</p>
                        
                        <div className="border border-gray-700 rounded-lg divide-y divide-gray-700">
                          <div className="p-3 flex justify-between items-center">
                            <div>
                              <p className="text-sm font-medium">Current Session</p>
                              <p className="text-xs text-gray-400">MacOS - Chrome - 192.168.1.1</p>
                            </div>
                            <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded">Active</span>
                          </div>
                          <div className="p-3 flex justify-between items-center">
                            <div>
                              <p className="text-sm font-medium">iPhone - Safari</p>
                              <p className="text-xs text-gray-400">Last active: 2 days ago</p>
                            </div>
                            <button className="text-xs text-red-400 hover:text-red-300">
                              Revoke
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4 border border-gray-700 rounded-lg bg-gray-800/30">
                        <h3 className="font-medium mb-2 flex items-center text-red-400">
                          <FiShield className="mr-2" /> 
                          Danger Zone
                        </h3>
                        <p className="text-sm text-gray-400 mb-4">Permanent actions that cannot be undone</p>
                        <button className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition">
                          Delete Account
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </DashboardLayout>
  );
} 