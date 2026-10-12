import { z } from 'zod';
import type { AgentSkill, SkillContext, SkillResult } from '../types.js';

export interface TransactionStatus {
  requestKey: string;
  status: 'pending' | 'success' | 'failure' | 'unknown';
  result?: unknown;
  gas?: number;
  logs?: string;
  events?: unknown[];
}

export interface BlockInfo {
  height: number;
  hash: string;
  chainId: string;
  creationTime: number;
  txCount: number;
}

/**
 * Skill: Poll a transaction by request key
 */
export const pollTransactionSkill: AgentSkill<
  { requestKey: string; chainId?: string },
  TransactionStatus
> = {
  id: 'monitoring.pollTransaction',
  name: 'Poll Transaction',
  description: 'Checks the status of a submitted Kadena transaction by request key',
  inputSchema: z.object({
    requestKey: z
      .string()
      .min(1)
      .describe('Transaction request key (base64url hash)'),
    chainId: z.string().optional().describe('Chain ID where the transaction was submitted'),
  }),
  async execute(
    input: { requestKey: string; chainId?: string },
    context: SkillContext,
  ): Promise<SkillResult<TransactionStatus>> {
    const chainId = input.chainId ?? context.chainId;
    const apiHost =
      context.apiHost ?? 'https://api.chainweb-community.org';

    try {
      const networkPath = `chainweb/0.0/${context.networkId}/chain/${chainId}/pact`;
      const url = `${apiHost}/${networkPath}/api/v1/poll`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestKeys: [input.requestKey] }),
      });

      if (!response.ok) {
        return { success: false, error: `API error: ${response.status}` };
      }

      const results = (await response.json()) as Record<
        string,
        { result?: { status: string; data?: unknown }; gas?: number; logs?: string; events?: unknown[] }
      >;
      const txResult = results[input.requestKey];

      if (!txResult) {
        return {
          success: true,
          data: { requestKey: input.requestKey, status: 'pending' },
        };
      }

      return {
        success: true,
        data: {
          requestKey: input.requestKey,
          status:
            txResult.result?.status === 'success'
              ? 'success'
              : txResult.result?.status === 'failure'
              ? 'failure'
              : 'unknown',
          result: txResult.result?.data,
          gas: txResult.gas,
          logs: txResult.logs,
          events: txResult.events,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  },
};

/**
 * Skill: Get current block height for a chain
 */
export const getBlockHeightSkill: AgentSkill<
  { chainId?: string },
  BlockInfo
> = {
  id: 'monitoring.getBlockHeight',
  name: 'Get Block Height',
  description: 'Gets the current block height and latest block info for a chain',
  inputSchema: z.object({
    chainId: z.string().optional().describe('Chain ID (0-19)'),
  }),
  async execute(
    input: { chainId?: string },
    context: SkillContext,
  ): Promise<SkillResult<BlockInfo>> {
    const chainId = input.chainId ?? context.chainId;
    const apiHost =
      context.apiHost ?? 'https://api.chainweb-community.org';

    try {
      const url = `${apiHost}/chainweb/0.0/${context.networkId}/chain/${chainId}/header/branch`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ upper: [], lower: [] }),
      });

      if (!response.ok) {
        return { success: false, error: `API error: ${response.status}` };
      }

      const data = (await response.json()) as {
        items?: Array<{ height?: number; hash?: string; creationTime?: number; txCount?: number }>;
      };
      const latest = data.items?.[0];

      if (!latest) {
        return { success: false, error: 'No block data returned' };
      }

      return {
        success: true,
        data: {
          height: latest.height ?? 0,
          hash: latest.hash ?? '',
          chainId,
          creationTime: latest.creationTime ?? 0,
          txCount: latest.txCount ?? 0,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  },
};

export const monitoringSkills = [
  pollTransactionSkill,
  getBlockHeightSkill,
] as const;
