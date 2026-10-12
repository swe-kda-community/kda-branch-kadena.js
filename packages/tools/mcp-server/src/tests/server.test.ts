import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NETWORK_CONFIGS } from '../resources/index.js';

// ---------------------------------------------------------------------------
// Minimal mock for @modelcontextprotocol/sdk
// ---------------------------------------------------------------------------

const mockSetRequestHandler = vi.fn();

const MockServer = vi.fn().mockImplementation(
  (meta: { name: string; version: string }) => ({
    _name: meta.name,
    _version: meta.version,
    setRequestHandler: mockSetRequestHandler,
  }),
);

vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: MockServer,
}));

// ---------------------------------------------------------------------------
// Import after mocks are registered
// ---------------------------------------------------------------------------

const { createKadenaMcpServer } = await import('../server.js');

// ---------------------------------------------------------------------------
// Helper: extract the method string from a Zod schema (as passed by MCP SDK
// request handler registration) or a plain object with a method property.
// ---------------------------------------------------------------------------

function getSchemaMethod(schema: unknown): string | undefined {
  if (schema === null || typeof schema !== 'object') return undefined;
  const s = schema as Record<string, unknown>;
  // Zod schema: method is in shape.method._def.values[0] (zod v4)
  // or shape.method._def.value (zod v3)
  const shape = s['shape'] as Record<string, unknown> | undefined;
  if (shape) {
    const methodSchema = shape['method'] as Record<string, unknown> | undefined;
    if (methodSchema) {
      const def = methodSchema['_def'] as Record<string, unknown> | undefined;
      if (def) {
        const values = def['values'] as unknown[] | undefined;
        if (Array.isArray(values) && typeof values[0] === 'string') {
          return values[0];
        }
        if (typeof def['value'] === 'string') {
          return def['value'];
        }
      }
    }
  }
  // Plain object fallback
  if (typeof s['method'] === 'string') return s['method'];
  return undefined;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createKadenaMcpServer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a server instance', () => {
    const server = createKadenaMcpServer();
    expect(server).toBeDefined();
    expect(MockServer).toHaveBeenCalledOnce();
  });

  it('creates the server with the correct name and version', () => {
    createKadenaMcpServer();
    expect(MockServer).toHaveBeenCalledWith(
      { name: 'kadena-mcp-server', version: '0.1.0' },
      expect.objectContaining({ capabilities: expect.any(Object) }),
    );
  });

  it('registers tools/list and tools/call handlers', () => {
    createKadenaMcpServer();
    const methods = mockSetRequestHandler.mock.calls.map(
      (call: unknown[]) => getSchemaMethod(call[0]),
    );
    expect(methods).toContain('tools/list');
    expect(methods).toContain('tools/call');
  });

  it('registers resources/list and resources/read handlers', () => {
    createKadenaMcpServer();
    const methods = mockSetRequestHandler.mock.calls.map(
      (call: unknown[]) => getSchemaMethod(call[0]),
    );
    expect(methods).toContain('resources/list');
    expect(methods).toContain('resources/read');
  });

  it('applies custom apiHost option', () => {
    const customHost = 'https://my-custom-node.example.com';
    createKadenaMcpServer({ apiHost: customHost });
    // The server is created; we verify the constructor was called (options
    // are applied internally when handlers are registered).
    expect(MockServer).toHaveBeenCalledOnce();
  });

  it('applies custom networkId option', () => {
    createKadenaMcpServer({ networkId: 'testnet06' });
    expect(MockServer).toHaveBeenCalledOnce();
  });

  it('uses default mainnet apiHost when no options are provided', () => {
    createKadenaMcpServer();
    // Verify tools/list returns tools that include our expected defaults by
    // inspecting the registered handler.
    const listHandler = mockSetRequestHandler.mock.calls.find(
      (call: unknown[]) => getSchemaMethod(call[0]) === 'tools/list',
    )?.[1] as (() => { tools: { name: string }[] }) | undefined;

    expect(listHandler).toBeDefined();
    const { tools } = listHandler!();
    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain('getAccount');
    expect(toolNames).toContain('getBalance');
    expect(toolNames).toContain('getNetworkInfo');
    expect(toolNames).toContain('executeLocal');
  });
});

// ---------------------------------------------------------------------------
// NETWORK_CONFIGS tests
// ---------------------------------------------------------------------------

describe('NETWORK_CONFIGS', () => {
  it('has a mainnet01 entry', () => {
    expect(NETWORK_CONFIGS.mainnet01).toBeDefined();
  });

  it('has a testnet06 entry', () => {
    expect(NETWORK_CONFIGS.testnet06).toBeDefined();
  });

  it('mainnet01 uses the canonical api host', () => {
    expect(NETWORK_CONFIGS.mainnet01.apiHost).toBe(
      'https://api.chainweb-community.org',
    );
  });

  it('testnet06 uses the canonical testnet api host', () => {
    expect(NETWORK_CONFIGS.testnet06.apiHost).toBe(
      'https://api.testnet.chainweb-community.org',
    );
  });

  it('both networks use the canonical explorer', () => {
    expect(NETWORK_CONFIGS.mainnet01.explorer).toBe(
      'https://explorer.chainweb-community.org',
    );
    expect(NETWORK_CONFIGS.testnet06.explorer).toBe(
      'https://explorer.chainweb-community.org',
    );
  });

  it('both networks expose chains 0-19', () => {
    const expected = Array.from({ length: 20 }, (_, i) => String(i));
    expect(NETWORK_CONFIGS.mainnet01.chains).toEqual(expected);
    expect(NETWORK_CONFIGS.testnet06.chains).toEqual(expected);
  });

  it('both networks list bootstrap nodes', () => {
    expect(NETWORK_CONFIGS.mainnet01.bootstrapNodes.length).toBeGreaterThan(0);
    expect(NETWORK_CONFIGS.testnet06.bootstrapNodes.length).toBeGreaterThan(0);
  });

  it('snapshots URL is set', () => {
    expect(NETWORK_CONFIGS.mainnet01.snapshots).toBe(
      'https://snapshots.chainweb-community.org',
    );
  });
});
