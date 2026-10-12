/**
 * AI tool: Execute local Pact queries
 */

import { z } from 'zod';
import type { PactLocalResult, ToolResult } from '../types.js';
import { formatPactValue } from '../utils/format.js';

export const pactLocalSchema = z.object({
  code: z.string().describe('The Pact expression to evaluate locally'),
  chainId: z.string().describe('The chain ID to evaluate on (0-19)'),
  networkId: z
    .string()
    .default('mainnet01')
    .describe('The network ID (mainnet01, testnet06, etc.)'),
  data: z
    .record(z.unknown())
    .optional()
    .describe('Optional data to pass to the Pact expression'),
  host: z.string().optional().describe('Custom Chainweb node host URL'),
});

export type PactLocalInput = z.infer<typeof pactLocalSchema>;

export const pactDescribeModuleSchema = z.object({
  moduleName: z.string().describe('The fully qualified Pact module name (e.g., "coin", "free.my-module")'),
  chainId: z.string().describe('The chain ID to query (0-19)'),
  networkId: z
    .string()
    .default('mainnet01')
    .describe('The network ID'),
  host: z.string().optional().describe('Custom Chainweb node host URL'),
});

export type PactDescribeModuleInput = z.infer<typeof pactDescribeModuleSchema>;

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
 * Execute a Pact expression locally (read-only, no gas)
 */
export async function executePactLocal(
  input: PactLocalInput,
): Promise<ToolResult<PactLocalResult>> {
  const host = input.host ?? getDefaultHost(input.networkId);
  const url = `${host}/chainweb/0.0/${input.networkId}/chain/${input.chainId}/pact/api/v1/local`;

  const cmd = {
    networkId: input.networkId,
    payload: {
      exec: {
        data: input.data ?? {},
        code: input.code,
      },
    },
    signers: [],
    meta: {
      chainId: input.chainId,
      sender: '',
      gasLimit: 150000,
      gasPrice: 1e-8,
      ttl: 600,
      creationTime: Math.floor(Date.now() / 1000),
    },
    nonce: `local-${Date.now()}`,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cmd: JSON.stringify(cmd),
        hash: 'local-query',
        sigs: [],
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const raw = await response.json() as {
      result?: { status: string; data?: unknown; error?: { message: string } };
      gas?: number;
      logs?: string;
      reqKey?: string;
    };

    if (raw.result?.status !== 'success') {
      return {
        success: false,
        error: raw.result?.error?.message ?? 'Pact evaluation failed',
      };
    }

    return {
      success: true,
      data: {
        result: raw.result.data,
        gas: raw.gas ?? 0,
        logs: raw.logs,
        reqKey: raw.reqKey ?? '',
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * AI Tool definition for local Pact execution
 */
export const pactToolDefinition = {
  description:
    'Execute a Pact expression locally on the Kadena blockchain. This is a read-only operation that does not consume gas or modify state. Use this to query smart contract data.',
  parameters: pactLocalSchema,
  execute: async (input: PactLocalInput): Promise<string> => {
    const result = await executePactLocal(input);
    if (!result.success) {
      return `Pact execution error: ${result.error}`;
    }
    const formatted = formatPactValue(result.data!.result);
    return `Result: ${formatted}\nGas used: ${result.data!.gas}`;
  },
};

/**
 * AI Tool definition for describing a Pact module
 */
export const pactDescribeModuleToolDefinition = {
  description:
    'Describe a Pact module (smart contract) on the Kadena blockchain. Returns the module interface including functions and their signatures.',
  parameters: pactDescribeModuleSchema,
  execute: async (input: PactDescribeModuleInput): Promise<string> => {
    const result = await executePactLocal({
      code: `(describe-module "${input.moduleName}")`,
      chainId: input.chainId,
      networkId: input.networkId,
      host: input.host,
    });
    if (!result.success) {
      return `Error describing module: ${result.error}`;
    }
    return `Module ${input.moduleName}:\n${formatPactValue(result.data!.result)}`;
  },
};
