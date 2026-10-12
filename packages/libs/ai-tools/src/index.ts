/**
 * @kadena/ai-tools
 * AI and LLM utilities for building intelligent Kadena blockchain agents
 */

// Types
export * from './types.js';

// Tools — imported locally so they are available as local bindings for allKadenaTools
import { accountToolDefinition, getAccountDetails, accountToolSchema } from './tools/account.js';
import type { AccountToolInput } from './tools/account.js';
import {
  transactionToolDefinition,
  transferBuildToolDefinition,
  describeTransaction,
  buildTransferTemplate,
  transactionDescribeSchema,
  transferBuildSchema,
} from './tools/transaction.js';
import type { TransactionDescribeInput, TransferBuildInput } from './tools/transaction.js';
import {
  networkToolDefinition,
  chainHeightToolDefinition,
  getNetworkInfo,
  getChainHeight,
  networkInfoSchema,
  chainInfoSchema,
  KNOWN_NETWORKS,
} from './tools/network.js';
import type { NetworkInfoInput, ChainInfoInput } from './tools/network.js';
import {
  pactToolDefinition,
  pactDescribeModuleToolDefinition,
  executePactLocal,
  pactLocalSchema,
  pactDescribeModuleSchema,
} from './tools/pact.js';
import type { PactLocalInput, PactDescribeModuleInput } from './tools/pact.js';

export {
  accountToolDefinition,
  getAccountDetails,
  accountToolSchema,
};
export type { AccountToolInput };

export {
  transactionToolDefinition,
  transferBuildToolDefinition,
  describeTransaction,
  buildTransferTemplate,
  transactionDescribeSchema,
  transferBuildSchema,
};
export type { TransactionDescribeInput, TransferBuildInput };

export {
  networkToolDefinition,
  chainHeightToolDefinition,
  getNetworkInfo,
  getChainHeight,
  networkInfoSchema,
  chainInfoSchema,
  KNOWN_NETWORKS,
};
export type { NetworkInfoInput, ChainInfoInput };

export {
  pactToolDefinition,
  pactDescribeModuleToolDefinition,
  executePactLocal,
  pactLocalSchema,
  pactDescribeModuleSchema,
};
export type { PactLocalInput, PactDescribeModuleInput };

// Prompts
export {
  getKadenaSystemPrompt,
  getKadenaBriefContext,
  getKadenaDeFiPrompt,
} from './prompts/system.js';
export type { KadenaSystemPromptOptions } from './prompts/system.js';

// Utils
export {
  formatBalance,
  formatAccount,
  formatTransaction,
  formatNetworkInfo,
  truncateHash,
  formatPactValue,
} from './utils/format.js';

/**
 * All tool definitions as a collection — useful for registering with an AI SDK
 */
export const allKadenaTools = {
  getAccount: accountToolDefinition,
  getTransaction: transactionToolDefinition,
  buildTransfer: transferBuildToolDefinition,
  getNetworkInfo: networkToolDefinition,
  getChainHeight: chainHeightToolDefinition,
  executePact: pactToolDefinition,
  describeModule: pactDescribeModuleToolDefinition,
} as const;
