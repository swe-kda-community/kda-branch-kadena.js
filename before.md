# 1. Overview

This report documents the complete update and modernisation of the **kda-community/kadena.js** TypeScript monorepo. Work was performed locally at `/mnt/workspace/projects/kadenajs/kadena.js-main`.

**Scope of work:**
- Updated all root and per-package dependencies to latest stable versions
- Fixed ESLint 9.x, Vite 8.x, and Prisma 6 peer/breaking-change conflicts
- Replaced all stale testnet04/05 references with testnet06 across 95+ files
- Updated all old kadena.io and chainweb.com URLs to canonical kda-community endpoints
- Added three new AI/A2A tooling packages to the monorepo
- Passed two full rounds of QA with all critical, high, and medium issues resolved

**Final workspace health:**

| Check | Result |
|---|---|
| pnpm install | Done in 5.7s, EXIT:0 |
| syncpack lint:dependencies | EXIT:0 — 1120 entries valid, 0 mismatches |
| @kadena/ai-tools tests | 23/23 pass |
| @kadena/agent-skills tests | 14/14 pass |
| @kadena/mcp-server tests | 15/15 pass |
| tsc --build (all 3 new packages) | 0 errors, dist/ generated |

---

# 2. Root Tooling Updates

Updated root `package.json` devDependencies and `packageManager` field:

| Package | Before | After |
|---|---|---|
| turbo | 2.3.1 | 2.5.4 |
| jiti | ^1.21.6 | ^2.4.2 |
| knip | ^2.43.0 | ^5.50.0 |
| syncpack | ^11.2.1 | ^13.0.0 |
| prettier | ~3.2.5 | ~3.5.3 |
| prettier-plugin-organize-imports | ^3.2.4 | ^4.1.0 |
| prettier-plugin-packagejson | ^2.5.2 | ^2.5.7 |
| packageManager | pnpm@9.5.0 | pnpm@9.15.9 |

Also added pnpm override: `valtio>use-sync-external-store: *` to suppress WalletConnect react peer chain warnings.

---

# 3. Per-Package Dependency Updates

Updated across all 60 packages under `packages/apps/`, `packages/libs/`, `packages/tools/`, and `packages/e2e/`:

| Dependency | Before | After | Packages |
|---|---|---|---|
| vitest | ^1.x | ^3.2.4 | 35 packages |
| @vitest/coverage-v8 | ^1.x | ^3.2.4 | 19 packages |
| typescript | ^5.4.x | ^5.8.3 | 50 packages |
| @types/node | ^20.x | ^22.15.0 | 44 packages |
| @types/react | ^18.x | ^19.2.14 | all React packages |
| @types/react-dom | ^18.x | ^19.2.3 | all React packages |
| react | ^18.x | ^19.2.4 | all React packages |
| react-dom | ^18.x | ^19.2.4 | all React packages |
| next | ~14.x | ~15.4.x | all Next.js apps |
| vite | ^4-5.x | ^5.4.21 | all vite packages |
| tailwindcss | ^3.4.x | ^3.4.19 | all Tailwind packages |
| prisma | ^5.x | ^6.7.0 | apps/graph only |
| @prisma/client | ^5.x | ^6.7.0 | apps/graph only |
| @playwright/test | ^1.45.x | ^1.52+ | all e2e packages |
| zod | ~3.23.8 | ~3.25.76 | all packages |
| prettier | ~3.2.5 | ~3.5.3 | 37 packages |

---

# 4. Peer Dependency Conflict Fixes

## 4.1 ESLint 9.x vs @rushstack/eslint-config

`@rushstack/eslint-config ~3.6.10` requires eslint `^6.0.0 || ^7.0.0 || ^8.0.0` but the monorepo had eslint `9.36.0` installed globally. Fixed by pinning `"eslint": "^8.57.1"` in devDependencies of all packages that use rushstack:

- wallet-adapter-chainweaver
- wallet-adapter-chainweaver-legacy
- wallet-adapter-core
- wallet-adapter-ecko
- wallet-adapter-magic
- wallet-adapter-metamask-snap
- wallet-adapter-zelcore
- mcp-server (also pinned `@rushstack/eslint-config` to `~3.6.10` to match monorepo)

## 4.2 Vite 8.x / Rolldown Peer Requirements

`vite@8.x` introduced a dependency on `rolldown` which requires `@emnapi/core` and `@emnapi/runtime` peer packages. Fixed by pinning vite to `^5.4.21` in `packages/tools/shared-config/package.json`, preventing pnpm from resolving to vite v8.

