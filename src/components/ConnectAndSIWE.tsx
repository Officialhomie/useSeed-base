"use client";

import { useCallback, useEffect, useState } from "react";
import type { Hex } from "viem";
import { useAccount, useConnect, usePublicClient, useSignMessage, useDisconnect } from "wagmi";
import { SiweMessage } from "siwe";
import { cbWalletConnector, isSmartWalletUser } from "../../wagmi";

const ConnectButton = ({ onClick, loading }: { onClick: () => void; loading: boolean }): JSX.Element => (
  <button
    onClick={onClick}
    disabled={loading}
    className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-70 disabled:scale-100 disabled:cursor-not-allowed"
  >
    <div className="absolute inset-0 flex items-center justify-center">
      {loading && (
        <div className="w-5 h-5 border-2 border-t-white border-r-transparent border-b-white border-l-transparent rounded-full animate-spin mr-2"></div>
      )}
    </div>
    <span className={loading ? "opacity-0" : "flex items-center"}>
      <svg 
        className="w-5 h-5 mr-2" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
        />
      </svg>
      Connect + SIWE
    </span>
  </button>
);

const StatusCard = ({ 
  address, 
  isValid, 
  isSmartWallet,
  onDisconnect,
}: { 
  address: string; 
  isValid?: boolean; 
  isSmartWallet: boolean;
  onDisconnect: () => void;
}): JSX.Element => (
  <div className="mt-6 bg-gray-900 rounded-xl p-5 border border-gray-800 shadow-lg max-w-md w-full">
    <div className="flex justify-between items-start mb-4">
      <div>
        <h3 className="text-lg font-semibold text-white">Wallet Connected</h3>
        <p className="text-gray-400 text-sm">You&apos;re signed in with your wallet</p>
      </div>
      <div className="flex items-center">
        <span className={`inline-flex h-3 w-3 rounded-full mr-2 ${isValid ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
        <span className="text-xs font-medium text-gray-300">
          {isValid ? 'Verified' : 'Pending Verification'}
        </span>
      </div>
    </div>

    <div className="bg-gray-800 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-gray-400 text-xs">Address</span>
        <span className={`text-xs px-2 py-1 rounded-full ${isSmartWallet ? 'bg-blue-900 text-blue-300' : 'bg-gray-700 text-gray-300'}`}>
          {isSmartWallet ? 'Smart Wallet' : 'EOA'}
        </span>
      </div>
      <div className="font-mono text-sm text-white break-all">
        {address}
      </div>
    </div>
    
    {isValid !== undefined && (
      <div className={`p-3 mb-4 rounded-lg ${isValid ? 'bg-green-900/20 text-green-400' : 'bg-yellow-900/20 text-yellow-400'}`}>
        <div className="flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isValid ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            )}
          </svg>
          <span className="text-sm font-medium">
            {isValid 
              ? 'Signature verified successfully' 
              : 'Signature verification failed'}
          </span>
        </div>
      </div>
    )}

    <div className="flex justify-end">
      <button 
        onClick={onDisconnect}
        className="text-sm text-red-400 hover:text-red-300 transition-colors"
      >
        Disconnect Wallet
      </button>
    </div>
  </div>
);

export function ConnectAndSIWE(): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { connect } = useConnect({
    mutation: {
      onMutate: () => {
        setLoading(true);
        setError(null);
      },
      onError: (error) => {
        console.error("Connection error:", error);
        setError("Failed to connect wallet. Please try again.");
        setLoading(false);
      },
      onSuccess: (data) => {
        try {
          const address = data.accounts[0];
          const chainId = data.chainId;
          
          // Create a random nonce for security
          const nonce = Math.floor(Math.random() * 1000000).toString();
          
          const m = new SiweMessage({
            domain: document.location.host,
            address,
            chainId,
            uri: document.location.origin,
            version: "1",
            statement: "Sign in to SpendSave Protocol with your Smart Wallet",
            nonce,
          });
          
          setMessage(m);
          signMessage({ message: m.prepareMessage() });
        } catch (e) {
          console.error("SIWE setup error:", e);
          setError("Failed to initialize sign-in. Please try again.");
          setLoading(false);
        }
      },
    },
  });
  
  const { disconnect } = useDisconnect();
  const account = useAccount();
  const client = usePublicClient();
  const [signature, setSignature] = useState<Hex | undefined>(undefined);
  const [message, setMessage] = useState<SiweMessage | undefined>(undefined);
  const [valid, setValid] = useState<boolean | undefined>(undefined);
  const isSmartWallet = account.address ? isSmartWalletUser(account.address) : false;

  const { signMessage, error: signError } = useSignMessage({
    mutation: { 
      onMutate: () => {
        setLoading(true);
      },
      onError: (error) => {
        console.error("Sign message error:", error);
        setError("Failed to sign message. Please try again.");
        setLoading(false);
      },
      onSuccess: (sig) => {
        setSignature(sig);
        setLoading(false);
      }
    },
  });

  const checkValid = useCallback(async () => {
    if (!signature || !account.address || !client || !message) return;

    try {
      const v = await client.verifyMessage({
        address: account.address,
        message: message.prepareMessage(),
        signature,
      });
      setValid(v);
    } catch (e) {
      console.error("Verification error:", e);
      setValid(false);
    }
  }, [signature, account.address, client, message]);

  const handleDisconnect = () => {
    disconnect();
    setSignature(undefined);
    setValid(undefined);
    setMessage(undefined);
    setError(null);
  };

  useEffect(() => {
    checkValid();
  }, [signature, account.address, checkValid]);

  useEffect(() => {
    if (signError) {
      setError("Failed to sign message. Please try again.");
      setLoading(false);
    }
  }, [signError]);

  return (
    <div className="flex flex-col items-center space-y-4">
      {!account.address ? (
        <>
          <ConnectButton 
            onClick={() => connect({ connector: cbWalletConnector })} 
            loading={loading}
          />
          
          {error && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm max-w-md">
              <div className="flex items-start">
                <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>{error}</p>
              </div>
            </div>
          )}
        </>
      ) : (
        <StatusCard 
          address={account.address} 
          isValid={valid}
          isSmartWallet={isSmartWallet}
          onDisconnect={handleDisconnect}
        />
      )}
    </div>
  );
} 