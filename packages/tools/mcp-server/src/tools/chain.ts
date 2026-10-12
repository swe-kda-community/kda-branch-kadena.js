/**
 * MCP tools for Kadena chain and network info.
 */

import type { KadenaMcpServerOptions } from '../server.js';
import type { McpTool } from './index.js';

export function createChainTools(
  opts: Required<KadenaMcpServerOptions>,
): McpTool[] {
  return [
    {
      name: 'getChainInfo',
      description:
        'Fetch the latest block header info for a specific chain (block height, hash, creation time).',
      inputSchema: {
        type: 'object',
        properties: {
          chainId: {
            type: 'string',
            description: 'The chain ID (0-19)',
          },
          networkId: {
            type: 'string',
            description: 'Network ID (default: mainnet01)',
          },
        },
        required: ['chainId'],
      },
      handler: async (params) => {
        const { chainId, networkId = opts.networkId } = params as {
          chainId: string;
          networkId?: string;
        };

        const url = `${opts.apiHost}/chainweb/0.0/${networkId}/chain/${chainId}/header`;

        try {
          const res = await fetch(url, {
            headers: { Accept: 'application/json' },
          });

          if (!res.ok) {
            return `Error ${res.status}: ${await res.text()}`;
          }

          const data = await res.json();
          return JSON.stringify(data, null, 2);
        } catch (err) {
          return `Failed to fetch chain info: ${String(err)}`;
        }
      },
    },

    {
      name: 'getBlockHeight',
      description: 'Fetch the current block height for a specific Kadena chain.',
      inputSchema: {
        type: 'object',
        properties: {
          chainId: {
            type: 'string',
            description: 'The chain ID (0-19)',
          },
          networkId: {
            type: 'string',
            description: 'Network ID (default: mainnet01)',
          },
        },
        required: ['chainId'],
      },
      handler: async (params) => {
        const { chainId, networkId = opts.networkId } = params as {
          chainId: string;
          networkId?: string;
        };

        const url = `${opts.apiHost}/chainweb/0.0/${networkId}/chain/${chainId}/header`;

        try {
          const res = await fetch(url, {
            headers: { Accept: 'application/json' },
          });

          if (!res.ok) {
            return `Error ${res.status}: ${await res.text()}`;
          }

          const data = (await res.json()) as { height?: number };
          if (data.height !== undefined) {
            return `Chain ${chainId} current block height: ${data.height}`;
          }
          return JSON.stringify(data, null, 2);
        } catch (err) {
          return `Failed to fetch block height: ${String(err)}`;
        }
      },
    },

    {
      name: 'getNetworkInfo',
      description:
        'Fetch the current cut (global consensus state) for the Kadena network, showing block heights across all chains.',
      inputSchema: {
        type: 'object',
        properties: {
          networkId: {
            type: 'string',
            description: 'Network ID (default: mainnet01)',
          },
        },
        required: [],
      },
      handler: async (params) => {
        const { networkId = opts.networkId } = params as {
          networkId?: string;
        };

        const url = `${opts.apiHost}/chainweb/0.0/${networkId}/cut`;

        try {
          const res = await fetch(url, {
            headers: { Accept: 'application/json' },
          });

          if (!res.ok) {
            return `Error ${res.status}: ${await res.text()}`;
          }

          const data = await res.json();
          return JSON.stringify(data, null, 2);
        } catch (err) {
          return `Failed to fetch network info: ${String(err)}`;
        }
      },
    },
  ];
}
