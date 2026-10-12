/**
 * Shared types for Kadena AI tools
 */

export type ChainId = string;
export type NetworkId = 'mainnet01' | 'testnet06' | 'development' | string;

/**
 * Configuration for a specific chain
 */
export interface ChainConfig {
  chainId: ChainId;
  host: string;
  networkId: NetworkId;
}

/**
 * Network-level configuration
 */
export interface NetworkConfig {
  networkId: NetworkId;
  hosts: string[];
  chains: ChainId[];
  explorerUrl?: string;
}

/**
 * Context object available to all Kadena AI agent tools
 */
export interface KadenaAgentContext {
  network: NetworkConfig;
  defaultChainId?: ChainId;
  apiVersion?: string;
}

/**
 * Result from an AI tool execution
 */
export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Account details returned from the blockchain
 */
export interface AccountDetails {
  account: string;
  balance: number;
  guard: {
    keys: string[];
    pred: string;
  };
  chainId: ChainId;
  networkId: NetworkId;
}

/**
 * Transaction summary for LLM consumption
 */
export interface TransactionSummary {
  hash?: string;
  status: 'pending' | 'success' | 'failure';
  sender: string;
  receiver?: string;
  amount?: number;
  chainId: ChainId;
  networkId: NetworkId;
  gas?: number;
  description: string;
}

/**
 * Pact local query result
 */
export interface PactLocalResult {
  result: unknown;
  gas: number;
  logs?: string;
  reqKey: string;
}

/**
 * Network information
 */
export interface NetworkInfo {
  networkId: NetworkId;
  chainCount: number;
  apiVersion: string;
  nodeVersion?: string;
  hosts: string[];
}