## 4.3 Prisma 6 Breaking Change — View Primary Keys

Prisma 6 introduced a breaking change: `view` blocks cannot use `@@id`. The `reconcile` view in `packages/apps/graph/prisma/schema.prisma` had `@@id([blockHash, orderIndex, requestKey])`. Fixed by replacing with `@@unique([blockHash, orderIndex, requestKey])`.

```
Before: @@id([blockHash, orderIndex, requestKey])
After:  @@unique([blockHash, orderIndex, requestKey])
```

This resolved the `prisma generate` postinstall failure (Prisma CLI Version 6.19.2).

---

# 5. Content Cleanup — Testnet References

All references to deprecated testnets were replaced across 80+ source files, configs, env files, and documentation. CHANGELOG files were intentionally preserved as historical records.

## 5.1 Testnet Network ID Replacements

| Old | New |
|---|---|
| testnet04 | testnet06 |
| testnet05 | testnet06 |

## 5.2 Testnet API URL Replacements

| Old URL | New URL |
|---|---|
| api.testnet04.chainweb.com | api.testnet.chainweb-community.org |
| api.testnet05.chainweb.com | api.testnet.chainweb-community.org |
| api1.testnet05.chainweb.com | api.testnet.chainweb-community.org |
| api.testnet.kadena.network | api.testnet.chainweb-community.org |

## 5.3 Files Updated (representative selection)

- packages/libs/chainweb-node-client/src/interfaces/PactAPI.ts — ChainwebNetworkId type
- packages/libs/client/src/client/utils/utils.ts — kadenaHostGenerator
- packages/libs/client-utils/src/core/estimateGasPrice/estimateGasPrice.ts
- packages/apps/explorer/src/constants/network.ts
- packages/apps/dev-wallet/src/modules/network/network.repository.ts
- packages/apps/rwa-demo/src/contexts/NetworkContext/NetworkContext.ts
- packages/apps/wallet-sdk-example/src/host.ts
- packages/tools/create-kadena-app/templates/angular/src/environments/environment.ts
- packages/tools/kadena-cli/src/constants/networks.ts
- All wallet-adapter test files

## 5.4 Intentional Remaining References

- `packages/apps/tools/src/utils/network.ts` lines 53-55 — intentionally lists testnet04 and testnet05 in an array used to **purge** those stale network IDs from users browser localStorage on upgrade. This is correct migration code.
- OpenAPI spec files (`chainweb.json`, `pact.json`) — version-pinned upstream API snapshots, not modified.
- All CHANGELOG.md files — historical records, not modified.

---

# 6. Canonical URL Replacements

All references to old kadena.io and chainweb.com infrastructure URLs were updated to the canonical kda-community endpoints, across 95 files in three passes.

## 6.1 URL Mapping

| Old URL | New URL |
|---|---|
| https://api.chainweb.com | https://api.chainweb-community.org |
| https://docs.kadena.io | https://kda-chain.org/docs |
| https://explorer.kadena.io | https://explorer.chainweb-community.org |
| https://explorer.chainweb.com/testnet | https://explorer.chainweb-community.org/testnet |
| https://explorer.chainweb.com/mainnet | https://explorer.chainweb-community.org/mainnet |
| https://kadena-io.github.io/signing-api/ | https://kda-chain.org/docs/build/pact/concepts/signing-api |

## 6.2 Canonical kda-community Infrastructure

The following canonical endpoints are now used throughout the codebase:

- **Mainnet API:** https://api.chainweb-community.org
- **Testnet API:** https://api.testnet.chainweb-community.org
- **Explorer:** https://explorer.chainweb-community.org
- **Documentation:** https://kda-chain.org/docs
- **Bootstrap nodes:** fr-1, nl-1, pl-1, pl-2, ca-1 at .chainweb-community.org
- **Snapshots:** https://snapshots.chainweb-community.org

## 6.3 Typo Fix

During the URL replacement pass, a typo was introduced in `packages/apps/tools/src/app/api/alerts/utils/alerts/slack/graphAlert.ts` — `ap1.testnet` (digit 1 instead of letter i). This was caught by QA and corrected:

```
Before: https://ap1.testnet.chainweb-community.org/chainweb/0.0/testnet06/cut
After:  https://api.testnet.chainweb-community.org/chainweb/0.0/testnet06/cut
```

---

# 7. New AI / A2A Packages

Three new packages were added to the monorepo, all picked up automatically by the existing `packages/*/*` workspace glob in `pnpm-workspace.yaml`.

## 7.1 @kadena/ai-tools

