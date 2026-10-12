import { z } from 'zod';
import type { AgentSkill, SkillContext, SkillResult } from '../types.js';

export interface ModuleInfo {
  name: string;
  hash: string;
  interfaces: string[];
  blessed: string[];
}

export interface LocalQueryResult {
  status: 'success' | 'failure';
  data: unknown;
  gas: number;
  logs?: string;
}

/**
 * Skill: Describe a Pact module
 */
export const describeModuleSkill: AgentSkill<
  { moduleName: string; chainId?: string },
  ModuleInfo
> = {
  id: 'contracts.describeModule',
  name: 'Describe Pact Module',
  description:
    'Retrieves information about a deployed Pact module (smart contract) on Kadena',
  inputSchema: z.object({
    moduleName: z
      .string()
      .min(1)
      .describe('Fully qualified Pact module name (e.g., "coin", "free.my-token")'),
    chainId: z.string().optional().describe('Chain ID to query (0-19)'),
  }),
  async execute(
    input: { moduleName: string; chainId?: string },
    context: SkillContext,
  ): Promise<SkillResult<ModuleInfo>> {
    const chainId = input.chainId ?? context.chainId;
    const apiHost =
      context.apiHost ?? 'https://api.chainweb-community.org';

    try {
      const networkPath = `chainweb/0.0/${context.networkId}/chain/${chainId}/pact`;
      const url = `${apiHost}/${networkPath}/api/v1/local`;

      const cmd = {
        networkId: context.networkId,
        payload: {
          exec: {
            data: {},
            code: `(describe-module "${input.moduleName}")`,
          },
        },
        signers: [],
        meta: {
          creationTime: Math.floor(Date.now() / 1000),
          ttl: 600,
          gasLimit: 2500,
          chainId,
          gasPrice: 1.0e-8,
          sender: '',
        },
        nonce: Date.now().toString(),
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd: JSON.stringify(cmd), hash: '', sigs: [] }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `API error: ${response.status} ${response.statusText}`,
        };
      }

      const result = (await response.json()) as {
        result?: {
          status: string;
          data?: { name?: string; hash?: string; interfaces?: string[]; blessed?: string[] };
        };
      };

      if (result.result?.status === 'success' && result.result.data) {
        return {
          success: true,
          data: {
            name: result.result.data.name ?? input.moduleName,
            hash: result.result.data.hash ?? '',
            interfaces: result.result.data.interfaces ?? [],
            blessed: result.result.data.blessed ?? [],
          },
        };
      }

      return { success: false, error: `Module "${input.moduleName}" not found` };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  },
};

/**
 * Skill: List available Pact modules on a chain
 */
export const listModulesSkill: AgentSkill<
  { chainId?: string },
  { modules: string[]; count: number }
> = {
  id: 'contracts.listModules',
  name: 'List Pact Modules',
  description: 'Lists all deployed Pact modules (smart contracts) on a chain',
  inputSchema: z.object({
    chainId: z.string().optional().describe('Chain ID to query (0-19)'),
  }),
  async execute(
    input: { chainId?: string },
    context: SkillContext,
  ): Promise<SkillResult<{ modules: string[]; count: number }>> {
    const chainId = input.chainId ?? context.chainId;
    const apiHost =
      context.apiHost ?? 'https://api.chainweb-community.org';

    try {
      const networkPath = `chainweb/0.0/${context.networkId}/chain/${chainId}/pact`;
      const url = `${apiHost}/${networkPath}/api/v1/local`;

      const cmd = {
        networkId: context.networkId,
        payload: {
          exec: { data: {}, code: '(list-modules)' },
        },
        signers: [],
        meta: {
          creationTime: Math.floor(Date.now() / 1000),
          ttl: 600,
          gasLimit: 150000,
          chainId,
          gasPrice: 1.0e-8,
          sender: '',
        },
        nonce: Date.now().toString(),
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd: JSON.stringify(cmd), hash: '', sigs: [] }),
      });

      if (!response.ok) {
        return { success: false, error: `API error: ${response.status}` };
      }

      const result = (await response.json()) as {
        result?: { status: string; data?: string[] };
      };

      if (result.result?.status === 'success' && Array.isArray(result.result.data)) {
        return {
          success: true,
          data: {
            modules: result.result.data,
            count: result.result.data.length,
          },
        };
      }

      return { success: false, error: 'Failed to list modules' };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  },
};

export const contractSkills = [describeModuleSkill, listModulesSkill] as const;
