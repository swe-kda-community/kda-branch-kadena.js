/**
 * MCP tools for Pact smart contract interaction.
 */

import type { KadenaMcpServerOptions } from '../server.js';
import type { McpTool } from './index.js';

function buildLocalRequest(
  networkId: string,
  chainId: string,
  code: string,
): string {
  return JSON.stringify({
    cmd: JSON.stringify({
      networkId,
      payload: { exec: { code, data: {} } },
      signers: [],
      meta: {
        chainId,
        sender: '',
        gasLimit: 150000,
        gasPrice: 1e-8,
        ttl: 600,
        creationTime: Math.floor(Date.now() / 1000),
      },
      nonce: String(Date.now()),
    }),
    sigs: [],
    hash: '',
  });
}

async function runLocal(
  apiHost: string,
  networkId: string,
  chainId: string,
  code: string,
): Promise<string> {
  const url = `${apiHost}/chainweb/0.0/${networkId}/chain/${chainId}/pact/api/v1/local`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: buildLocalRequest(networkId, chainId, code),
  });

  if (!res.ok) {
    return `Error ${res.status}: ${await res.text()}`;
  }

  return JSON.stringify(await res.json(), null, 2);
}

export function createPactTools(
  opts: Required<KadenaMcpServerOptions>,
): McpTool[] {
  return [
    {
      name: 'executeLocal',
      description:
        'Run a Pact expression locally (read-only) on a specific chain. Returns the result without submitting a transaction.',
      inputSchema: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'The Pact expression to evaluate',
          },
          chainId: {
            type: 'string',
            description: 'The chain ID to execute on (0-19)',
          },
          networkId: {
            type: 'string',
            description: 'Network ID (default: mainnet01)',
          },
        },
        required: ['code', 'chainId'],
      },
      handler: async (params) => {
        const { code, chainId, networkId = opts.networkId } = params as {
          code: string;
          chainId: string;
          networkId?: string;
        };

        try {
          return await runLocal(opts.apiHost, networkId, chainId, code);
        } catch (err) {
          return `Failed to execute Pact code: ${String(err)}`;
        }
      },
    },

    {
      name: 'describeModule',
      description:
        'Describe a deployed Pact module — its functions, capabilities, schemas, and constants.',
      inputSchema: {
        type: 'object',
        properties: {
          module: {
            type: 'string',
            description: 'The fully-qualified module name (e.g. "coin", "free.trade-service")',
          },
          chainId: {
            type: 'string',
            description: 'The chain ID (0-19)',
          },
          networkId: {
            type: 'string',
            description: 'Network ID (default: mainnet01)',
          },
        },
        required: ['module', 'chainId'],
      },
      handler: async (params) => {
        const { module, chainId, networkId = opts.networkId } = params as {
          module: string;
          chainId: string;
          networkId?: string;
        };

        try {
          return await runLocal(
            opts.apiHost,
            networkId,
            chainId,
            `(describe-module "${module}")`,
          );
        } catch (err) {
          return `Failed to describe module: ${String(err)}`;
        }
      },
    },

    {
      name: 'listModules',
      description: 'List all deployed Pact modules on a specific chain.',
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

        try {
          return await runLocal(
            opts.apiHost,
            networkId,
            chainId,
            '(list-modules)',
          );
        } catch (err) {
          return `Failed to list modules: ${String(err)}`;
        }
      },
    },
  ];
}