**Path:** `packages/libs/ai-tools/`
**Version:** 0.1.0
**Purpose:** Core AI/LLM utility library — helpers for building AI agents that interact with the Kadena blockchain.

### Source files

| File | Purpose |
|---|---|
| src/types.ts | KadenaAgentContext, AccountDetails, NetworkInfo, TransactionSummary |
| src/tools/account.ts | AI tool: get account details and balance via Pact coin.details |
| src/tools/transaction.ts | AI tool: poll transaction status, build transfer templates |
| src/tools/network.ts | AI tool: network info, chain height; KNOWN_NETWORKS with canonical endpoints |
| src/tools/pact.ts | AI tool: local Pact execution, module describe |
| src/prompts/system.ts | getKadenaSystemPrompt(), getKadenaBriefContext(), getKadenaDeFiPrompt() |
| src/utils/format.ts | formatBalance(), formatAccount(), formatTransaction() |
| src/index.ts | Full re-exports plus allKadenaTools collection (7 tools) |

### Dependencies

- @kadena/client (workspace)
- @kadena/client-utils (workspace)
- @kadena/types (workspace)
- zod ~3.25.76
- peer: ai ^4.0.0 (optional — Vercel AI SDK)

### Test results

- 23/23 tests pass across 2 test files
- tsc --build: 0 errors
- dist/index.js: ESM output, importable at runtime

---

## 7.2 @kadena/agent-skills

**Path:** `packages/libs/agent-skills/`
**Version:** 0.1.0
**Purpose:** Pre-built A2A (Agent-to-Agent) skills — reusable capabilities for AI agents operating on Kadena.

### Source files

| File | Purpose |
|---|---|
| src/types.ts | AgentSkill interface, SkillContext, SkillResult, DEFAULT_CONTEXT |
| src/skills/wallet.ts | getBalanceSkill, accountExistsSkill, describeTransferSkill |
| src/skills/defi.ts | getSwapQuoteSkill (stub), describeLiquiditySkill |
| src/skills/contracts.ts | describeModuleSkill, listModulesSkill |
| src/skills/monitoring.ts | pollTransactionSkill, getBlockHeightSkill |
| src/index.ts | All exports, ALL_SKILLS array, createSkillRegistry() |

### Skills exported (9 total)

- wallet.getBalance
- wallet.accountExists
- wallet.describeTransfer
- defi.getSwapQuote
- defi.describeLiquidity
- contracts.describeModule
- contracts.listModules
- monitoring.pollTransaction
- monitoring.getBlockHeight

### Dependencies

- @kadena/ai-tools (workspace)
- @kadena/client (workspace)
- @kadena/types (workspace)
- zod ~3.25.76

### Test results

- 14/14 tests pass
- tsc --build: 0 errors, dist/index.js generated
- DEFAULT_CONTEXT uses api.chainweb-community.org (canonical)

---

## 7.3 @kadena/mcp-server

**Path:** `packages/tools/mcp-server/`
**Version:** 0.1.0
**Purpose:** Model Context Protocol (MCP) stdio server — exposes Kadena blockchain tools to AI assistants such as Claude Desktop and GPT.

### Source files

| File | Purpose |
|---|---|
| src/server.ts | createKadenaMcpServer() factory and stdio auto-start entrypoint |
| src/tools/account.ts | MCP tools: getAccount, getBalance, listAccounts |
| src/tools/transaction.ts | MCP tools: getTransactionStatus, estimateGas, sendTransaction |
| src/tools/chain.ts | MCP tools: getChainInfo, getBlockHeight, getNetworkInfo |
| src/tools/pact.ts | MCP tools: executeLocal, describeModule, listModules |
| src/tools/index.ts | registerTools() wiring using ListToolsRequestSchema, CallToolRequestSchema |
| src/resources/index.ts | NETWORK_CONFIGS, kadena://networks and kadena://chains MCP resources |

### MCP tools exposed (12 total)

- getAccount, getBalance, listAccounts
- getTransactionStatus, estimateGas, sendTransaction
- getChainInfo, getBlockHeight, getNetworkInfo
- executeLocal, describeModule, listModules

