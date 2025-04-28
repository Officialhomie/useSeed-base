import { NextResponse } from 'next/server';
import { getPublicClient, getSpenderWalletClient } from '@/lib/spender';
import { 
  spendPermissionManagerAddress, 
  spendPermissionManagerAbi 
} from '@/lib/abi/SpendPermissionManager';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { spendPermission, signature } = body;
    
    // Get the clients
    const publicClient = await getPublicClient();
    const spenderWallet = await getSpenderWalletClient();
    
    if (!spenderWallet.account) {
      return NextResponse.json(
        { error: 'Spender wallet not configured correctly' },
        { status: 500 }
      );
    }

    // First approve the spend permission if not already approved
    // This would typically be done just once when the user first subscribes
    try {
      const txHash = await spenderWallet.writeContract({
        address: spendPermissionManagerAddress,
        abi: spendPermissionManagerAbi,
        functionName: 'approveWithSignature',
        args: [
          {
            account: spendPermission.account,
            spender: spendPermission.spender,
            token: spendPermission.token,
            allowance: BigInt(spendPermission.allowance),
            period: Number(spendPermission.period),
            start: Number(spendPermission.start),
            end: Number(spendPermission.end),
            salt: BigInt(spendPermission.salt),
            extraData: spendPermission.extraData
          },
          signature
        ],
      });

      // Wait for transaction to be mined
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      
      // Now collect the actual payment
      // In a real app, this would be separate and scheduled based on subscription periods
      const collectTxHash = await spenderWallet.writeContract({
        address: spendPermissionManagerAddress,
        abi: spendPermissionManagerAbi,
        functionName: 'spend',
        args: [
          {
            account: spendPermission.account,
            spender: spendPermission.spender,
            token: spendPermission.token,
            allowance: BigInt(spendPermission.allowance),
            period: Number(spendPermission.period),
            start: Number(spendPermission.start),
            end: Number(spendPermission.end),
            salt: BigInt(spendPermission.salt),
            extraData: spendPermission.extraData
          },
          // We're collecting a payment of 1/30th of the monthly amount
          BigInt(spendPermission.allowance) / BigInt(30),
          // Send to the same spender address for simplicity
          spendPermission.spender
        ],
      });

      return NextResponse.json({ 
        success: true,
        message: 'Subscription payment collected successfully',
        transactionHash: collectTxHash
      });
    } catch (error: unknown) {
      console.error('Error collecting subscription:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { 
          error: 'Failed to collect subscription', 
          details: errorMessage 
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error('API route error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
} 