/**
 * MCP tools for Kadena transaction operations.
 */

import type { KadenaMcpServerOptions } from '../server.js';
import type { McpTool } from './index.js';

export function createTransactionTools(
  opts: Required<KadenaMcpServerOptions>,
): McpTool[] {
  return [
    {
      name: 'getTransactionStatus',
      description:
        'Poll for the status of a submitted Kadena transaction by its request key.',
      inputSchema: {
        type: 'object',
        properties: {
          requestKey: {
            type: 'string',
            description: 'The transaction request key (base64url hash)',
          },
          chainId: {
            type: 'string',
            description: 'The chain ID the transaction was submitted to (0-19)',
          },
          networkId: {
            type: 'string',
            description: 'Network ID (default: mainnet01)',
          },
        },
        required: ['requestKey', 'chainId'],
      },
      handler: async (params) => {
        const {
          requestKey,
          chainId,
          networkId = opts.networkId,
        } = params as {
          requestKey: string;
          chainId: string;
          networkId?: string;
        };

        const url = `${opts.apiHost}/chainweb/0.0/${networkId}/chain/${chainId}/pact/api/v1/poll`;

        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestKeys: [requestKey] }),
          });

          if (!res.ok) {
            return `Error ${res.status}: ${await res.text()}`;
          }

          const data = (await res.json()) as Record<string, unknown>;
          const result = data[requestKey];

          if (result === undefined) {
            return `Transaction ${requestKey} is still pending or not found on chain ${chainId}.`;
          }

          return JSON.stringify(result, null, 2);
        } catch (err) {
          return `Failed to poll transaction status: ${String(err)}`;
        }
      },
    },

    {
      name: 'estimateGas',
      description:
        'Get guidance on Kadena gas model and how to estimate gas for transactions.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
      handler: async () => {
        return [
          '# Kadena Gas Model',
          '',
          '## Overview',
          'Kadena uses a gas model similar to Ethereum but with some key differences:',
          '- **Gas price** (`gasPrice`): The price in KDA per unit of gas. Typical values: `1e-8` to `1e-6`.',
          '- **Gas limit** (`gasLimit`): Maximum gas units allowed for the transaction. Typical: `600` to `150000`.',
          '- **Total fee** = gasPrice × gasUsed (capped at gasLimit).',
          '',
          '## Typical Gas Costs',
          '| Operation              | Approx. Gas |',
          '|------------------------|-------------|',
          '| Simple KDA transfer    | 300-600     |',
          '| Coin crosschain init   | 600-1 000   |',
          '| Contract deployment    | 5 000-50 000|',
          '| Complex contract call  | 1 000-30 000|',
          '',
          '## How to Estimate',
          '1. Use the `/local` endpoint (executeLocal tool) with your Pact code.',
          '   The response includes `gas` — the actual gas consumed.',
          '2. Set your `gasLimit` slightly above the `/local` gas value (e.g. +20%).',
          '3. Set `gasPrice` based on network conditions; `1e-8` is usually sufficient.',
          '',
          '## Gas Station Accounts',
          'Kadena supports gas stations — accounts that pay gas on behalf of users.',
          'A gas station implements the `gas-payer-v1` interface in Pact.',
          '',
          '## Resources',
          '- Docs: https://kda-chain.org/docs',
          '- Explorer (inspect txs): https://explorer.chainweb-community.org',
        ].join('\n');
      },
    },

    {
      name: 'sendTransaction',
      description:
        'Learn how to construct and send a signed Kadena transaction.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
      handler: async () => {
        return [
          '# Sending Kadena Transactions',
          '',
          'Sending a transaction to Kadena requires off-chain signing, which involves a wallet or',
          'signing key material. The MCP server intentionally does NOT handle private keys.',
          '',
          '## Steps to Send a Transaction',
          '',
          '### 1. Build the command envelope',
          'Use `@kadena/client` to create the transaction:',
          '```typescript',
          'import { Pact, createClient } from "@kadena/client";',
          '',
          'const tx = Pact.builder',
          '  .execution(Pact.modules.coin.transfer("k:sender", "k:receiver", { decimal: "1.0" }))',
          '  .addSigner("senderPublicKey", (withCap) => [',
          '    withCap("coin.TRANSFER", "k:sender", "k:receiver", { decimal: "1.0" }),',
          '    withCap("coin.GAS"),',
          '  ])',
          '  .setMeta({ chainId: "0", sender: "k:senderPublicKey" })',
          '  .setNetworkId("mainnet01")',
          '  .createTransaction();',
          '```',
          '',
          '### 2. Sign the transaction',
          'Use a wallet (e.g. Chainweaver, Ecko Wallet) or a signing key:',
          '```typescript',
          'import { sign } from "@kadena/cryptography-utils";',
          '',
          'const sig = sign(tx.cmd, { publicKey, secretKey });',
          'tx.sigs = [{ sig: sig.sig }];',
          '```',
          '',
          '### 3. Submit via /send endpoint',
          `\`POST ${opts.apiHost}/chainweb/0.0/mainnet01/chain/0/pact/api/v1/send\``,
          '```json',
          '{ "cmds": [{ "hash": "...", "sigs": [...], "cmd": "..." }] }',
          '```',
          '',
          '### 4. Poll for result',
          'Use the `getTransactionStatus` tool with the returned request key.',
          '',
          '## Resources',
          '- @kadena/client: https://github.com/kadena-community/kadena.js',
          '- Docs: https://kda-chain.org/docs',
          '- Explorer: https://explorer.chainweb-community.org',
        ].join('\n');
      },
    },
  ];
}
