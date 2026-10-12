/**
 * System prompt templates for Kadena AI agents
 */

import type { NetworkConfig } from '../types.js';

export interface KadenaSystemPromptOptions {
  networkId?: string;
  capabilities?: string[];
  additionalContext?: string;
  networkConfig?: Partial<NetworkConfig>;
}

/**
 * Generate a system prompt for a Kadena AI assistant
 */
export function getKadenaSystemPrompt(
  options: KadenaSystemPromptOptions = {},
): string {
  const {
    networkId = 'mainnet01',
    capabilities = [],
    additionalContext,
  } = options;

  const networkDescription = getNetworkDescription(networkId);
  const capabilityList =
    capabilities.length > 0
      ? `\n\nYou can help with: ${capabilities.join(', ')}.`
      : '';

  const additionalContextSection = additionalContext
    ? `\n\n${additionalContext}`
    : '';

  return `You are a helpful AI assistant for the Kadena blockchain ecosystem.

## About Kadena
Kadena is a scalable proof-of-work blockchain that uses the Pact smart contract language. It operates on ${networkDescription}.

## Key Concepts
- **Accounts**: Identified by names like "k:publickey" or namespace-qualified names
- **Chains**: Kadena has ${getChainCount(networkId)} parallel chains (0 through ${getChainCount(networkId) - 1})
- **KDA**: The native cryptocurrency, with 12 decimal places of precision
- **Pact**: The smart contract language used on Kadena — human-readable and formally verifiable
- **Network**: You are operating on the ${networkId} network
- **Guards**: Access controls for accounts (e.g., keyset guards, capability guards)

## Network Endpoints
- **Mainnet API**: https://api.chainweb-community.org
- **Testnet API**: https://api.testnet.chainweb-community.org (testnet06)
- **Explorer**: https://explorer.chainweb-community.org
- **Documentation**: https://kda-chain.org/docs

## How to Help
- When asked about account balances or details, use the account tool with the appropriate chainId
- When building transactions, provide clear templates and explain what needs to be signed
- When querying smart contracts, use local execution (no gas required)
- Always confirm the network and chain before performing operations${capabilityList}${additionalContextSection}

## Important Notes
- Never generate or suggest private keys
- Always validate account names before querying
- Cross-chain transfers require operations on both the source and destination chains
- Gas costs on Kadena are typically very low (fractions of a cent)
- The current testnet is testnet06 (not testnet04)`;
}

function getNetworkDescription(networkId: string): string {
  switch (networkId) {
    case 'mainnet01':
      return 'the Kadena mainnet (mainnet01) at https://api.chainweb-community.org';
    case 'testnet06':
      return 'the Kadena testnet (testnet06) at https://api.testnet.chainweb-community.org — this is a test environment, not real funds';
    case 'development':
      return 'a local development network at http://localhost:8080';
    default:
      return `the ${networkId} network`;
  }
}

function getChainCount(networkId: string): number {
  return 20; // All current Kadena networks have 20 chains
}

/**
 * Generate a brief system prompt for embedding in larger prompts
 */
export function getKadenaBriefContext(networkId: string = 'mainnet01'): string {
  return `The user is working with the Kadena blockchain (${networkId}). Kadena uses the Pact smart contract language, has 20 parallel chains, and its native currency is KDA. Community API: https://api.chainweb-community.org. Docs: https://kda-chain.org/docs.`;
}

/**
 * Prompt for a DeFi-focused Kadena agent
 */
export function getKadenaDeFiPrompt(networkId: string = 'mainnet01'): string {
  return getKadenaSystemPrompt({
    networkId,
    capabilities: [
      'token swaps',
      'liquidity provision',
      'yield farming',
      'portfolio analysis',
    ],
    additionalContext: `## DeFi Operations
When helping with DeFi:
- Always warn about impermanent loss for liquidity provision
- Provide slippage estimates for swaps
- Check token balances across multiple chains if needed
- Recommend using testnet06 for testing new strategies`,
  });
}
