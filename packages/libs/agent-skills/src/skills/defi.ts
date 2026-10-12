import { z } from 'zod';
import type { AgentSkill, SkillContext, SkillResult } from '../types.js';

/**
 * Token swap quote result
 */
export interface SwapQuote {
  inputToken: string;
  outputToken: string;
  inputAmount: number;
  estimatedOutputAmount: number;
  priceImpact: string;
  route: string[];
  dex: string;
}

/**
 * Liquidity position result
 */
export interface LiquidityPosition {
  pool: string;
  token0: string;
  token1: string;
  amount0: number;
  amount1: number;
  shareOfPool: string;
}

/**
 * Skill: Get a swap quote (stub — requires DEX integration)
 *
 * NOTE: This skill provides interface scaffolding.
 * Connect to a specific DEX (e.g., Kaddex/Ecko) to enable live quotes.
 */
export const getSwapQuoteSkill: AgentSkill<
  {
    inputToken: string;
    outputToken: string;
    inputAmount: number;
    slippage?: number;
  },
  SwapQuote
> = {
  id: 'defi.getSwapQuote',
  name: 'Get Swap Quote',
  description:
    'Gets an estimated swap quote for exchanging one token for another on Kadena DEXes',
  inputSchema: z.object({
    inputToken: z.string().describe('Token to swap from (e.g., "coin" for KDA)'),
    outputToken: z.string().describe('Token to swap to'),
    inputAmount: z.number().positive().describe('Amount of input token to swap'),
    slippage: z
      .number()
      .min(0)
      .max(100)
      .optional()
      .describe('Max slippage tolerance in percent (default 0.5)'),
  }),
  async execute(
    input: {
      inputToken: string;
      outputToken: string;
      inputAmount: number;
      slippage?: number;
    },
    _context: SkillContext,
  ): Promise<SkillResult<SwapQuote>> {
    // Stub: integrate with Kaddex or Ecko DEX API to implement
    return {
      success: false,
      error:
        'DEX integration required. Connect to Kaddex (ecko.finance) or another Kadena DEX to enable live swap quotes.',
      metadata: {
        requestedInput: input.inputToken,
        requestedOutput: input.outputToken,
        amount: input.inputAmount,
        hint: 'See https://kda-chain.org/docs for available DEX integrations',
      },
    };
  },
};

/**
 * Skill: Describe a liquidity provision (stub — requires DEX integration)
 */
export const describeLiquiditySkill: AgentSkill<
  { token0: string; token1: string; amount0: number; amount1: number },
  LiquidityPosition
> = {
  id: 'defi.describeLiquidity',
  name: 'Describe Liquidity Provision',
  description:
    'Describes what adding liquidity to a Kadena DEX pool would do',
  inputSchema: z.object({
    token0: z.string().describe('First token in the pair'),
    token1: z.string().describe('Second token in the pair'),
    amount0: z.number().positive().describe('Amount of token0 to add'),
    amount1: z.number().positive().describe('Amount of token1 to add'),
  }),
  async execute(
    input: { token0: string; token1: string; amount0: number; amount1: number },
    context: SkillContext,
  ): Promise<SkillResult<LiquidityPosition>> {
    return {
      success: true,
      data: {
        pool: `${input.token0}/${input.token1}`,
        token0: input.token0,
        token1: input.token1,
        amount0: input.amount0,
        amount1: input.amount1,
        shareOfPool: 'Unknown — DEX integration required',
      },
      metadata: {
        networkId: context.networkId,
        note: 'Connect to a Kadena DEX to get actual pool share estimates',
        docs: 'https://kda-chain.org/docs',
      },
    };
  },
};

export const defiSkills = [getSwapQuoteSkill, describeLiquiditySkill] as const;
