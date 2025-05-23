"use client";
import { cn, color, pressable, text } from "@coinbase/onchainkit/theme";
import { useEffect, useState } from "react";
import {
  useAccount,
  useChainId,
  useConnect,
  useConnectors,
  useSignTypedData,
} from "wagmi";
import { Address, Hex, parseUnits } from "viem";
import { useQuery } from "@tanstack/react-query";
import { spendPermissionManagerAddress } from "@/lib/abi/SpendPermissionManager";
import Link from "next/link";

// Subscription tiers data
const tiers = [
  {
    id: 'basic',
    name: 'Basic',
    price: '5',
    period: 86400 * 30, // monthly
    description: 'Essential features for beginners',
    features: ['Daily trading signals', 'Basic analytics', 'Email support'],
    color: 'from-blue-500 to-purple-500'
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '10',
    period: 86400 * 30, // monthly
    description: 'Advanced features for serious traders',
    features: ['All Basic features', 'Priority trading signals', 'Advanced analytics', 'Priority support'],
    color: 'from-green-500 to-blue-500',
    popular: true
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '25',
    period: 86400 * 30, // monthly
    description: 'Ultimate package for professionals',
    features: ['All Pro features', 'Custom trading strategies', 'Real-time market alerts', 'Dedicated account manager'],
    color: 'from-orange-500 to-red-500'
  }
];

