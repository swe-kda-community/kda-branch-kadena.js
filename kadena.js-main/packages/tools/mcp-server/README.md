# @kadena/mcp-server

MCP (Model Context Protocol) server that exposes Kadena blockchain tools to AI assistants such as Claude, Cursor, and any MCP-compatible client.

## Overview

The [Model Context Protocol](https://modelcontextprotocol.io) is an open standard that allows AI assistants to call external tools and access structured resources. `@kadena/mcp-server` bridges the gap between large language models and the Kadena blockchain, providing read/write capabilities through a clean, typed interface.

With this package an AI assistant can:

- Query account balances and details across any of Kadena's 20 chains
- Inspect transaction status by request key
- Execute arbitrary Pact expressions locally (read-only)
- Describe deployed smart contracts and list on-chain modules
- Fetch live network and block-height data
- Access canonical network configuration for mainnet and testnet

## Installation

```bash
pnpm add @kadena/mcp-server
```

## Claude Desktop Integration

Add the following to your `claude_desktop_config.json` (usually at `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "kadena": {
      "command": "npx",
      "args": ["@kadena/mcp-server"],
      "env": {
        "KADENA_NETWORK_ID": "mainnet01",
        "KADENA_API_HOST": "https://api.chainweb-community.org"
      }
    }
  }
}
```

Restart Claude Desktop and you will see the Kadena tools available in the tools panel.

## Available Tools

### Account Tools

| Tool | Description |
|------|-------------|
| `getAccount` | Fetch full account details from the `coin` module (guard, balance, etc.) |
| `getBalance` | Fetch the KDA balance for an account on a specific chain |
| `listAccounts` | Educational content about Kadena account conventions and the `k:` prefix |

### Transaction Tools

| Tool | Description |
|------|-------------|
| `getTransactionStatus` | Poll for a transaction's result by request key |
| `estimateGas` | Gas model documentation and estimation guidance |
| `sendTransaction` | Step-by-step guide to building and submitting signed transactions |

### Chain / Network Tools

| Tool | Description |
|------|-------------|
| `getChainInfo` | Latest block header for a specific chain |
| `getBlockHeight` | Current block height for a specific chain |
| `getNetworkInfo` | Full cut (global consensus) across all 20 chains |

### Pact Tools

| Tool | Description |
|------|-------------|
| `executeLocal` | Run any Pact expression locally (read-only, no gas required) |
| `describeModule` | Inspect a deployed Pact module's functions and capabilities |
| `listModules` | List all deployed modules on a chain |

## Available Resources

Resources provide structured, machine-readable data that AI clients can reference.

| URI | Description |
|-----|-------------|
| `kadena://networks` | Mainnet and testnet configs: API hosts, explorer, bootstrap nodes |
| `kadena://chains` | List of all chain IDs (0-19) |

### Network Configuration

```json
{
  "mainnet01": {
    "networkId": "mainnet01",
    "apiHost": "https://api.chainweb-community.org",
    "explorer": "https://explorer.chainweb-community.org",
    "bootstrapNodes": [
      "fr-1.chainweb-community.org",
      "nl-1.chainweb-community.org",
      "pl-1.chainweb-community.org",
      "pl-2.chainweb-community.org",
      "ca-1.chainweb-community.org"
    ],
    "snapshots": "https://snapshots.chainweb-community.org",
    "chains": ["0", "1", "...", "19"]
  },
  "testnet06": {
    "networkId": "testnet06",
    "apiHost": "https://api.testnet.chainweb-community.org",
    "explorer": "https://explorer.chainweb-community.org"
  }
}
```

## Configuration

The server reads the following environment variables at startup:

| Variable | Default | Description |
|----------|---------|-------------|
| `KADENA_NETWORK_ID` | `mainnet01` | Kadena network identifier |
| `KADENA_API_HOST` | `https://api.chainweb-community.org` | Chainweb API base URL |

To target testnet:

```bash
KADENA_NETWORK_ID=testnet06 \
KADENA_API_HOST=https://api.testnet.chainweb-community.org \
npx @kadena/mcp-server
```

## Usage with Vercel AI SDK

```typescript
import { experimental_createMCPClient as createMCPClient } from 'ai';
import { Experimental_StdioMCPTransport as StdioMCPTransport } from 'ai/mcp-stdio';

const client = await createMCPClient({
  transport: new StdioMCPTransport({
    command: 'npx',
    args: ['@kadena/mcp-server'],
    env: {
      KADENA_NETWORK_ID: 'mainnet01',
      KADENA_API_HOST: 'https://api.chainweb-community.org',
    },
  }),
});

// List available tools
const tools = await client.tools();

// Use with generateText
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const { text } = await generateText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  tools,
  prompt: 'What is the current block height on Kadena chain 0?',
});
```

## Programmatic API

```typescript
import { createKadenaMcpServer } from '@kadena/mcp-server';

const server = createKadenaMcpServer({
  networkId: 'mainnet01',
  apiHost: 'https://api.chainweb-community.org',
  chainIds: ['0', '1', '2'],
});
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run tests
pnpm test

# Type-check only
pnpm typecheck

# Run the server directly
pnpm start

# Watch mode (requires built output)
pnpm dev
```

## Links

- Documentation: https://kda-chain.org/docs
- Block Explorer: https://explorer.chainweb-community.org
- Mainnet API: https://api.chainweb-community.org
- Testnet API: https://api.testnet.chainweb-community.org
- Kadena.js monorepo: https://github.com/kadena-community/kadena.js

## License

BSD-3-Clause
