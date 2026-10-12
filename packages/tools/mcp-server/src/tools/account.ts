/**
 * MCP tools for Kadena account operations.
 */

import type { KadenaMcpServerOptions } from '../server.js';
import type { McpTool } from './index.js';

function pactLocalUrl(
  apiHost: string,
  networkId: string,
  chainId: string,
): string {
  return `${apiHost}/chainweb/0.0/${networkId}/chain/${chainId}/pact/api/v1/local`;
}

async function pactLocal(
  apiHost: string,
  networkId: string,
  chainId: string,
  code: string,
): Promise<string> {
  const url = pactLocalUrl(apiHost, networkId, chainId);
  const body = JSON.stringify({
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

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!res.ok) {
    return `Error ${res.status}: ${await res.text()}`;
  }
  return JSON.stringify(await res.json(), null, 2);
}

export function createAccountTools(
  opts: Required<KadenaMcpServerOptions>,
): McpTool[] {
  return [
    {
      name: 'getAccount',
      description:
        'Fetch full account details from the Kadena coin module for a given account and chain.',
      inputSchema: {
        type: 'object',
        properties: {
          account: {
            type: 'string',
            description: 'The account name (e.g. k:abc123...)',
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
        required: ['account', 'chainId'],
      },
      handler: async (params) => {
        const { account, chainId, networkId = opts.networkId } = params as {
          account: string;
          chainId: string;
          networkId?: string;
        };
        try {
          const result = await pactLocal(
            opts.apiHost,
            networkId,
            chainId,
            `(coin.details "${account}")`,
          );
          return result;
        } catch (err) {
          return `Failed to fetch account details: ${String(err)}`;
        }
      },
    },

    {
      name: 'getBalance',
      description: 'Fetch the KDA balance for an account on a specific chain.',
      inputSchema: {
        type: 'object',
        properties: {
          account: {
            type: 'string',
            description: 'The account name (e.g. k:abc123...)',
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
        required: ['account', 'chainId'],
      },
      handler: async (params) => {
        const { account, chainId, networkId = opts.networkId } = params as {
          account: string;
          chainId: string;
          networkId?: string;
        };
        try {
          const result = await pactLocal(
            opts.apiHost,
            networkId,
            chainId,
            `(coin.get-balance "${account}")`,
          );
          return result;
        } catch (err) {
          return `Failed to fetch balance: ${String(err)}`;
        }
      },
    },

    {
      name: 'listAccounts',
      description:
        'Learn about Kadena account conventions, including the k: prefix accounts and guard-based ownership.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
      handler: async () => {
        return [
          '# Kadena Account Conventions',
          '',
          'Kadena uses a guard-based account model defined in the `coin` contract.',
          '',
          '## Account Name Format',
          '- Accounts are arbitrary strings up to 256 characters.',
          '- The most common format is `k:<public-key>` where `<public-key>` is a 64-character hex Ed25519 key.',
          '  Example: `k:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789ab`',
          '- Protocol prefixes like `k:` signal the guard type; `k:` accounts use a single Ed25519 keyset.',
          '- Custom account names are also valid (e.g., exchange accounts, contract-owned accounts).',
          '',
          '## Guards',
          '- Every account is secured by a *guard* — a Pact capability predicate.',
          '- A keyset guard requires one or more public keys plus a predicate (keys-all, keys-any, keys-2).',
          '- Accounts can also be guarded by Pact capabilities or user guards for advanced logic.',
          '',
          '## Multi-Chain',
          '- KDA balances are per-chain; an account on chain 0 is independent from chain 1.',
          '- Cross-chain transfers use the `coin.transfer-crosschain` flow with a SPV proof.',
          '',
          '## Useful Pact Expressions',
          '- Balance:  `(coin.get-balance "k:...")`',
          '- Details:  `(coin.details "k:...")`',
          '- Accounts are created with `(coin.create-account "k:..." (read-keyset "ks"))`.',
        ].join('\n');
      },
    },
  ];
}
