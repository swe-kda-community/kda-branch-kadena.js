import { describe, expect, it } from 'vitest';
import { accountToolDefinition, accountToolSchema } from '../tools/account.js';
import { buildTransferTemplate, transferBuildSchema } from '../tools/transaction.js';
import { networkToolDefinition, KNOWN_NETWORKS } from '../tools/network.js';
import { pactToolDefinition } from '../tools/pact.js';
import { getKadenaSystemPrompt, getKadenaBriefContext } from '../prompts/system.js';
import { allKadenaTools } from '../index.js';

describe('accountToolDefinition', () => {
  it('has the required properties', () => {
    expect(accountToolDefinition.description).toBeTruthy();
    expect(accountToolDefinition.parameters).toBeDefined();
    expect(typeof accountToolDefinition.execute).toBe('function');
  });

  it('validates account schema', () => {
    const valid = accountToolSchema.safeParse({
      accountName: 'k:abc123',
      chainId: '0',
      networkId: 'mainnet01',
    });
    expect(valid.success).toBe(true);
  });

  it('rejects invalid schema', () => {
    const invalid = accountToolSchema.safeParse({});
    expect(invalid.success).toBe(false);
  });
});

describe('buildTransferTemplate', () => {
  it('builds a valid transfer template', () => {
    const template = buildTransferTemplate({
      sender: 'k:sender',
      receiver: 'k:receiver',
      amount: 10.0,
      chainId: '0',
      networkId: 'mainnet01',
    });
    const parsed = JSON.parse(template);
    expect(parsed.networkId).toBe('mainnet01');
    expect(parsed.payload.exec.code).toContain('coin.transfer');
    expect(parsed.payload.exec.code).toContain('k:sender');
    expect(parsed.payload.exec.code).toContain('k:receiver');
  });

  it('validates transfer schema', () => {
    const valid = transferBuildSchema.safeParse({
      sender: 'k:abc',
      receiver: 'k:def',
      amount: 1.0,
      chainId: '1',
    });
    expect(valid.success).toBe(true);
  });
});

describe('KNOWN_NETWORKS', () => {
  it('has mainnet01 with community endpoints', () => {
    expect(KNOWN_NETWORKS.mainnet01).toBeDefined();
    expect(KNOWN_NETWORKS.mainnet01.chainCount).toBe(20);
    expect(KNOWN_NETWORKS.mainnet01.hosts[0]).toBe('https://api.chainweb-community.org');
    expect(KNOWN_NETWORKS.mainnet01.explorerUrl).toBe('https://explorer.chainweb-community.org');
  });

  it('has testnet06 with community endpoints', () => {
    expect(KNOWN_NETWORKS.testnet06).toBeDefined();
    expect(KNOWN_NETWORKS.testnet06.chainCount).toBe(20);
    expect(KNOWN_NETWORKS.testnet06.hosts[0]).toBe('https://api.testnet.chainweb-community.org');
  });

  it('includes bootstrap nodes for mainnet01', () => {
    const { hosts } = KNOWN_NETWORKS.mainnet01;
    expect(hosts).toContain('https://fr-1.chainweb-community.org');
    expect(hosts).toContain('https://nl-1.chainweb-community.org');
    expect(hosts).toContain('https://pl-1.chainweb-community.org');
    expect(hosts).toContain('https://pl-2.chainweb-community.org');
    expect(hosts).toContain('https://ca-1.chainweb-community.org');
  });
});

describe('getKadenaSystemPrompt', () => {
  it('generates a prompt with default options', () => {
    const prompt = getKadenaSystemPrompt();
    expect(prompt).toContain('Kadena');
    expect(prompt).toContain('mainnet01');
    expect(prompt).toContain('Pact');
    expect(prompt).toContain('api.chainweb-community.org');
    expect(prompt).toContain('kda-chain.org/docs');
  });

  it('includes capabilities when provided', () => {
    const prompt = getKadenaSystemPrompt({
      capabilities: ['transfer', 'query'],
    });
    expect(prompt).toContain('transfer');
    expect(prompt).toContain('query');
  });

  it('references testnet06 for testnet network', () => {
    const prompt = getKadenaSystemPrompt({ networkId: 'testnet06' });
    expect(prompt).toContain('testnet06');
    expect(prompt).toContain('api.testnet.chainweb-community.org');
  });
});

describe('getKadenaBriefContext', () => {
  it('generates a brief context with community endpoint', () => {
    const brief = getKadenaBriefContext('testnet06');
    expect(brief).toContain('testnet06');
    expect(brief).toContain('Kadena');
    expect(brief).toContain('api.chainweb-community.org');
  });
});

describe('allKadenaTools', () => {
  it('exports all expected tools', () => {
    expect(allKadenaTools.getAccount).toBeDefined();
    expect(allKadenaTools.getTransaction).toBeDefined();
    expect(allKadenaTools.buildTransfer).toBeDefined();
    expect(allKadenaTools.getNetworkInfo).toBeDefined();
    expect(allKadenaTools.getChainHeight).toBeDefined();
    expect(allKadenaTools.executePact).toBeDefined();
    expect(allKadenaTools.describeModule).toBeDefined();
  });
});
