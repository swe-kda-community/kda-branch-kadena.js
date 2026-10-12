/**
 * AI tool: Get network and chain information
 */

import { z } from 'zod';
import type { NetworkInfo, ToolResult } from '../types.js';
import { formatNetworkInfo } from '../utils/format.js';

export const networkInfoSchema = z.object({
  networkId: z
    .string()
    .default('mainnet01')
    .describe('The network ID (mainnet01, testnet06, development)'),
  host: z.string().optional().describe('Custom Chainweb node host URL'),
});

export type NetworkInfoInput = z.infer<typeof networkInfoSchema>;

export const chainInfoSchema = z.object({
  chainId: z.string().describe('The chain ID to query (0-19)'),
  networkId: z
    .string()
    .default('mainnet01')
    .describe('The network ID'),
  host: z.string().optional().describe('Custom Chainweb node host URL'),
});

export type ChainInfoInput = z.infer<typeof chainInfoSchema>;

/**
 * Known Kadena networks
 */
export const KNOWN_NETWORKS = {
  mainnet01: {
    hosts: [
      'https://api.chainweb-community.org',
      'https://fr-1.chainweb-community.org',
      'https://nl-1.chainweb-community.org',
      'https://pl-1.chainweb-community.org',
      'https://pl-2.chainweb-community.org',
      'https://ca-1.chainweb-community.org',
    ],
    chainCount: 20,
    explorerUrl: 'https://explorer.chainweb-community.org',
  },
  testnet06: {
    hosts: ['https://api.testnet.chainweb-community.org'],
    chainCount: 20,
    explorerUrl: 'https://explorer.chainweb-community.org',
  },
  development: {
    hosts: ['http://localhost:8080'],
    chainCount: 20,
    explorerUrl: undefined,
  },
} as const;

/**
 * Get the default host for a network
 */
function getDefaultHost(networkId: string): string {
  const known = KNOWN_NETWORKS[networkId as keyof typeof KNOWN_NETWORKS];
  return known?.hosts[0] ?? 'http://localhost:8080';
}

/**
 * Get network information
 */
export async function getNetworkInfo(
  input: NetworkInfoInput,
): Promise<ToolResult<NetworkInfo>> {
  const host = input.host ?? getDefaultHost(input.networkId);
  const url = `${host}/chainweb/0.0/${input.networkId}/cut`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      // Return static info if the node is not available
      const known = KNOWN_NETWORKS[input.networkId as keyof typeof KNOWN_NETWORKS];
      if (known) {
        return {
          success: true,
          data: {
            networkId: input.networkId,
            chainCount: known.chainCount,
            apiVersion: '0.0',
            hosts: [...known.hosts],
          },
        };
      }
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const cut = await response.json() as { id: string; height: number; hashes: Record<string, unknown> };
    const chainCount = Object.keys(cut.hashes ?? {}).length;

    const known = KNOWN_NETWORKS[input.networkId as keyof typeof KNOWN_NETWORKS];
    const info: NetworkInfo = {
      networkId: input.networkId,
      chainCount: chainCount || known?.chainCount || 20,
      apiVersion: '0.0',
      hosts: known?.hosts ? [...known.hosts] : [host],
    };

    return { success: true, data: info };
  } catch (err) {
    // Fallback to static info
    const known = KNOWN_NETWORKS[input.networkId as keyof typeof KNOWN_NETWORKS];
    if (known) {
      return {
        success: true,
        data: {
          networkId: input.networkId,
          chainCount: known.chainCount,
          apiVersion: '0.0',
          hosts: [...known.hosts],
        },
      };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Get block height for a specific chain
 */
export async function getChainHeight(
  input: ChainInfoInput,
): Promise<ToolResult<{ chainId: string; height: number; networkId: string }>> {
  const host = input.host ?? getDefaultHost(input.networkId);
  const url = `${host}/chainweb/0.0/${input.networkId}/cut`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const cut = await response.json() as { hashes: Record<string, { height: number }> };
    const chainData = cut.hashes?.[input.chainId];

    if (!chainData) {
      return {
        success: false,
        error: `Chain ${input.chainId} not found in network ${input.networkId}`,
      };
    }

    return {
      success: true,
      data: {
        chainId: input.chainId,
        height: chainData.height,
        networkId: input.networkId,
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
 * AI Tool definition for network info
 */
export const networkToolDefinition = {
  description:
    'Get information about a Kadena network, including the number of chains and available hosts.',
  parameters: networkInfoSchema,
  execute: async (input: NetworkInfoInput): Promise<string> => {
    const result = await getNetworkInfo(input);
    if (!result.success) {
      return `Error fetching network info: ${result.error}`;
    }
    return formatNetworkInfo(result.data!);
  },
};

/**
 * AI Tool definition for chain height
 */
export const chainHeightToolDefinition = {
  description:
    'Get the current block height for a specific chain on a Kadena network.',
  parameters: chainInfoSchema,
  execute: async (input: ChainInfoInput): Promise<string> => {
    const result = await getChainHeight(input);
    if (!result.success) {
      return `Error fetching chain height: ${result.error}`;
    }
    const { chainId, height, networkId } = result.data!;
    return `Chain ${chainId} on ${networkId} is at block height ${height}`;
  },
};
