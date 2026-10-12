import { z } from 'zod';
import type { AgentSkill, SkillContext, SkillResult } from '../types.js';

/**
 * Account balance data
 */
export interface AccountBalance {
  account: string;
  balance: number;
  guard: unknown;
  chainId: string;
}

/**
 * Skill: Get KDA balance for an account
 */
export const getBalanceSkill: AgentSkill<
  { account: string; chainId?: string },
  AccountBalance
> = {
  id: 'wallet.getBalance',
  name: 'Get KDA Balance',
  description:
    'Retrieves the KDA balance for a Kadena account on a specific chain',
  inputSchema: z.object({
    account: z.string().min(1).describe('Kadena account name (k:... or w:...)'),
    chainId: z
      .string()
      .optional()
      .describe('Chain ID (0-19), defaults to context chain'),
  }),
  async execute(
    input: { account: string; chainId?: string },
    context: SkillContext,
  ): Promise<SkillResult<AccountBalance>> {
    const chainId = input.chainId ?? context.chainId;
    const apiHost =
      context.apiHost ?? 'https://api.chainweb-community.org';

    try {
      const networkPath = `chainweb/0.0/${context.networkId}/chain/${chainId}/pact`;
      const url = `${apiHost}/${networkPath}/api/v1/local`;

      const cmd = {
        networkId: context.networkId,
        payload: {
          exec: {
            data: {},
            code: `(coin.details "${input.account}")`,
          },
        },
        signers: [],
        meta: {
          creationTime: Math.floor(Date.now() / 1000),
          ttl: 600,
          gasLimit: 2500,
          chainId,
          gasPrice: 1.0e-8,
          sender: '',
        },
        nonce: Date.now().toString(),
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd: JSON.stringify(cmd), hash: '', sigs: [] }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `API error: ${response.status} ${response.statusText}`,
        };
      }

      const result = (await response.json()) as {
        result?: { status: string; data?: { balance?: number; guard?: unknown } };
      };

      if (result.result?.status === 'success' && result.result.data) {
        return {
          success: true,
          data: {
            account: input.account,
            balance: result.result.data.balance ?? 0,
            guard: result.result.data.guard,
            chainId,
          },
        };
      }

      return {
        success: false,
        error: 'Account not found or query failed',
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  },
};

/**
 * Skill: Check if an account exists
 */
export const accountExistsSkill: AgentSkill<
  { account: string; chainId?: string },
  { exists: boolean; account: string }
> = {
  id: 'wallet.accountExists',
  name: 'Check Account Exists',
  description: 'Checks whether a Kadena account exists on a specific chain',
  inputSchema: z.object({
    account: z.string().min(1),
    chainId: z.string().optional(),
  }),
  async execute(
    input: { account: string; chainId?: string },
    context: SkillContext,
  ): Promise<SkillResult<{ exists: boolean; account: string }>> {
    const result = await getBalanceSkill.execute(input, context);
    return {
      success: true,
      data: {
        exists: result.success,
        account: input.account,
      },
    };
  },
};

/**
 * Skill: Describe a transfer (builds unsigned transaction description)
 */
export const describeTransferSkill: AgentSkill<
  { from: string; to: string; amount: number; chainId?: string },
  { description: string; estimatedFee: string; requiresSignature: boolean }
> = {
  id: 'wallet.describeTransfer',
  name: 'Describe KDA Transfer',
  description:
    'Describes what a KDA transfer transaction would do without executing it',
  inputSchema: z.object({
    from: z.string().min(1).describe('Sender account'),
    to: z.string().min(1).describe('Recipient account'),
    amount: z.number().positive().describe('Amount of KDA to transfer'),
    chainId: z.string().optional().describe('Chain ID for the transfer'),
  }),
  async execute(
    input: { from: string; to: string; amount: number; chainId?: string },
    context: SkillContext,
  ): Promise<
    SkillResult<{
      description: string;
      estimatedFee: string;
      requiresSignature: boolean;
    }>
  > {
    const chainId = input.chainId ?? context.chainId;
    return {
      success: true,
      data: {
        description: `Transfer ${input.amount} KDA from ${input.from} to ${input.to} on chain ${chainId} (network: ${context.networkId})`,
        estimatedFee: '0.0000001 KDA (approx)',
        requiresSignature: true,
      },
      metadata: {
        pactCode: `(coin.transfer "${input.from}" "${input.to}" ${input.amount}.0)`,
        chainId,
        networkId: context.networkId,
      },
    };
  },
};

export const walletSkills = [
  getBalanceSkill,
  accountExistsSkill,
  describeTransferSkill,
] as const;
