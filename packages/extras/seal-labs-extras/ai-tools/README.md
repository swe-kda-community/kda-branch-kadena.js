# @kadena/ai-tools

AI and LLM utilities for building intelligent Kadena blockchain agents.

## Installation

```bash
npm install @kadena/ai-tools
# or
pnpm add @kadena/ai-tools
```

For Vercel AI SDK integration (optional):
```bash
npm install ai zod
```

## Overview

`@kadena/ai-tools` provides a suite of utilities for building AI-powered applications on the Kadena blockchain. It includes:

- **AI Tools** — Vercel AI SDK-compatible tool definitions for querying accounts, building transactions, and interacting with the Kadena network
- **System Prompts** — Pre-built system prompt templates for Kadena AI agents
- **Format Utilities** — Helpers to format blockchain data for LLM consumption

## Network Endpoints

| Network | API | Explorer |
|---------|-----|----------|
| Mainnet (`mainnet01`) | `https://api.chainweb-community.org` | `https://explorer.chainweb-community.org` |
| Testnet (`testnet06`) | `https://api.testnet.chainweb-community.org` | `https://explorer.chainweb-community.org` |
| Local dev | `http://localhost:8080` | — |

Additional mainnet bootstrap nodes: `fr-1.chainweb-community.org`, `nl-1.chainweb-community.org`, `pl-1.chainweb-community.org`, `pl-2.chainweb-community.org`, `ca-1.chainweb-community.org`

Documentation: [kda-chain.org/docs](https://kda-chain.org/docs)

## Usage

### Account Tool

```typescript
import { accountToolDefinition } from '@kadena/ai-tools';

// Use with Vercel AI SDK
const result = await accountToolDefinition.execute({
  accountName: 'k:abcdef1234...',
  chainId: '0',
  networkId: 'mainnet01',
  // defaults to https://api.chainweb-community.org
});
```

### Network Tool

```typescript
import { networkToolDefinition } from '@kadena/ai-tools';

const info = await networkToolDefinition.execute({
  networkId: 'mainnet01',
  // defaults to https://api.chainweb-community.org
});

// Testnet
const testInfo = await networkToolDefinition.execute({
  networkId: 'testnet06',
  // defaults to https://api.testnet.chainweb-community.org
});
```

### System Prompts

```typescript
import { getKadenaSystemPrompt } from '@kadena/ai-tools';

const systemPrompt = getKadenaSystemPrompt({
  networkId: 'mainnet01',
  capabilities: ['transfer', 'query'],
});
```

### Format Utilities

```typescript
import { formatBalance, formatTransaction } from '@kadena/ai-tools';

const humanReadable = formatBalance(10.5);
// => "10.50000000 KDA"
```

## API Reference

### Tools

| Tool | Description |
|------|-------------|
| `accountTool` | Get account details and balance from the Kadena blockchain |
| `transactionTool` | Build and describe Kadena transactions |
| `networkTool` | Get network and chain information |
| `pactTool` | Execute local Pact queries |

### Types

| Type | Description |
|------|-------------|
| `KadenaAgentContext` | Context object passed to AI agent tools |
| `ChainConfig` | Chain-specific configuration |
| `NetworkConfig` | Network configuration |

## License

BSD-3-Clause
