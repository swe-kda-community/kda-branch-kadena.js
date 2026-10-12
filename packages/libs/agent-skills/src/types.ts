import { z } from 'zod';

/**
 * Context passed to every agent skill execution
 */
export interface SkillContext {
  /** Kadena network ID: 'mainnet01' | 'testnet06' */
  networkId: string;
  /** Chain ID (0-19) */
  chainId: string;
  /** API base URL — defaults to mainnet */
  apiHost?: string;
  /** Optional signer account for transaction skills */
  signerAccount?: string;
}

/**
 * Result returned by every skill execution
 */
export interface SkillResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Base interface all agent skills must implement
 */
export interface AgentSkill<TInput = unknown, TOutput = unknown> {
  /** Unique skill identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this skill does */
  description: string;
  /** Zod schema for input validation */
  inputSchema: z.ZodType<TInput>;
  /** Execute the skill */
  execute(input: TInput, context: SkillContext): Promise<SkillResult<TOutput>>;
}

/**
 * Skill registry maps skill IDs to skill implementations
 */
export type SkillRegistry = Map<string, AgentSkill>;

/**
 * Configuration for creating a skill set
 */
export interface SkillSetConfig {
  networkId?: string;
  chainId?: string;
  apiHost?: string;
}

export const DEFAULT_CONTEXT: SkillContext = {
  networkId: 'mainnet01',
  chainId: '0',
  apiHost: 'https://api.chainweb-community.org',
};
