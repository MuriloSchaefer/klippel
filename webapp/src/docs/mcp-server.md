# MCP Server — Electron Main Process

## Goal

Expose the platform to AI agents (Claude, Copilot) and automated test runners through a Model Context Protocol server that lives entirely inside the Electron main process. Agents and tests interact with the app exactly as a human would — through the visible UI — rather than through internal APIs or the Electron bridge.

## Architecture

```
AI Agent / Test runner
        │
        ├── low-level tools ──► electron-devtools MCP server (already exists)
        │                              │  (CDP)
        │                              ▼
        │                    ┌──────────────────────┐
        │                    │  Renderer (BrowserWindow) │
        │                    │  React / Redux UI     │
        │                    └──────────────────────┘
        │
        └── domain tools ───► klippel MCP server (new)
                                       │  Puppeteer (CDP)
                                       ▼
                             ┌──────────────────────┐
                             │  Renderer (BrowserWindow) │
                             │  React / Redux UI     │
                             └──────────────────────┘
```

**Low-level tools** (click, keyPress, scroll, type, screenshot, waitForSelector, …) are provided as-is by the existing **electron-devtools MCP server**. We do not reimplement them.

**High-level domain tools** (openModel, createModel, closeViewport, …) are implemented in a new **klippel MCP server** that runs in the main process. Domain tools use Puppeteer internally to sequence UI interactions — no `ipcMain`/`ipcRenderer`, no `contextBridge`, no direct store access.

## Puppeteer connection

Electron exposes a CDP endpoint that Puppeteer connects to. The main process must launch with the remote-debugging switch:

```ts
// electron/main/index.ts
app.commandLine.appendSwitch('remote-debugging-port', '9222');
```

```ts
// electron/main/mcp/puppeteer.ts
import puppeteer, { Page } from 'puppeteer-core';
import { app } from 'electron';

let page: Page | null = null;

export async function getPage(): Promise<Page> {
  if (page) return page;
  const browser = await puppeteer.connect({
    browserURL: `http://localhost:${app.commandLine.getSwitchValue('remote-debugging-port')}`,
    defaultViewport: null,
  });
  page = (await browser.pages())[0];
  return page;
}
```

`puppeteer-core` is used (not `puppeteer`) because the browser binary is Electron itself — no separate Chrome download is needed.

## Ownership model

The MCP surface is **owned by the modules**, not by `electron/main`. This is the central rule of the architecture; everything else follows from it.

- A module that exposes MCP tools owns: the tool's `name`, `description`, `inputSchema` (as a zod schema), `execute` function, and **its tests**.
- A module exports a single `registerMcpTools(server)` function that attaches every one of its tools to a root `McpServer`.
- `electron/main/mcp/index.ts` knows nothing about individual tools or their schemas. It constructs the root `McpServer`, calls each module's `registerMcpTools(server)`, then connects the stdio transport.

The MCP SDK only supports one `McpServer` per stdio transport, so modules cannot literally export their own `McpServer` instance. The `registerMcpTools(server)` function is the per-module "sub-server" — it is the unit you import, hand the root server to, and (in tests) hand a fake server to. Treat it as the module's MCP boundary even though it is a function rather than a class.

### What this fixes

Previously, every tool's zod input schema was duplicated in `electron/main/mcp/index.ts`, and `electron/main` had to be edited every time a module added or renamed a tool. With the per-module registrar:

- A module change never requires editing `electron/main/mcp/index.ts` (except to register a *new* module — a one-line import + call).
- The schema lives next to the `execute` function it validates — no two-place edits when a parameter changes.
- Tests for a tool run inside the module's test suite, not as a top-level `webapp/test-mcp-tool.js` script. The module is the unit of ownership, the unit of review, and the unit of CI failure.

## File layout

```
src/
  kernel/
    modules/
      Layout/
        mcpTools/
          index.ts                   ← registerMcpTools(server) — the module's MCP boundary
          closeViewport.ts           ← click-based tool definition (name, description, inputSchema, execute)
          closeViewport.test.ts      ← module-owned test
          closeViewportShortcut.ts
          closeViewportShortcut.test.ts
          …
  system/
    modules/
      Composer/
        mcpTools/
          index.ts
          openModel.ts
          openModel.test.ts
          createModel.ts
          createModelShortcut.ts
          …

