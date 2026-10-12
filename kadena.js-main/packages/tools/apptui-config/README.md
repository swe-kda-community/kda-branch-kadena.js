# @kadena/apptui-config

Developer TUI configuration for the **kadena.js** monorepo, powered by [apptui](https://github.com/kda-community/apptui) — a universal terminal UI built with [Bubble Tea](https://github.com/charmbracelet/bubbletea).

---

## What is apptui?

`apptui` is a single Go binary + one JSON config file. It gives any project an interactive TUI with:

- **Floating command palette** (press `/`) — categorised, searchable, keyboard-driven
- **Activity histogram** — tracks Read / Edit / Exec / Token bars in real-time
- **Todo list** — ● done · ◐ active · ○ pending indicators
- **Sidebar tabs** — Overview · Terminals · Agents · Changes
- **Auto / Manual / Plan** mode cycling (`shift+tab`)
- **Live WebSocket backend** — plugs into `@kadena/mcp-server` or any custom server
- **Demo mode** — no backend required (`apptui --demo`)
- Fully responsive — reflows on terminal resize

---

## Install apptui (once, globally)

```bash
# Requires Go 1.21+
go install github.com/kda-community/apptui@latest
```

Or build from source:

```bash
git clone https://github.com/kda-community/apptui
cd apptui
make install
```

The binary is self-contained. No runtime dependencies.

---

## Run from the monorepo root

```bash
# Using the pnpm script (requires apptui on $PATH)
pnpm run tui

# Or run the self-contained ./tui binary (written by apptui init)
./tui

# Demo mode — no backend needed
apptui --demo
```

`apptui` walks up from the current working directory to find `.apptui.json`, so it works from any subdirectory of the monorepo.

---

## Command palette sections

The config ships eight sections, each with logical subsections:

| Section | Subsections | What it does |
|---------|------------|--------------|
| **Run** | Apps, Libs | `pnpm --filter <pkg> dev` for every app and storybook |
| **Build** | Workspace, AI Tools, CLI, Libs | Per-package and workspace-wide turbo builds |
| **Test** | Suite, AI Tools, CLI, Libs, Apps | Vitest + Playwright suites per package |
| **AI Tools** | MCP | Start/watch the MCP server, bulk build/test AI packages |
| **Kadena CLI** | Run, Pact | `kadena-cli`, `create-kadena-app`, `pactjs-cli` |
| **Workspace** | Dependencies, Quality, Release | install, lint, format, knip, changeset, publish |
| **Git** | — | status, log, diff, push |
| **App** | — | Settings, theme, sidebar toggle, shortcuts |

---

## Connecting a backend

The TUI connects to a WebSocket endpoint for live state (todo list, terminals, agents, token stats).
The kadena.js monorepo ships `@kadena/mcp-server` which can serve this endpoint:

```bash
# Build and start the MCP server
pnpm --filter @kadena/mcp-server build
node packages/tools/mcp-server/dist/server.js
```

Without a backend the TUI still fully works — the palette, terminals, and all commands remain available.
The WebSocket reconnects automatically when the backend comes up.

---

## Extending the config

Edit `.apptui.json` at the monorepo root (or `packages/tools/apptui-config/.apptui.json`
and copy it to the root after editing).

```jsonc
{
  "commands": {
    "My Section": [
      {
        "name": "my command",
        "desc": "What this does",
        "shortcut": "pnpm --filter @kadena/my-pkg dev",
        "action": "run",
        "subsection": "Optional group label"
      }
    ]
  }
}
```

Field reference:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Display name in the palette |
| `desc` | string | Description shown below the name |
| `shortcut` | string | Key shortcut or shell command (when `action` is `"run"`) |
| `action` | string | `"run"` — execute `shortcut` in a terminal pane |
| `subsection` | string | Optional group label within a section |

---

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `/` | Open command palette |
| `tab` | Switch between chat pane and sidebar |
| `shift+tab` | Cycle mode: Auto → Manual → Plan |
| `ctrl+/` | Toggle sidebar visibility |
| `ctrl+1` … `ctrl+4` | Switch sidebar tab |
| `ctrl+j` / `ctrl+k` | Scroll chat / navigate palette |
| `enter` | Send message / confirm palette selection |
| `esc` | Close palette |
| `?` | Show shortcuts overlay |
| `q` / `ctrl+c` | Quit (when input field is empty) |

---

## Repository

This package is part of the [kadena.js monorepo](https://github.com/kadena-community/kadena.js).

The apptui binary lives at [github.com/kda-community/apptui](https://github.com/kda-community/apptui).
