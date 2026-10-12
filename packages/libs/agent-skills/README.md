# @kadena/agent-skills

> Pre-built A2A (Agent-to-Agent) skills for Kadena blockchain operations

[![npm version](https://img.shields.io/npm/v/@kadena/agent-skills)](https://www.npmjs.com/package/@kadena/agent-skills)
[![License](https://img.shields.io/badge/license-BSD--3--Clause-blue)](LICENSE)

Part of the [kadena.js](https://github.com/kda-community/kadena.js) monorepo.

## Overview

`@kadena/agent-skills` provides a collection of composable, typed **skills** — discrete capabilities that AI agents can use to interact with the Kadena blockchain. Skills follow a uniform `AgentSkill<TInput, TOutput>` interface and are fully validated using [Zod](https://zod.dev).

**Available skill categories:**

| Category | Skills |
|---|---|
| `wallet` | `getBalance`, `accountExists`, `describeTransfer` |
| `defi` | `getSwapQuote` *(stub)*, `describeLiquidity` |
| `contracts` | `describeModule`, `listModules` |
| `monitoring` | `pollTransaction`, `getBlockHeight` |

## Installation

```bash
pnpm add @kadena/agent-skills
```

## Quick Start

```typescript
import {
  createSkillRegistry,
  DEFAULT_CONTEXT,
  getBalanceSkill,
  pollTransactionSkill,
} from '@kadena/agent-skills';

// Create a registry with selected skills
const registry = createSkillRegistry([getBalanceSkill, pollTransactionSkill]);

// Define execution context
const context = {
  networkId: 'mainnet01',
  chainId: '0',
  apiHost: 'https://api.chainweb-community.org',
};

// Execute a skill
const result = await getBalanceSkill.execute(
  { account: 'k:abcdef1234567890...' },
  context,
);

if (result.success) {
  console.log(`Balance: ${result.data?.balance} KDA`);
} else {
  console.error(`Error: ${result.error}`);
}
```

## Skill Interface

```typescript
interface AgentSkill<TInput, TOutput> {
  id: string;
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  execute(input: TInput, context: SkillContext): Promise<SkillResult<TOutput>>;
}

interface SkillContext {
  networkId: string;   // 'mainnet01' | 'testnet06'
  chainId: string;     // '0' - '19'
  apiHost?: string;    // defaults to https://api.chainweb-community.org
  signerAccount?: string;
}
```

## Network Endpoints

| Network | Endpoint |
|---|---|
| Mainnet | `https://api.chainweb-community.org` |
| Testnet (testnet06) | `https://api.testnet.chainweb-community.org` |

```typescript
import { DEFAULT_CONTEXT } from '@kadena/agent-skills';
// DEFAULT_CONTEXT.apiHost === 'https://api.chainweb-community.org'
// DEFAULT_CONTEXT.networkId === 'mainnet01'
```

## Skill Imports

```typescript
// All skills
import { ALL_SKILLS, createSkillRegistry } from '@kadena/agent-skills';

// Individual skill categories
import { walletSkills } from '@kadena/agent-skills';
import { defiSkills } from '@kadena/agent-skills';
import { contractSkills } from '@kadena/agent-skills';
import { monitoringSkills } from '@kadena/agent-skills';
```

## Resources

- [Kadena Docs](https://kda-chain.org/docs)
- [Explorer](https://explorer.chainweb-community.org)
- [kda-community GitHub](https://github.com/kda-community)