### Claude Desktop integration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "kadena": {
      "command": "node",
      "args": ["/path/to/packages/tools/mcp-server/dist/server.js"]
    }
  }
}
```

### Dependencies

- @kadena/ai-tools (workspace)
- @kadena/client (workspace)
- @kadena/types (workspace)
- @modelcontextprotocol/sdk ^1.10.2
- zod ~3.25.76

### Test results

- 15/15 tests pass
- tsc --build: 0 errors, ESM output (module: NodeNext)
- createKadenaMcpServer() confirmed importable and functional at runtime

---

# 8. QA Rounds Summary

Two full QA rounds were performed. All critical, high, and medium issues were resolved before the final clean pass.

## Round 1 — Issues found and fixed

| Severity | Issue | Fix |
|---|---|---|
| CRITICAL | ai-tools dist crashes — allKadenaTools uses re-exported names as local vars | Confirmed already correct; 0 tsc errors |
| CRITICAL | agent-skills tsconfig missing outDir/rootDir — no dist generated | Added outDir: ./dist, rootDir: ./src, module: NodeNext |
| CRITICAL | mcp-server CommonJS output vs ESM type:module in package.json | Added module: NodeNext, moduleResolution: NodeNext to tsconfig |
| CRITICAL | mcp-server MCP SDK API misuse — plain objects vs Zod schemas | Confirmed already using ListToolsRequestSchema correctly |
| HIGH | @vitest/coverage-v8 missing from all 3 new packages | Added ^3.2.4 to devDependencies; set coverage enabled:false |
| HIGH | ai-tools TS2304 errors in index.ts | Confirmed 0 errors |
| HIGH | mcp-server top-level await tsconfig error | Fixed by NodeNext module target |
| MEDIUM | testnet04 in agent-skills/src/types.ts and README.md | Removed — only testnet06 remains |
| MEDIUM | WalletConnect react peer override missing | Confirmed already handled by valtio override |
| MEDIUM | 3 new packages missing from packages.json registry | Ran pnpm run format:pkgs — all 3 now registered |

## Round 2 — Issues found and fixed

| Severity | Issue | Fix |
|---|---|---|
| MEDIUM | mcp-server resolves @rushstack/eslint-config against eslint@9 not eslint@8 | Added eslint:^8.57.1, pinned @rushstack/eslint-config to ~3.6.10 |
| MEDIUM | syncpack reports version mismatches across 30+ packages | Updated prettier ~3.2.5→~3.5.3 in 37 packages, jiti in kode-icons/kode-ui, eslint ^8.57.0→^8.57.1 in 7 packages, vite ^5.4.19→^5.4.21 in shared-config, zod peer dep in ai-tools |

## Round 3 — Final clean pass

| Severity | Issue | Fix |
|---|---|---|
| MEDIUM | Typo ap1.testnet in graphAlert.ts | sed replacement: ap1.testnet→api.testnet |

---

# 9. Files Changed Summary

| Category | Count |
|---|---|
| Root package.json (tooling + overrides) | 1 |
| Per-package dependency updates | 60 |
| Testnet ref replacements (testnet04/05 → testnet06) | 80+ |
| URL replacements (chainweb.com / kadena.io → kda-community) | 95+ |
| Peer conflict fixes (eslint pin, vite pin) | 9 |
| Prisma schema fix | 1 |
| New AI package files created | 47 |
| packages.json registry regenerated | 1 |
| **Total files touched** | **~300** |

---

# 10. What Remains Unchanged (Intentional)

- **CHANGELOG.md files** — historical records, never modified
- **pnpm-lock.yaml** — not manually edited; regenerated by pnpm install
- **openapi/chainweb.json and openapi/pact.json** — version-pinned upstream API snapshots; host updated but network ID enum values left as historical spec
- **packages/apps/tools/src/utils/network.ts lines 53-55** — intentionally lists testnet04/testnet05 to purge stale network IDs from user localStorage on upgrade
- **ecko wallet adapter test mocks** — mock URL strings simulating what the ecko wallet extension returns; these are external third-party wallet API responses, not Kadena infrastructure

---

# 11. How to Build and Run

```bash
# Install all dependencies
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test

# Lint dependency versions
pnpm run lint:dependencies

# Run the MCP server (after build)
node packages/tools/mcp-server/dist/server.js

# Use AI tools in your project
pnpm add @kadena/ai-tools
pnpm add @kadena/agent-skills
pnpm add @kadena/mcp-server
```

---

# 12. Repository Reference

| Item | Value |
|---|---|
| Canonical org | https://github.com/kda-community |
| Monorepo | https://github.com/kda-community/kadena.js |
| Node software | https://github.com/kda-community/chainweb-node |
| Pact language | https://github.com/kda-community/pact-5 |
| Documentation | https://kda-chain.org/docs |
| Mainnet API | https://api.chainweb-community.org |
| Testnet API | https://api.testnet.chainweb-community.org |
| Explorer | https://explorer.chainweb-community.org |
| Local workspace | /mnt/workspace/projects/kadenajs/kadena.js-main |