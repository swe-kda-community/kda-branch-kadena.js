/**
 * MCP resources exposing Kadena network configuration and chain metadata.
 */

import { Server as McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import type { KadenaMcpServerOptions } from '../server.js';

export const NETWORK_CONFIGS = {
  mainnet01: {
    networkId: 'mainnet01',
    apiHost: 'https://api.chainweb-community.org',
    explorer: 'https://explorer.chainweb-community.org',
    bootstrapNodes: [
      'fr-1.chainweb-community.org',
      'nl-1.chainweb-community.org',
      'pl-1.chainweb-community.org',
      'pl-2.chainweb-community.org',
      'ca-1.chainweb-community.org',
    ],
    snapshots: 'https://snapshots.chainweb-community.org',
    chains: Array.from({ length: 20 }, (_, i) => String(i)),
  },
  testnet06: {
    networkId: 'testnet06',
    apiHost: 'https://api.testnet.chainweb-community.org',
    explorer: 'https://explorer.chainweb-community.org',
    bootstrapNodes: [
      'fr-1.chainweb-community.org',
      'nl-1.chainweb-community.org',
      'pl-1.chainweb-community.org',
      'pl-2.chainweb-community.org',
      'ca-1.chainweb-community.org',
    ],
    snapshots: 'https://snapshots.chainweb-community.org',
    chains: Array.from({ length: 20 }, (_, i) => String(i)),
  },
};

const CHAIN_IDS = Array.from({ length: 20 }, (_, i) => String(i));

export function registerResources(
  server: McpServer,
  _opts: Required<KadenaMcpServerOptions>,
): void {
  // resources/list — enumerate available resources
  server.setRequestHandler(ListResourcesRequestSchema, () => ({
    resources: [
      {
        uri: 'kadena://networks',
        name: 'Kadena Network Configurations',
        description:
          'Mainnet and testnet network configurations including API hosts, explorer, and bootstrap nodes.',
        mimeType: 'application/json',
      },
      {
        uri: 'kadena://chains',
        name: 'Kadena Chain IDs',
        description: 'List of all Kadena chain IDs (0-19).',
        mimeType: 'application/json',
      },
    ],
  }));

  // resources/read — serve resource content
  server.setRequestHandler(ReadResourceRequestSchema, (req) => {
    const { uri } = req.params;

    if (uri === 'kadena://networks') {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(NETWORK_CONFIGS, null, 2),
          },
        ],
      };
    }

    if (uri === 'kadena://chains') {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ chainIds: CHAIN_IDS }, null, 2),
          },
        ],
      };
    }

    return {
      isError: true,
      contents: [
        {
          uri,
          mimeType: 'text/plain',
          text: `Unknown resource: ${uri}`,
        },
      ],
    };
  });
}
