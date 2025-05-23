import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { Address, parseUnits, maxUint256, erc20Abi } from 'viem';
import { CONTRACT_ADDRESSES } from '../contracts';
import type { ApprovalStatus, ApprovalState } from '@/components/tokens/TokenApprovalComponents';

interface UseTokenApprovalsProps {
  tokenAddress: Address;
  tokenSymbol: string;
  amount: string;
  enabled: boolean;
}

export function useTokenApprovals({ 
  tokenAddress, 
  tokenSymbol, 
  amount, 
  enabled 
}: UseTokenApprovalsProps) {
  const { address } = useAccount();
  const [approvalState, setApprovalState] = useState<ApprovalState>({
    poolManager: 'not-required',
    hook: 'not-required', 
    all: 'not-required'
  });
  const [isCheckingApprovals, setIsCheckingApprovals] = useState(false);
  const [isApprovingTokens, setIsApprovingTokens] = useState(false);

  // Check Pool Manager allowance
  const { data: poolManagerAllowance, refetch: refetchPoolManager } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, CONTRACT_ADDRESSES.UNISWAP_BASE_MAINNET_POOL_MANAGER] : undefined,
    query: {
        enabled: enabled && !!address && tokenSymbol !== 'ETH',
    }
  });

  // Check Hook allowance  
  const { data: hookAllowance, refetch: refetchHook } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'allowance', 
    args: address ? [address, CONTRACT_ADDRESSES.SPEND_SAVE_HOOK] : undefined,
    query: {
        enabled: enabled && !!address && tokenSymbol !== 'ETH',
    }
  });

  const { writeContractAsync } = useWriteContract();

  // Calculate required amount - convert to proper decimals
  const requiredAmount = amount && parseFloat(amount) > 0 
    ? parseUnits(amount, tokenSymbol === 'USDC' ? 6 : 18) 
    : BigInt(0);

  // Update approval state based on allowances
  useEffect(() => {
    if (!enabled || tokenSymbol === 'ETH') {
      setApprovalState({
        poolManager: 'not-required',
        hook: 'not-required',
        all: 'not-required'
      });
      return;
    }

    // Skip if we're still loading allowances
    if (poolManagerAllowance === undefined || hookAllowance === undefined) {
      setApprovalState({
        poolManager: 'checking',
        hook: 'checking',
        all: 'checking'
      });
      return;
    }

    const poolManagerStatus: ApprovalStatus = 
      poolManagerAllowance >= requiredAmount ? 'approved' : 'required';
      
    const hookStatus: ApprovalStatus = 
      hookAllowance >= requiredAmount ? 'approved' : 'required';

    const allStatus: ApprovalStatus = 
      poolManagerStatus === 'approved' && hookStatus === 'approved' ? 'approved' : 'required';

    setApprovalState({
      poolManager: poolManagerStatus,
      hook: hookStatus,
      all: allStatus
    });
  }, [poolManagerAllowance, hookAllowance, requiredAmount, enabled, tokenSymbol]);

  // Approve function
  const approve = useCallback(async (spender: Address, amount: bigint = maxUint256) => {
    if (!address) throw new Error('Wallet not connected');
    
    return await writeContractAsync({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'approve',
      args: [spender, amount],
    });
  }, [address, tokenAddress, writeContractAsync]);

  // Approve all tokens
  const approveAllTokens = useCallback(async (): Promise<boolean> => {
    if (!enabled || tokenSymbol === 'ETH') return true;
    
    setIsApprovingTokens(true);
    
    try {
      const approvals = [];
      
      if (approvalState.poolManager === 'required') {
        console.log('Approving Pool Manager...');
        approvals.push(approve(CONTRACT_ADDRESSES.UNISWAP_BASE_MAINNET_POOL_MANAGER));
      }
      
      if (approvalState.hook === 'required') {
        console.log('Approving SpendSave Hook...');
        approvals.push(approve(CONTRACT_ADDRESSES.SPEND_SAVE_HOOK));
      }

      if (approvals.length > 0) {
        await Promise.all(approvals);
        
        // Wait a moment for blockchain to update
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Refresh allowances after approval
        await Promise.all([refetchPoolManager(), refetchHook()]);
      }
      
      return true;
    } catch (error) {
      console.error('Approval failed:', error);
      throw error;
    } finally {
      setIsApprovingTokens(false);
    }
  }, [enabled, tokenSymbol, approvalState, approve, refetchPoolManager, refetchHook]);

  // Refresh approvals
  const refreshApprovals = useCallback(async () => {
    if (!enabled || tokenSymbol === 'ETH') return;
    
    setIsCheckingApprovals(true);
    try {
      await Promise.all([refetchPoolManager(), refetchHook()]);
    } finally {
      setIsCheckingApprovals(false);
    }
  }, [enabled, tokenSymbol, refetchPoolManager, refetchHook]);

  return {
    approvalState,
    approvalStatus: approvalState.all,
    isCheckingApprovals,
    isApprovingTokens, 
    needsApprovals: approvalState.all === 'required',
    canProceedWithApprovals: approvalState.all === 'approved' || approvalState.all === 'not-required',
    approveAllTokens,
    refreshApprovals,
  };
}