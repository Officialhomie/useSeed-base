"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import SlippageControlABI from "@/ABI/SlippageControl.json";
import TokenABI from "@/ABI/Token.json";

export default function SlippageSettings() {
  const { address } = useAccount();
  const [generalSlippage, setGeneralSlippage] = useState(1.0);
  const [tokenSlippage, setTokenSlippage] = useState<{ [key: string]: number }>({});
  const [slippageAction, setSlippageAction] = useState<"continue" | "revert">("continue");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [commonTokens, setCommonTokens] = useState<{ symbol: string; address: string }[]>([
    { symbol: "ETH", address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" },
    { symbol: "USDC", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
    { symbol: "WETH", address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" }
  ]);
  
  // Contract addresses
  const SLIPPAGE_CONTROL_ADDRESS = "0x7ddc43c892f7662748426F3f9865495AA3364bC5"; 
  
  // Read user's global slippage tolerance
  const { data: userSlippageTolerance } = useReadContract({
    address: SLIPPAGE_CONTROL_ADDRESS as `0x${string}`,
    abi: SlippageControlABI,
    functionName: 'getSlippageTolerance',
    args: [address],
  });
  
  // Read slippage action (continue or revert)
  const { data: userSlippageAction } = useReadContract({
    address: SLIPPAGE_CONTROL_ADDRESS as `0x${string}`,
    abi: SlippageControlABI,
    functionName: 'getSlippageAction',
    args: [address],
  });
  
  // Read ETH token slippage
  const { data: ethSlippage } = useReadContract({
    address: SLIPPAGE_CONTROL_ADDRESS as `0x${string}`,
    abi: SlippageControlABI,
    functionName: 'getTokenSlippageTolerance',
    args: [address, commonTokens[0].address as `0x${string}`],
  });
  
  // Read USDC token slippage
  const { data: usdcSlippage } = useReadContract({
    address: SLIPPAGE_CONTROL_ADDRESS as `0x${string}`,
    abi: SlippageControlABI,
    functionName: 'getTokenSlippageTolerance',
    args: [address, commonTokens[1].address as `0x${string}`],
  });
  
  // Read WETH token slippage
  const { data: wethSlippage } = useReadContract({
    address: SLIPPAGE_CONTROL_ADDRESS as `0x${string}`,
    abi: SlippageControlABI,
    functionName: 'getTokenSlippageTolerance',
    args: [address, commonTokens[2].address as `0x${string}`],
  });
  
  // Write contract hooks
  const { writeContract, data: updateTxHash } = useWriteContract();
  
  // Wait for transaction receipt
  const { isLoading: isUpdatePending, isSuccess: isUpdateSuccess } = useWaitForTransactionReceipt({
    hash: updateTxHash,
  });
  
  // Update UI when contract data is fetched
  useEffect(() => {
    if (userSlippageTolerance) {
      // Contract returns basis points, convert to percentage
      setGeneralSlippage(Number(userSlippageTolerance) / 100);
    }
    
    if (userSlippageAction !== undefined) {
      setSlippageAction(userSlippageAction === 0 ? "continue" : "revert");
    }
  }, [userSlippageTolerance, userSlippageAction]);
  
  // Update token slippages when data is fetched
  useEffect(() => {
    const newTokenSlippage = { ...tokenSlippage };
    
    if (ethSlippage) {
      newTokenSlippage["ETH"] = Number(ethSlippage) / 100;
    } else {
      newTokenSlippage["ETH"] = generalSlippage;
    }
    
    if (usdcSlippage) {
      newTokenSlippage["USDC"] = Number(usdcSlippage) / 100;
    } else {
      newTokenSlippage["USDC"] = generalSlippage;
    }
    
    if (wethSlippage) {
      newTokenSlippage["WETH"] = Number(wethSlippage) / 100;
    } else {
      newTokenSlippage["WETH"] = generalSlippage;
    }
    
    setTokenSlippage(newTokenSlippage);
  }, [ethSlippage, usdcSlippage, wethSlippage, generalSlippage]);
  
  // Save general slippage settings
  const saveGeneralSlippage = async () => {
    if (!address) return;
    
    try {
      // Convert percentage to basis points
      const basisPoints = Math.round(generalSlippage * 100);
      
      writeContract({
        address: SLIPPAGE_CONTROL_ADDRESS as `0x${string}`,
        abi: SlippageControlABI,
        functionName: 'setSlippageTolerance',
        args: [address, basisPoints]
      });
    } catch (error) {
      console.error("Error saving general slippage:", error);
    }
  };
  
  // Save slippage action
  const saveSlippageAction = async () => {
    if (!address) return;
    
    try {
      writeContract({
        address: SLIPPAGE_CONTROL_ADDRESS as `0x${string}`,
        abi: SlippageControlABI,
        functionName: 'setSlippageAction',
        args: [address, slippageAction === "continue" ? 0 : 1]
      });
    } catch (error) {
      console.error("Error saving slippage action:", error);
    }
  };
  
  // Save token-specific slippage
  const saveTokenSlippage = async (tokenSymbol: string, tokenAddress: string) => {
    if (!address) return;
    
    try {
      // Convert percentage to basis points
      const basisPoints = Math.round(tokenSlippage[tokenSymbol] * 100);
      
      writeContract({
        address: SLIPPAGE_CONTROL_ADDRESS as `0x${string}`,
        abi: SlippageControlABI,
        functionName: 'setTokenSlippageTolerance',
        args: [address, tokenAddress as `0x${string}`, basisPoints]
      });
    } catch (error) {
      console.error(`Error saving slippage for ${tokenSymbol}:`, error);
    }
  };
  
  // Handle save button click
  const handleSave = async () => {
    setLoading(true);
    
    try {
      // Save general slippage
      await saveGeneralSlippage();
      
      // Save slippage action
      await saveSlippageAction();
      
      // Save token-specific slippages
      for (const token of commonTokens) {
        await saveTokenSlippage(token.symbol, token.address);
      }
      
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Error saving settings:", error);
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6">
      <h2 className="text-xl font-bold mb-4">Slippage Settings</h2>
      
      <div className="border-b border-gray-800 mb-4">
        <div className="flex space-x-4">
          <button 
            className={`pb-2 px-1 ${activeTab === 'general' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400'}`}
            onClick={() => setActiveTab('general')}
          >
            General Settings
          </button>
          <button 
            className={`pb-2 px-1 ${activeTab === 'token' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400'}`}
            onClick={() => setActiveTab('token')}
          >
            Token-Specific
          </button>
        </div>
      </div>
      
      {activeTab === 'general' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Default Slippage Tolerance
            </label>
            <div className="flex items-center">
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={generalSlippage}
                onChange={(e) => setGeneralSlippage(parseFloat(e.target.value))}
                className="w-full"
              />
              <span className="ml-2 text-white font-medium w-12 text-right">{generalSlippage}%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              This is the default slippage used for all tokens unless overridden
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              When Slippage is Exceeded
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div 
                className={`border ${slippageAction === 'continue' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700'} rounded-lg p-3 cursor-pointer`}
                onClick={() => setSlippageAction('continue')}
              >
                <div className="text-sm font-medium">Continue Transaction</div>
                <div className="text-xs text-gray-400 mt-1">Transaction will proceed even if slippage is higher than expected</div>
              </div>
              <div 
                className={`border ${slippageAction === 'revert' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700'} rounded-lg p-3 cursor-pointer`}
                onClick={() => setSlippageAction('revert')}
              >
                <div className="text-sm font-medium">Revert Transaction</div>
                <div className="text-xs text-gray-400 mt-1">Transaction will fail if slippage exceeds tolerance</div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'token' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-400 mb-4">Set custom slippage tolerances for specific tokens. These settings will override the default slippage.</p>
          
          <div className="space-y-4">
            {Object.entries(tokenSlippage).map(([token, value]) => {
              const tokenObj = commonTokens.find(t => t.symbol === token);
              if (!tokenObj) return null;
              
              return (
                <div key={token} className="flex items-center">
                  <div className="w-16 font-medium">{token}</div>
                  <div className="flex-1 mx-4">
                    <input
                      type="range"
                      min="0.1"
                      max="5"
                      step="0.1"
                      value={value}
                      onChange={(e) => setTokenSlippage({...tokenSlippage, [token]: parseFloat(e.target.value)})}
                      className="w-full"
                    />
                  </div>
                  <div className="w-12 text-right">{value}%</div>
                </div>
              );
            })}
          </div>
          
          <button className="text-sm text-blue-500 mt-4 flex items-center">
            <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Add Another Token
          </button>
        </div>
      )}
      
      <div className="mt-6 pt-6 border-t border-gray-800">
        <button
          onClick={handleSave}
          disabled={loading || isUpdatePending}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg flex items-center justify-center"
        >
          {(loading || isUpdatePending) ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving settings...
            </>
          ) : (
            'Save Settings'
          )}
        </button>
      </div>
    </div>
  );
} 