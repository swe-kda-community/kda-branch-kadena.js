/**
 * Registers all Kadena MCP tools with the server.
 */

import { Server as McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import type { KadenaMcpServerOptions } from '../server.js';
import { createAccountTools } from './account.js';
import { createChainTools } from './chain.js';
import { createPactTools } from './pact.js';
import { createTransactionTools } from './transaction.js';

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
  handler: (params: Record<string, unknown>) => Promise<string>;
}

export function registerTools(
  server: McpServer,
  opts: Required<KadenaMcpServerOptions>,
): void {
  const tools: McpTool[] = [
    ...createAccountTools(opts),
    ...createTransactionTools(opts),
    ...createChainTools(opts),
    ...createPactTools(opts),
  ];

  // Register tools/list handler
  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  // Register tools/call handler
  server.setRequestHandler(
    CallToolRequestSchema,
    async (req) => {
      const { name, arguments: args = {} } = req.params;
      const tool = tools.find((t) => t.name === name);

      if (!tool) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        };
      }

      const text = await tool.handler(args as Record<string, unknown>);
      return { content: [{ type: 'text', text }] };
    },
  );
}