electron/main/mcp/
  index.ts          ← imports each module's registerMcpTools, calls them on a single McpServer
  puppeteer.ts      ← Puppeteer Page singleton
  helpers/          ← truly cross-module Puppeteer helpers (see mcp-tool-reuse.md)
```

Each tool file exports a single `<name>Tool` object. The module's `mcpTools/index.ts` imports all tool files and registers them on the server passed in. `electron/main/mcp/index.ts` has no awareness of individual tools.

### Naming convention

When a feature has a keyboard shortcut, two tool files are created:

| File | Tool name | How it acts |
|---|---|---|
| `createModel.ts` | `createModel` | Navigates and clicks through the UI |
| `createModelShortcut.ts` | `createModelShortcut` | Focuses the window and fires the registered key combination |

Both tools must produce the same observable outcome. The shortcut variant is useful for testing that the shortcut is correctly wired; the click variant is useful when the agent needs to verify the UI path works end-to-end. See [mcp-tool-reuse.md](./mcp-tool-reuse.md) for how the underlying Puppeteer drivers are split along the same axis.

## Tool shape

A tool definition co-locates its name, description, zod input schema, and execute function. The zod schema lives here — not in `electron/main` — so the module owns the full contract.

```ts
// src/system/modules/Composer/mcpTools/createModel.ts
import { z } from 'zod';
import { getPage } from '../../../../../electron/main/mcp/puppeteer';

export const createModelTool = {
  name: 'createModel',
  description: 'Create a new model with the given name.',
  inputSchema: {
    name: z.string(),
    id: z.string().optional(),
  },
  async execute({ name }: { name: string; id?: string }) {
    const page = await getPage();
    await page.click('[aria-label="Create model"]');
    await page.waitForSelector('[role="pointer-panel"]');
    await page.type('input[id="part-name"]', name);
    await page.keyboard.press('Control+Enter');
    await page.waitForFunction(
      (n: string) => document.querySelector(`[aria-label="${n}"]`) !== null,
      {},
      name,
    );
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, name }) }] };
  },
};
```

`inputSchema` is the object form expected by `McpServer.registerTool` — a record of zod schemas keyed by parameter name. Tools with no input use `inputSchema: {}` (or omit the key). The execute function's parameter type must match what the zod schema validates.

## Module registrar

Each module's `mcpTools/index.ts` is the only file that needs to know the full list of tools the module exposes. It imports a `McpServer`-shaped argument and registers each tool on it.

```ts
// src/system/modules/Composer/mcpTools/index.ts
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { openModelTool } from './openModel';
import { createModelTool } from './createModel';
import { createModelShortcutTool } from './createModelShortcut';
import { switchViewTool } from './switchView';
import { switchViewShortcutTool } from './switchViewShortcut';
import { addMaterialTool } from './addMaterial';
import { addMaterialShortcutTool } from './addMaterialShortcut';

const TOOLS = [
  openModelTool,
  createModelTool,
  createModelShortcutTool,
  switchViewTool,
  switchViewShortcutTool,
  addMaterialTool,
  addMaterialShortcutTool,
];

export function registerMcpTools(server: McpServer) {
  for (const tool of TOOLS) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: tool.inputSchema },
      tool.execute as any,
    );
  }
}
```

The registrar is **the only file** in the module that uses the `McpServer` type. Tool files themselves are framework-agnostic — they just export plain objects.

## MCP server bootstrap

`electron/main/mcp/index.ts` collapses to a list of module registrars:

```ts
// electron/main/mcp/index.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerMcpTools as registerLayoutTools } from '../../../src/kernel/modules/Layout/mcpTools';
import { registerMcpTools as registerComposerTools } from '../../../src/system/modules/Composer/mcpTools';
import { registerMcpTools as registerOrdersTools } from '../../../src/system/modules/Orders/mcpTools';

const MODULE_REGISTRARS = [
  registerLayoutTools,
  registerComposerTools,
  registerOrdersTools,
];

