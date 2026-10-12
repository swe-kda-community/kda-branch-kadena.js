import { describe, expect, it } from 'vitest';
import {
  formatBalance,
  formatAccount,
  formatPactValue,
  truncateHash,
} from '../utils/format.js';
import type { AccountDetails } from '../types.js';

describe('formatBalance', () => {
  it('formats a whole number balance', () => {
    expect(formatBalance(10)).toBe('10.00000000 KDA');
  });

  it('formats a decimal balance', () => {
    expect(formatBalance(1.5)).toBe('1.50000000 KDA');
  });

  it('formats zero', () => {
    expect(formatBalance(0)).toBe('0.00000000 KDA');
  });
});

describe('formatAccount', () => {
  const account: AccountDetails = {
    account: 'k:abcdef1234',
    balance: 100.5,
    guard: {
      keys: ['abcdef1234'],
      pred: 'keys-all',
    },
    chainId: '0',
    networkId: 'mainnet01',
  };

  it('formats account details', () => {
    const result = formatAccount(account);
    expect(result).toContain('k:abcdef1234');
    expect(result).toContain('100.50000000 KDA');
    expect(result).toContain('Chain: 0');
    expect(result).toContain('Network: mainnet01');
    expect(result).toContain('keys-all');
  });
});

describe('truncateHash', () => {
  it('truncates a long hash', () => {
    const hash = 'a'.repeat(64);
    const result = truncateHash(hash, 8);
    expect(result).toBe(`${'a'.repeat(8)}...${'a'.repeat(8)}`);
  });

  it('leaves short hashes unchanged', () => {
    const hash = 'abc123';
    expect(truncateHash(hash, 8)).toBe(hash);
  });
});

describe('formatPactValue', () => {
  it('formats a string', () => {
    expect(formatPactValue('hello')).toBe('hello');
  });

  it('formats a number', () => {
    expect(formatPactValue(42)).toBe('42');
  });

  it('formats null', () => {
    expect(formatPactValue(null)).toBe('null');
  });

  it('formats an object as JSON', () => {
    const result = formatPactValue({ key: 'value' });
    expect(result).toContain('key');
    expect(result).toContain('value');
  });
});
