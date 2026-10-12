import { describe, it, expect } from 'vitest';
import {
  ALL_SKILLS,
  createSkillRegistry,
  DEFAULT_CONTEXT,
  getBalanceSkill,
  accountExistsSkill,
  describeTransferSkill,
  getSwapQuoteSkill,
  describeLiquiditySkill,
  describeModuleSkill,
  listModulesSkill,
  pollTransactionSkill,
  getBlockHeightSkill,
} from '../index.js';

describe('@kadena/agent-skills', () => {
  describe('exports', () => {
    it('exports all skills in ALL_SKILLS array', () => {
      expect(ALL_SKILLS).toBeDefined();
      expect(Array.isArray(ALL_SKILLS)).toBe(true);
      expect(ALL_SKILLS.length).toBeGreaterThan(0);
    });

    it('all skills have required properties', () => {
      for (const skill of ALL_SKILLS) {
        expect(skill.id).toBeDefined();
        expect(typeof skill.id).toBe('string');
        expect(skill.name).toBeDefined();
        expect(skill.description).toBeDefined();
        expect(skill.inputSchema).toBeDefined();
        expect(typeof skill.execute).toBe('function');
      }
    });

    it('has no duplicate skill IDs', () => {
      const ids = ALL_SKILLS.map((s) => s.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });
  });

  describe('createSkillRegistry', () => {
    it('creates a registry with all skills by default', () => {
      const registry = createSkillRegistry();
      expect(registry.size).toBe(ALL_SKILLS.length);
    });

    it('creates a registry with custom skill subset', () => {
      const registry = createSkillRegistry([getBalanceSkill]);
      expect(registry.size).toBe(1);
      expect(registry.has('wallet.getBalance')).toBe(true);
    });

    it('retrieves skills by ID', () => {
      const registry = createSkillRegistry();
      expect(registry.get('wallet.getBalance')).toBeDefined();
      expect(registry.get('wallet.accountExists')).toBeDefined();
      expect(registry.get('defi.getSwapQuote')).toBeDefined();
      expect(registry.get('contracts.describeModule')).toBeDefined();
      expect(registry.get('monitoring.pollTransaction')).toBeDefined();
    });
  });

  describe('DEFAULT_CONTEXT', () => {
    it('has correct mainnet defaults', () => {
      expect(DEFAULT_CONTEXT.networkId).toBe('mainnet01');
      expect(DEFAULT_CONTEXT.chainId).toBe('0');
      expect(DEFAULT_CONTEXT.apiHost).toBe('https://api.chainweb-community.org');
    });
  });

  describe('wallet skills', () => {
    it('getBalanceSkill has correct schema', () => {
      expect(getBalanceSkill.id).toBe('wallet.getBalance');
      const parsed = getBalanceSkill.inputSchema.safeParse({
        account: 'k:abc123',
      });
      expect(parsed.success).toBe(true);
    });

    it('accountExistsSkill validates input', () => {
      const valid = accountExistsSkill.inputSchema.safeParse({
        account: 'k:abc',
      });
      expect(valid.success).toBe(true);
      const invalid = accountExistsSkill.inputSchema.safeParse({ account: '' });
      expect(invalid.success).toBe(false);
    });

    it('describeTransferSkill returns description without network call', async () => {
      const result = await describeTransferSkill.execute(
        { from: 'k:sender', to: 'k:recipient', amount: 1.5 },
        DEFAULT_CONTEXT,
      );
      expect(result.success).toBe(true);
      expect(result.data?.description).toContain('1.5 KDA');
      expect(result.data?.requiresSignature).toBe(true);
    });
  });

  describe('defi skills', () => {
    it('getSwapQuoteSkill returns stub error (no DEX connected)', async () => {
      const result = await getSwapQuoteSkill.execute(
        { inputToken: 'coin', outputToken: 'free.some-token', inputAmount: 10 },
        DEFAULT_CONTEXT,
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('DEX integration required');
    });

    it('describeLiquiditySkill returns description', async () => {
      const result = await describeLiquiditySkill.execute(
        { token0: 'coin', token1: 'free.token', amount0: 100, amount1: 200 },
        DEFAULT_CONTEXT,
      );
      expect(result.success).toBe(true);
      expect(result.data?.pool).toBe('coin/free.token');
    });
  });

  describe('skill input validation', () => {
    it('describeTransferSkill rejects negative amounts', () => {
      const parsed = describeTransferSkill.inputSchema.safeParse({
        from: 'k:a',
        to: 'k:b',
        amount: -1,
      });
      expect(parsed.success).toBe(false);
    });

    it('getSwapQuoteSkill validates slippage range', () => {
      const valid = getSwapQuoteSkill.inputSchema.safeParse({
        inputToken: 'coin',
        outputToken: 'free.token',
        inputAmount: 1,
        slippage: 0.5,
      });
      expect(valid.success).toBe(true);

      const invalid = getSwapQuoteSkill.inputSchema.safeParse({
        inputToken: 'coin',
        outputToken: 'free.token',
        inputAmount: 1,
        slippage: 101,
      });
      expect(invalid.success).toBe(false);
    });
  });
});
