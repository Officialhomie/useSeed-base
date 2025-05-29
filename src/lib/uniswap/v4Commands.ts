import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../contracts';

// Universal Router Commands
export const Commands = {
  V4_SWAP: 0x00,
  V4_POSITION_MANAGER_CALL: 0x01,
  V4_POSITION_MANAGER_CALL_WITH_PERMITS: 0x02,
  PERMIT2_TRANSFER_FROM: 0x03,
  PERMIT2_PERMIT_BATCH: 0x04,
  SWEEP: 0x05,
  TRANSFER: 0x06,
  PAY_PORTION: 0x07,
} as const;

// V4Router Actions
export const Actions = {
  SETTLE_ALL: 0x00,
  TAKE_ALL: 0x01,
  SETTLE: 0x02,
  TAKE: 0x03,
  CLOSE_CURRENCY: 0x04,
  CLEAR_OR_TAKE: 0x05,
  SWAP_EXACT_IN_SINGLE: 0x06,
  SWAP_EXACT_IN: 0x07,
  SWAP_EXACT_OUT_SINGLE: 0x08,
  SWAP_EXACT_OUT: 0x09,
} as const;

export interface V4SwapParams {
  poolKey: {
    currency0: string;
    currency1: string;
    fee: number;
    tickSpacing: number;
    hooks: string;
  };
  zeroForOne: boolean;
  amountSpecified: string;
  sqrtPriceLimitX96: string;
  hookData: string;
}

export interface V4CommandParams {
  fromToken: string;
  toToken: string;
  amountIn: string;
  amountOutMinimum: string;
  recipient: string;
  deadline: number;
  hookData: string;
}

export function buildV4SwapCommand(): string {
  return ethers.utils.solidityPack(['uint8'], [Commands.V4_SWAP]);
}

export function buildV4Actions(): string {
  return ethers.utils.solidityPack(
    ['uint8', 'uint8', 'uint8'],
    [
      Actions.SWAP_EXACT_IN_SINGLE,
      Actions.SETTLE_ALL,
      Actions.TAKE_ALL
    ]
  );
}

export function encodeV4SwapParams(params: V4SwapParams): string {
  return ethers.utils.defaultAbiCoder.encode(
    [
      'tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks)',
      'bool',
      'int256',
      'uint160',
      'bytes'
    ],
    [
      [
        params.poolKey.currency0,
        params.poolKey.currency1,
        params.poolKey.fee,
        params.poolKey.tickSpacing,
        params.poolKey.hooks
      ],
      params.zeroForOne,
      params.amountSpecified,
      params.sqrtPriceLimitX96,
      params.hookData
    ]
  );
}

export function encodeV4CommandInput(params: V4CommandParams): string {
  const actions = buildV4Actions();
  const swapParams = encodeV4SwapParams({
    poolKey: {
      currency0: params.fromToken < params.toToken ? params.fromToken : params.toToken,
      currency1: params.fromToken < params.toToken ? params.toToken : params.fromToken,
      fee: 3000, // 0.3%
      tickSpacing: 60,
      hooks: CONTRACT_ADDRESSES.SPEND_SAVE_HOOK
    },
    zeroForOne: params.fromToken < params.toToken,
    amountSpecified: `-${params.amountIn}`, // Negative for exact input
    sqrtPriceLimitX96: params.fromToken < params.toToken ? 
      '4295128740' : // MIN_SQRT_RATIO + 1
      '1461446703485210103287273052203988822378723970341', // MAX_SQRT_RATIO - 1
    hookData: params.hookData
  });

  return ethers.utils.defaultAbiCoder.encode(
    ['bytes', 'bytes[]'],
    [actions, [swapParams]]
  );
}