export default function Subscribe() {
  const [isDisabled, setIsDisabled] = useState(false);
  const [signature, setSignature] = useState<Hex>();
  const [transactions, setTransactions] = useState<Hex[]>([]);
  const [spendPermission, setSpendPermission] = useState<object>();
  const [activeTier, setActiveTier] = useState(tiers[1]); // Default to Pro tier
  const [isSuccess, setIsSuccess] = useState(false);

  const { signTypedDataAsync } = useSignTypedData();
  const account = useAccount();
  const chainId = useChainId();
  const { connectAsync } = useConnect();
  const connectors = useConnectors();

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["collectSubscription"],
    queryFn: handleCollectSubscription,
    refetchOnWindowFocus: false,
    enabled: !!signature,
  });

  async function handleSubmit() {
    setIsDisabled(true);
    let accountAddress = account?.address;
    if (!accountAddress) {
      try {
        const requestAccounts = await connectAsync({
          connector: connectors[0],
        });
        accountAddress = requestAccounts.accounts[0];
      } catch {
        setIsDisabled(false);
        return;
      }
    }

    const spendPermission = {
      account: accountAddress, // User wallet address
      spender: process.env.NEXT_PUBLIC_SPENDER_ADDRESS! as Address, // Spender smart contract wallet address
      token: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as Address, // ETH (https://eips.ethereum.org/EIPS/eip-7528)
      allowance: parseUnits(activeTier.price, 18),
      period: activeTier.period, // period based on the selected tier
      start: 0, // unix timestamp
      end: 281474976710655, // max uint48
      salt: BigInt(Math.floor(Math.random() * 1000000)), // Random salt to ensure uniqueness
      extraData: "0x" as Hex,
    };

    try {
      const signature = await signTypedDataAsync({
        domain: {
          name: "Spend Permission Manager",
          version: "1",
          chainId: chainId,
          verifyingContract: spendPermissionManagerAddress,
        },
        types: {
          SpendPermission: [
            { name: "account", type: "address" },
            { name: "spender", type: "address" },
            { name: "token", type: "address" },
            { name: "allowance", type: "uint160" },
            { name: "period", type: "uint48" },
            { name: "start", type: "uint48" },
            { name: "end", type: "uint48" },
            { name: "salt", type: "uint256" },
            { name: "extraData", type: "bytes" },
          ],
        },
        primaryType: "SpendPermission",
        message: spendPermission,
      });
      setSpendPermission(spendPermission);
      setSignature(signature);
      setIsSuccess(true);
    } catch (e) {
      console.error(e);
    }
    setIsDisabled(false);
  }

  async function handleCollectSubscription() {
    setIsDisabled(true);
    let data;
    try {
      const replacer = (key: string, value: any) => {
        if (typeof value === "bigint") {
          return value.toString();
        }
        return value;
      };
      const response = await fetch("/api/collect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          {
            spendPermission,
            signature,
            dummyData: Math.ceil(Math.random() * 100),
          },
          replacer
        ),
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      data = await response.json();
    } catch (e) {
      console.error(e);
    }
    setIsDisabled(false);
    return data;
  }

  useEffect(() => {
    if (!data) return;
    setTransactions([data?.transactionHash, ...transactions]);
  }, [data, transactions]);

  return (
    <div className="w-full max-w-6xl mx-auto">
      {!signature ? (
        <div className="space-y-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-4">Choose Your Subscription Plan</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Automate your savings and unlock advanced trading features with our SpendSave subscription plans. 
              Your subscription will be handled securely via Spend Permissions technology.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tiers.map((tier) => (
              <div 
                key={tier.id} 
                className={`rounded-2xl border ${activeTier.id === tier.id ? 'border-blue-500' : 'border-gray-800'} 
                  bg-black/60 p-6 hover:border-blue-500 transition-all duration-300 relative
                  hover:translate-y-[-4px] hover:shadow-lg hover:shadow-blue-500/20`}
                onClick={() => setActiveTier(tier)}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Popular
                  </div>
                )}
                <div className={`h-2 w-20 rounded-full bg-gradient-to-r ${tier.color} mb-4`}></div>
                <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold">{tier.price}</span>
                  <span className="text-gray-400"> ETH/month</span>
                </div>
                <p className="text-gray-400 mb-4">{tier.description}</p>
                <ul className="space-y-2 mb-6">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center">
                      <svg className="w-5 h-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className={`h-1 w-full rounded-full ${activeTier.id === tier.id ? `bg-gradient-to-r ${tier.color}` : 'bg-gray-800'} mt-auto`}></div>
              </div>
            ))}
          </div>
          
          <div className="mt-10 flex justify-center">
            <button
              className={cn(
                pressable.primary,
                "w-72 rounded-xl",
                "px-6 py-4 font-medium text-lg text-white leading-6",
                isDisabled && pressable.disabled,
                text.headline,
                "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all duration-300"
              )}
              onClick={handleSubmit}
              type="button"
              disabled={isDisabled}
            >
              <span
                className={cn(
                  text.headline,
                  color.inverse,
                  "flex items-center justify-center"
                )}
              >
                {isDisabled ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    Subscribe to {activeTier.name} Plan
                  </>
                )}
              </span>
            </button>
          </div>
          
          <div className="mt-8 text-center text-gray-400 text-sm">
            By subscribing, you&apos;re authorizing scheduled payments according to the plan terms
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-8 bg-black/80 p-8 rounded-2xl border border-green-600">
          {isSuccess && (
            <div className="bg-green-900/30 border border-green-600 rounded-lg p-4 flex items-center mb-6">
              <svg className="w-6 h-6 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <h3 className="font-bold text-green-500">Subscription Authorized!</h3>
                <p className="text-green-300 text-sm">Your {activeTier.name} Plan subscription has been successfully authorized</p>
              </div>
            </div>
          )}
          
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">
              Thank You For Subscribing!
            </h2>
            <p className="text-gray-400">
              You've authorized a recurring payment of {activeTier.price} ETH per month using Spend Permissions.
              This gives our protocol the ability to collect your subscription payment automatically.
            </p>
          </div>
          
          <div className="flex justify-center">
            <button
              className={cn(
                pressable.primary,
                "w-full rounded-xl",
                "px-6 py-4 font-medium text-lg text-white leading-6",
                isDisabled && pressable.disabled,
                text.headline,
                "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all duration-300"
              )}
              onClick={() => refetch()}
              type="button"
              disabled={isDisabled || isLoading}
            >
              <span
                className={cn(
                  text.headline,
                  color.inverse,
                  "flex items-center justify-center"
                )}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                    Collect Subscription Payment
                  </>
                )}
              </span>
            </button>
          </div>
          
          {transactions.length > 0 && (
            <div className="mt-8 space-y-4">
              <h3 className="text-lg font-bold border-b border-gray-800 pb-2">Payment History</h3>
              <div className="max-h-60 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {transactions.map((transactionHash, i) => (
                  <a
                    key={i}
                    className="block p-3 rounded-lg bg-gray-900/50 border border-gray-800 hover:border-blue-500 transition-colors"
                    target="_blank"
                    href={`https://sepolia.basescan.org/tx/${transactionHash}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="bg-blue-500/20 rounded-full p-2 mr-3">
                          <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Payment #{transactions.length - i}</div>
                          <div className="text-xs text-gray-500 truncate max-w-xs">{transactionHash}</div>
                        </div>
                      </div>
                      <div className="text-sm text-blue-500 hover:underline">View</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
          
          <div className="mt-8 pt-4 border-t border-gray-800 text-center">
            <Link 
              href="/app-dashboard" 
              className="inline-flex items-center text-blue-500 hover:text-blue-400 transition-colors"
            >
              <span>Go to dashboard to manage your subscription</span>
              <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1a1a1a;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3b3b3b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4b4b4b;
        }
      `}</style>
    </div>
  );
} 