export async function startMcpServer() {
  const server = new McpServer({ name: 'klippel', version: '1.0.0' });
  for (const register of MODULE_REGISTRARS) register(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.info('[MCP] klippel domain server listening on stdio');
}
```

Adding a new module that exposes MCP tools is a one-line import + one-line call. Renaming, adding, or removing tools within a module never touches this file.

Called from `electron/main/index.ts` once the window is ready:

```ts
app.whenReady().then(async () => {
  const mainWindow = await createWindow();
  await mainWindow.webContents.executeJavaScript('undefined'); // wait for renderer
  await startMcpServer();
});
```

## Testing

**Each module owns the tests for its MCP tools.** There is no top-level `webapp/test-mcp-tool.js` script and no central "MCP test suite" — tools are tested inside the module that exports them, using the module's own test runner setup.

Tests live next to the tool file:

```
src/system/modules/Composer/mcpTools/
  addMaterial.ts
  addMaterial.test.ts          ← exercises addMaterialTool.execute end-to-end
  addMaterialShortcut.ts
  addMaterialShortcut.test.ts
```

A tool test must:

1. **Drive the real tool's `execute` function**, not re-implement the interaction. If the test types into the form by hand it is testing the form, not the tool.
2. **Boot the renderer and connect Puppeteer** the same way the production server does — through `getPage()` against a running Electron instance with `--remote-debugging-port=9222`. No mocked DOM, no jsdom.
3. **Assert observable outcomes**, not internal state. The same selectors the tool uses for its post-conditions are what the test should verify.

The recommended layout is one test file per tool, each calling `tool.execute(input)` and asserting that the resulting UI state matches expectations. When click and shortcut variants exist, each gets its own file so the failures point at exactly one variant.

```ts
// src/system/modules/Composer/mcpTools/addMaterial.test.ts (sketch)
import { addMaterialTool } from './addMaterial';
import { getPage } from '../../../../../electron/main/mcp/puppeteer';

describe('addMaterial', () => {
  it('adds a material node by id', async () => {
    const page = await getPage();
    // arrange: open a model viewport, etc.
    await addMaterialTool.execute({ label: 'Malha PV', type: 'malha', materialId: 1 });
    // assert via the same selectors the tool waits on, plus a check that the node appears.
    await page.waitForSelector('[data-testid="material-node"][data-label="Malha PV"]');
  });
});
```

What this replaces: the previous `webapp/test-mcp-tool.js` was a single ad-hoc Puppeteer script that drove the UI by hand (typing into inputs, pressing Tab, asserting via `document.body.innerText.includes(...)`). That is exactly what the per-module tests must *not* be — it bypassed the tool entirely, tested the form instead, and could not be maintained when the form's tab order or DOM changed. Delete that script when the per-module tests for the tools it covered exist.

### Reconnecting after editing tools

When you change a tool's signature (e.g. add a parameter to its zod schema), the running Claude Code session is still holding the old schema. Use the [reconnect skill](../../../.claude/commands/reconnect.md) to reload schemas without restarting the agent.

## Constraints

- Domain tools **must not** call `ipcMain`, `ipcRenderer`, `contextBridge`, or any `window.electron.*` API.
- All waits and assertions go through Puppeteer selectors (`role`, `aria-label`, `data-testid`).
- Domain tools may call other domain tools' `execute` functions directly but must not import from `src/` for non-MCP purposes (renderer code).
- The renderer must expose stable `role` and `aria-label` attributes on interactive elements; adding them is part of implementing each domain tool.
- Tool files import from `electron/main/mcp/puppeteer` and `electron/main/mcp/helpers` only — never from anywhere else in `electron/main`. The module's `mcpTools/index.ts` is the only file that imports the `McpServer` type.
- Input schemas (zod) live in the tool file, not in `electron/main/mcp/index.ts`.

## Dependencies

```json
"@modelcontextprotocol/sdk": "^1.x",
"puppeteer-core": "^22.x",
"zod": "^3.x"
```

## Usage as an AI tool

Configure both MCP servers in `.claude/mcp.json` (or the equivalent for Copilot). The agent gets low-level control from electron-devtools and domain shortcuts from the klippel server:

```json
{
  "mcpServers": {
    "electron-devtools": {
      "command": "npx",
      "args": ["electron-devtools-mcp", "--port", "9222"]
    },
    "klippel": {
      "command": "/path/to/Klippel",
      "args": ["--mcp"]
    }
  }
}
```

The `--mcp` flag tells the main process to also start the domain MCP server. `createWindow()` still runs so the renderer exists and is reachable via CDP.

## E2E testing

The per-module tests described above *are* the E2E suite for MCP tools. There is no separate top-level harness — running each module's test command exercises its tools against a live Electron+renderer, and CI runs them all.
