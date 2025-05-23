"use client";

import NavigationBar from '@/components/core/NavigationBar';
import Subscribe from '@/components/ui/Subscribe';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import '../page-styles.css';
import '../smart-wallet.css';

export default function SmartWalletPage() {
  const [_mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <NavigationBar />
      <main className="main-content">
        <section className="py-10">
          <div className="container mx-auto px-4">
            <div className="flex flex-col items-center mb-12 text-center">
              <div className="relative mb-6">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 opacity-30 blur-md"></div>
                <div className="relative bg-black/80 rounded-full p-4 border border-blue-500/30">
                  <svg className="w-12 h-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
              </div>
              <h1 className="text-4xl font-bold mb-4">Smart Wallet <span className="gradient-text">Subscriptions</span></h1>
              <p className="max-w-2xl text-gray-400 mb-6">
                Experience the future of DeFi subscriptions with Spend Permissions technology. 
                Authorize recurring payments once and never worry about manual approvals again.
              </p>
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                <div className="flex items-center bg-blue-900/20 px-4 py-2 rounded-full border border-blue-800">
                  <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-sm">Secure & Trustless</span>
                </div>
                <div className="flex items-center bg-purple-900/20 px-4 py-2 rounded-full border border-purple-800">
                  <svg className="w-5 h-5 text-purple-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm">Time-Saving</span>
                </div>
                <div className="flex items-center bg-green-900/20 px-4 py-2 rounded-full border border-green-800">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm">Fully Configurable</span>
                </div>
              </div>
            </div>

            {/* Subscribe Component */}
            <div className="mb-16">
              <Subscribe />
            </div>

            {/* How it works */}
            <div className="mb-16">
              <h2 className="text-2xl font-bold mb-8 text-center">How Spend Permissions Work</h2>
              <div className="relative">
                <div className="absolute left-1/2 -translate-x-1/2 h-full w-1 bg-gradient-to-b from-blue-600 via-purple-600 to-blue-600 opacity-20 rounded-full"></div>
                <div className="space-y-12">
                  <div className="relative flex items-start">
                    <div className="flex items-center justify-center min-w-[80px]">
                      <div className="absolute left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-blue-900/40 border-2 border-blue-500 z-10 flex items-center justify-center text-blue-500 font-bold">1</div>
                    </div>
                    <div className="flex-1 bg-black/50 rounded-xl p-6 ml-4 border border-gray-800">
                      <h3 className="text-xl font-semibold mb-3">Authorize Spend Permission</h3>
                      <p className="text-gray-400 mb-4">
                        Sign a single transaction to authorize our protocol to spend a specific amount of your assets on a regular basis. 
                        You define the token, amount, and time period.
                      </p>
                      <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-800">
                        <div className="text-sm font-mono text-gray-300">
                          <div>account: <span className="text-blue-400">your_wallet_address</span></div>
                          <div>spender: <span className="text-green-400">protocol_address</span></div>
                          <div>token: <span className="text-purple-400">ETH</span></div>
                          <div>allowance: <span className="text-orange-400">10 ETH per month</span></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="relative flex items-start">
                    <div className="flex items-center justify-center min-w-[80px]">
                      <div className="absolute left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-purple-900/40 border-2 border-purple-500 z-10 flex items-center justify-center text-purple-500 font-bold">2</div>
                    </div>
                    <div className="flex-1 bg-black/50 rounded-xl p-6 ml-4 border border-gray-800">
                      <h3 className="text-xl font-semibold mb-3">Protocol Collects Payments</h3>
                      <p className="text-gray-400 mb-4">
                        Our protocol automatically collects your subscription fee based on the authorized schedule. 
                        No additional signatures or approvals are needed from you.
                      </p>
                      <div className="flex space-x-4">
                        <div className="bg-purple-900/20 rounded-lg p-3 border border-purple-800 flex-1 text-center">
                          <div className="text-purple-400 font-semibold mb-1">Month 1</div>
                          <div className="text-sm text-gray-300">10 ETH</div>
                        </div>
                        <div className="bg-purple-900/20 rounded-lg p-3 border border-purple-800 flex-1 text-center">
                          <div className="text-purple-400 font-semibold mb-1">Month 2</div>
                          <div className="text-sm text-gray-300">10 ETH</div>
                        </div>
                        <div className="bg-purple-900/20 rounded-lg p-3 border border-purple-800 flex-1 text-center">
                          <div className="text-purple-400 font-semibold mb-1">Month 3</div>
                          <div className="text-sm text-gray-300">10 ETH</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="relative flex items-start">
                    <div className="flex items-center justify-center min-w-[80px]">
                      <div className="absolute left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-green-900/40 border-2 border-green-500 z-10 flex items-center justify-center text-green-500 font-bold">3</div>
                    </div>
                    <div className="flex-1 bg-black/50 rounded-xl p-6 ml-4 border border-gray-800">
                      <h3 className="text-xl font-semibold mb-3">Manage Your Permissions</h3>
                      <p className="text-gray-400 mb-4">
                        You maintain full control over your spend permissions. View, update or revoke any permission at any time through your dashboard.
                      </p>
                      <div className="flex space-x-3">
                        <div className="bg-green-900/20 rounded-lg p-3 border border-green-800 flex-1 flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>View</span>
                        </div>
                        <div className="bg-green-900/20 rounded-lg p-3 border border-green-800 flex-1 flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span>Update</span>
                        </div>
                        <div className="bg-green-900/20 rounded-lg p-3 border border-green-800 flex-1 flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Revoke</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Advanced Features */}
            <div className="mb-16">
              <h2 className="text-2xl font-bold mb-8 text-center">Advanced Features</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-black/50 rounded-xl p-6 border border-gray-800">
                  <div className="flex items-center mb-4">
                    <div className="bg-blue-900/30 rounded-lg p-3 mr-4">
                      <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold">Time-Based Limits</h3>
                  </div>
                  <p className="text-gray-400">
                    Set start and end times for your spend permissions. Create permissions that only become active 
                    on specific dates or expire automatically after a certain period.
                  </p>
                </div>
                
                <div className="bg-black/50 rounded-xl p-6 border border-gray-800">
                  <div className="flex items-center mb-4">
                    <div className="bg-purple-900/30 rounded-lg p-3 mr-4">
                      <svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold">Multi-Token Support</h3>
                  </div>
                  <p className="text-gray-400">
                    Create spend permissions for any ERC-20 token or native ETH. Manage subscriptions for 
                    different services using different tokens.
                  </p>
                </div>
                
                <div className="bg-black/50 rounded-xl p-6 border border-gray-800">
                  <div className="flex items-center mb-4">
                    <div className="bg-green-900/30 rounded-lg p-3 mr-4">
                      <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold">Customizable Periods</h3>
                  </div>
                  <p className="text-gray-400">
                    Set custom recurring periods for your permissions. Choose daily, weekly, monthly, yearly or 
                    any custom timeframe that suits your needs.
                  </p>
                </div>
                
                <div className="bg-black/50 rounded-xl p-6 border border-gray-800">
                  <div className="flex items-center mb-4">
                    <div className="bg-orange-900/30 rounded-lg p-3 mr-4">
                      <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold">One-Click Revocation</h3>
                  </div>
                  <p className="text-gray-400">
                    Immediately revoke any spend permission with a single click, giving you complete peace of mind 
                    and control over your subscriptions.
                  </p>
                </div>
              </div>
            </div>

            {/* FAQ Section */}
            <div className="mb-16">
              <h2 className="text-2xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
              <div className="space-y-4">
                <div className="bg-black/50 rounded-xl p-6 border border-gray-800">
                  <h3 className="text-xl font-semibold mb-3">How secure are Spend Permissions?</h3>
                  <p className="text-gray-400">
                    Spend Permissions are built on secure smart contracts with strict limits on how much can be spent in a given time period. 
                    You can revoke permissions at any time, and the spender can only withdraw the amount you&apos;ve authorized.
                  </p>
                </div>
                
                <div className="bg-black/50 rounded-xl p-6 border border-gray-800">
                  <h3 className="text-xl font-semibold mb-3">Can I modify a permission after it&apos;s created?</h3>
                  <p className="text-gray-400">
                    Once created, a Spend Permission&apos;s parameters cannot be modified. To change any parameter, you&apos;ll need to revoke 
                    the existing permission and create a new one with the updated parameters.
                  </p>
                </div>
                
                <div className="bg-black/50 rounded-xl p-6 border border-gray-800">
                  <h3 className="text-xl font-semibold mb-3">What happens if I don&apos;t have enough funds?</h3>
                  <p className="text-gray-400">
                    If your wallet doesn&apos;t have enough funds when a collection is attempted, the transaction will fail. The spender may 
                    try again later, but they cannot take more than what&apos;s available in your wallet.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <Link 
                href="/app-dashboard" 
                className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:from-blue-500 hover:to-purple-500 transition-all"
              >
                Go to Dashboard
                <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
} 