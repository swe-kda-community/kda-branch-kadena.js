/**
 * Utility functions for formatting blockchain data for LLM consumption
 */

import type { AccountDetails, NetworkInfo, TransactionSummary } from '../types.js';

/**
 * Format a KDA balance as a human-readable string
 */
export function formatBalance(balance: number): string {
  return `${balance.toFixed(8)} KDA`;
}

/**
 * Format an account for human-readable output
 */
export function formatAccount(account: AccountDetails): string {
  const guardKeys = account.guard.keys.join(', ');
  const guardPred = account.guard.pred;
  
  return [
    `Account: ${account.account}`,
    `Balance: ${formatBalance(account.balance)}`,
    `Chain: ${account.chainId}`,
    `Network: ${account.networkId}`,
    `Guard: ${guardPred} (keys: ${guardKeys})`,
  ].join('\n');
}

/**
 * Format a transaction for LLM consumption
 */
export function formatTransaction(tx: TransactionSummary): string {
  const lines = [
    `Status: ${tx.status}`,
    `Chain: ${tx.chainId}`,
    `Network: ${tx.networkId}`,
    `Sender: ${tx.sender}`,
  ];

  if (tx.receiver) lines.push(`Receiver: ${tx.receiver}`);
  if (tx.amount !== undefined) lines.push(`Amount: ${formatBalance(tx.amount)}`);
  if (tx.hash) lines.push(`Hash: ${tx.hash}`);
  if (tx.gas !== undefined) lines.push(`Gas: ${tx.gas}`);
  lines.push(`Description: ${tx.description}`);

  return lines.join('\n');
}

/**
 * Format network info for LLM consumption
 */
export function formatNetworkInfo(info: NetworkInfo): string {
  return [
    `Network ID: ${info.networkId}`,
    `Chain Count: ${info.chainCount}`,
    `API Version: ${info.apiVersion}`,
    ...(info.nodeVersion ? [`Node Version: ${info.nodeVersion}`] : []),
    `Hosts: ${info.hosts.join(', ')}`,
  ].join('\n');
}

/**
 * Truncate a long hash for display
 */
export function truncateHash(hash: string, length: number = 8): string {
  if (hash.length <= length * 2) return hash;
  return `${hash.slice(0, length)}...${hash.slice(-length)}`;
}

/**
 * Format a Pact value for LLM-friendly display
 */
export function formatPactValue(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value.toString();
  return JSON.stringify(value, null, 2);
}
