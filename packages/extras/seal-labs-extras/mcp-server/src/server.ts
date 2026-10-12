#!/usr/bin/env node
/**
 * Kadena MCP Server
 *
 * Creates and starts an MCP server that exposes Kadena blockchain tools
 * to AI assistants via the Model Context Protocol.
 */

import {
  Server as McpServer,
} from '@modelcontextprotocol/sdk/server/index.js';
import type { StdioServerTransport as McpStdioTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerResources } from './resources/index.js';
import { registerTools } from './tools/index.js';

export interface KadenaMcpServerOptions {
  /** Kadena network identifier. Defaults to 'mainnet01'. */
  networkId?: string;
  /** Chainweb API host. Defaults to 'https://api.chainweb-community.org'. */
  apiHost?: string;
  /** Chain IDs to expose. Defaults to chains 0-19. */
  chainIds?: string[];
}

const DEFAULT_OPTIONS: Required<KadenaMcpServerOptions> = {
  networkId: 'mainnet01',
  apiHost: 'https://api.chainweb-community.org',
  chainIds: Array.from({ length: 20 }, (_, i) => String(i)),
};

export function createKadenaMcpServer(
  options: KadenaMcpServerOptions = {},
): McpServer {
  const resolved: Required<KadenaMcpServerOptions> = {
    ...DEFAULT_OPTIONS,
    ...Object.fromEntries(
      Object.entries(options).filter(([, v]) => v !== undefined),
    ),
  };

  const server = new McpServer(
    { name: 'kadena-mcp-server', version: '0.1.0' },
    { capabilities: { tools: {}, resources: {} } },
  );

  registerTools(server, resolved);
  registerResources(server, resolved);

  return server;
}

// Auto-start when executed directly.
const isMain =
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith('server.js') ||
    process.argv[1].endsWith('server.ts'));

if (isMain) {
  const options: Required<KadenaMcpServerOptions> = {
    networkId: process.env['KADENA_NETWORK_ID'] ?? DEFAULT_OPTIONS.networkId,
    apiHost: process.env['KADENA_API_HOST'] ?? DEFAULT_OPTIONS.apiHost,
    chainIds: DEFAULT_OPTIONS.chainIds,
  };

  const server = createKadenaMcpServer(options);

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { StdioServerTransport } = require(
    '@modelcontextprotocol/sdk/server/stdio.js',
  ) as { StdioServerTransport: new () => McpStdioTransport };

  const transport = new StdioServerTransport();

  (server as unknown as { connect: (t: McpStdioTransport) => Promise<void> })
    .connect(transport)
    .then(() => {
      process.stderr.write('Kadena MCP server started (stdio)\n');
    })
    .catch((err: unknown) => {
      process.stderr.write(`Failed to start server: ${String(err)}\n`);
      process.exit(1);
    });
}
