/**
 * AI tool: Get account details and balance from Kadena blockchain
 */

import { z } from 'zod';
import type { AccountDetails, ToolResult } from '../types.js';
import { formatAccount } from '../utils/format.js';

/**
 * Input schema for the account tool
 */
export const accountToolSchema = z.object({
  accountName: z.string().describe('The Kadena account name (e.g., "k:abcdef...")'),
  chainId: z.string().describe('The chain ID to query (0-19)'),
  networkId: z
    .string()
    .default('mainnet01')
    .describe('The network ID (mainnet01, testnet06, etc.)'),
  host: z.string().optional().describe('Custom Chainweb node host URL'),
});

export type AccountToolInput = z.infer<typeof accountToolSchema>;

/**
 * Get the default host for a network
 */
function getDefaultHost(networkId: string): string {
  switch (networkId) {
    case 'mainnet01':
      return 'https://api.chainweb-community.org';
    case 'testnet06':
      return 'https://api.testnet.chainweb-community.org';
    default:
      return 'http://localhost:8080';
  }
}

/**
 * Fetch account details from the Kadena blockchain
 */
export async function getAccountDetails(
  input: AccountToolInput,
): Promise<ToolResult<AccountDetails>> {
  const host = input.host ?? getDefaultHost(input.networkId);
  const url = `${host}/chainweb/0.0/${input.networkId}/chain/${input.chainId}/pact/api/v1/local`;

  const payload = {
    cmd: JSON.stringify({
      networkId: input.networkId,
      payload: {
        exec: {
          data: {},
          code: `(coin.details "${input.accountName}")`,
        },
      },
      signers: [],
      meta: {
        chainId: input.chainId,
        sender: '',
        gasLimit: 1000,
        gasPrice: 1e-8,
        ttl: 600,
        creationTime: Math.floor(Date.now() / 1000),
      },
      nonce: Date.now().toString(),
    }),
    hash: 'local-query',
    sigs: [],
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const result = await response.json() as {
      result?: { status: string; data?: { account: string; balance: number; guard: { keys: string[]; pred: string } }; error?: { message: string } };
    };

    if (result.result?.status !== 'success') {
      return {
        success: false,
        error: result.result?.error?.message ?? 'Unknown Pact error',
      };
    }

    const data = result.result.data!;
    const accountDetails: AccountDetails = {
      account: data.account,
      balance: data.balance,
      guard: data.guard,
      chainId: input.chainId,
      networkId: input.networkId,
    };

    return { success: true, data: accountDetails };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * AI Tool definition for account queries
 * Compatible with Vercel AI SDK tool() pattern
 */
export const accountToolDefinition = {
  description:
    'Get account details and KDA balance from the Kadena blockchain. Use this to look up an account\'s balance and guard information.',
  parameters: accountToolSchema,
  execute: async (input: AccountToolInput): Promise<string> => {
    const result = await getAccountDetails(input);
    if (!result.success) {
      return `Error fetching account: ${result.error}`;
    }
    return formatAccount(result.data!);
  },
};
