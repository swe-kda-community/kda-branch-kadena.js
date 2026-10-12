/**
 * AI tool: Build and describe Kadena transactions
 */

import { z } from 'zod';
import type { ToolResult, TransactionSummary } from '../types.js';
import { formatTransaction } from '../utils/format.js';

/**
 * Input schema for describing a transaction
 */
export const transactionDescribeSchema = z.object({
  hash: z.string().describe('The transaction request key / hash'),
  chainId: z.string().describe('The chain ID where the transaction was submitted'),
  networkId: z
    .string()
    .default('mainnet01')
    .describe('The network ID (mainnet01, testnet06, etc.)'),
  host: z.string().optional().describe('Custom Chainweb node host URL'),
});

export type TransactionDescribeInput = z.infer<typeof transactionDescribeSchema>;

/**
 * Input schema for building a transfer transaction
 */
export const transferBuildSchema = z.object({
  sender: z.string().describe('The sender account name'),
  receiver: z.string().describe('The receiver account name'),
  amount: z.number().positive().describe('The amount of KDA to transfer'),
  chainId: z.string().describe('The chain ID for the transfer'),
  networkId: z
    .string()
    .default('mainnet01')
    .describe('The network ID (mainnet01, testnet06, etc.)'),
});

export type TransferBuildInput = z.infer<typeof transferBuildSchema>;

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
 * Describe an existing transaction by hash
 */
export async function describeTransaction(
  input: TransactionDescribeInput,
): Promise<ToolResult<TransactionSummary>> {
  const host = input.host ?? getDefaultHost(input.networkId);
  const url = `${host}/chainweb/0.0/${input.networkId}/chain/${input.chainId}/pact/api/v1/poll`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestKeys: [input.hash] }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const results = await response.json() as Record<string, {
      result?: { status: string; data?: unknown; error?: { message: string } };
      txId?: number;
      gas?: number;
    }>;
    const txResult = results[input.hash];

    if (!txResult) {
      return {
        success: false,
        error: `Transaction ${input.hash} not found or not yet confirmed`,
      };
    }

    const status =
      txResult.result?.status === 'success'
        ? 'success'
        : txResult.result?.status === 'failure'
          ? 'failure'
          : 'pending';

    const summary: TransactionSummary = {
      hash: input.hash,
      status,
      sender: '',
      chainId: input.chainId,
      networkId: input.networkId,
      gas: txResult.gas,
      description: `Transaction ${input.hash.slice(0, 8)}... on chain ${input.chainId}`,
    };

    return { success: true, data: summary };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Build a KDA transfer transaction template
 */
export function buildTransferTemplate(input: TransferBuildInput): string {
  return JSON.stringify(
    {
      networkId: input.networkId,
      payload: {
        exec: {
          data: {
            receiver_guard: {
              keys: ['<receiver-public-key>'],
              pred: 'keys-all',
            },
          },
          code: `(coin.transfer "${input.sender}" "${input.receiver}" ${input.amount.toFixed(8)})`,
        },
      },
      signers: [
        {
          pubKey: '<sender-public-key>',
          clist: [
            {
              name: 'coin.TRANSFER',
              args: [input.sender, input.receiver, input.amount],
            },
            { name: 'coin.GAS', args: [] },
          ],
        },
      ],
      meta: {
        chainId: input.chainId,
        sender: input.sender,
        gasLimit: 1500,
        gasPrice: 1e-8,
        ttl: 600,
        creationTime: Math.floor(Date.now() / 1000),
      },
      nonce: `transfer-${Date.now()}`,
    },
    null,
    2,
  );
}

/**
 * AI Tool definition for describing transactions
 */
export const transactionToolDefinition = {
  description:
    'Get the status and details of a Kadena transaction by its request key (hash). Use this to check if a transaction was successful.',
  parameters: transactionDescribeSchema,
  execute: async (input: TransactionDescribeInput): Promise<string> => {
    const result = await describeTransaction(input);
    if (!result.success) {
      return `Error fetching transaction: ${result.error}`;
    }
    return formatTransaction(result.data!);
  },
};

/**
 * AI Tool definition for building transfer transactions
 */
export const transferBuildToolDefinition = {
  description:
    'Build a KDA transfer transaction template. Returns a JSON template that can be signed and submitted. Requires the sender\'s public key to be filled in.',
  parameters: transferBuildSchema,
  execute: async (input: TransferBuildInput): Promise<string> => {
    const template = buildTransferTemplate(input);
    return `Transfer transaction template:\n\`\`\`json\n${template}\n\`\`\`\n\nNote: Fill in the public keys before signing.`;
  },
};
