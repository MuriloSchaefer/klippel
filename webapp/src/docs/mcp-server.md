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

## File layout

Domain tools live inside the module they belong to. The MCP server in the main process is only responsible for bootstrapping — it imports and registers whatever each module exports from its `mcpTools` folder.

```
src/
  kernel/
    modules/
      Layout/
        mcpTools/
          closeViewport.ts          ← click-based
          closeViewportShortcut.ts  ← keyboard shortcut variant
          …
  system/
    modules/
      Composer/
        mcpTools/
          openModel.ts
          createModel.ts
          createModelShortcut.ts    ← keyboard shortcut variant
          …
      Orders/
        mcpTools/
          createBudget.ts
          …

electron/main/mcp/
  index.ts          ← aggregates tools from all modules, starts the server
  puppeteer.ts      ← Puppeteer Page singleton
```

Each `mcpTools` file exports a single tool object. `electron/main/mcp/index.ts` imports them all and registers them with the MCP server.

### Naming convention

When a feature has a keyboard shortcut, two tool files are created:

| File | Tool name | How it acts |
|---|---|---|
| `createModel.ts` | `createModel` | Navigates and clicks through the UI |
| `createModelShortcut.ts` | `createModelShortcut` | Focuses the window and fires the registered key combination |

Both tools must produce the same observable outcome. The shortcut variant is useful for testing that the shortcut is correctly wired; the click variant is useful when the agent needs to verify the UI path works end-to-end.

## High-level domain tools

Domain tools encode the full UI interaction sequence for a complete business action. They are composed from Puppeteer calls only — no bridge, no store dispatch.

### `openModel`

```ts
// src/system/modules/Composer/mcpTools/openModel.ts
import { getPage } from '../../../../electron/main/mcp/puppeteer';

export const openModelTool = {
  name: 'openModel',
  description: 'Open an existing model by name in a new viewport tab.',
  inputSchema: {
    type: 'object',
    properties: {
      modelName: { type: 'string' },
    },
    required: ['modelName'],
  },
  async execute({ modelName }: { modelName: string }) {
    const page = await getPage();
    await page.waitForSelector('[role="model-list"]');
    const [item] = await page.$x(`//*[@role="model-list-item"][.//text()="${modelName}"]`);
    if (!item) throw new Error(`Model "${modelName}" not found`);
    await (item as any).click();
    await page.waitForSelector('[role="viewport-tabs"] [id^="model"]');
    return { success: true };
  },
};
```

### `createModel`

```ts
// src/system/modules/Composer/mcpTools/createModel.ts
import { getPage } from '../../../../electron/main/mcp/puppeteer';

export const createModelTool = {
  name: 'createModel',
  description: 'Create a new model with the given name.',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
    },
    required: ['name'],
  },
  async execute({ name }: { name: string }) {
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
    return { success: true };
  },
};
```

### `closeViewport` (click-based)

```ts
// src/kernel/modules/Layout/mcpTools/closeViewport.ts
import { getPage } from '../../../../electron/main/mcp/puppeteer';

export const closeViewportTool = {
  name: 'closeViewport',
  description: 'Close the currently active viewport tab by clicking the close button.',
  inputSchema: { type: 'object', properties: {} },
  async execute() {
    const page = await getPage();
    const activeTab = await page.$('[role="viewport-tabs"] [aria-selected="true"]');
    if (!activeTab) throw new Error('No active viewport');
    const closeBtn = await activeTab.$('[data-testid="CloseSharpIcon"]');
    if (!closeBtn) throw new Error('Close button not found');
    await closeBtn.click();
    return { success: true };
  },
};
```

### `closeViewportShortcut` (keyboard shortcut variant)

```ts
// src/kernel/modules/Layout/mcpTools/closeViewportShortcut.ts
import { getPage } from '../../../../electron/main/mcp/puppeteer';

export const closeViewportShortcutTool = {
  name: 'closeViewportShortcut',
  description: 'Close the currently active viewport tab using the registered keyboard shortcut.',
  inputSchema: { type: 'object', properties: {} },
  async execute() {
    const page = await getPage();
    await page.bringToFront();
    await page.keyboard.press('Control+W'); // whatever the registered shortcut is
    return { success: true };
  },
};
```

## MCP server bootstrap

```ts
// electron/main/mcp/index.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// kernel tools
import { closeViewportTool } from '../../../src/kernel/modules/Layout/mcpTools/closeViewport';
// system tools
import { openModelTool } from '../../../src/system/modules/Composer/mcpTools/openModel';
import { createModelTool } from '../../../src/system/modules/Composer/mcpTools/createModel';

const DOMAIN_TOOLS = [
  openModelTool,
  createModelTool,
  closeViewportTool,
];

export async function startMcpServer() {
  const server = new McpServer({ name: 'klippel', version: '1.0.0' });

  for (const tool of DOMAIN_TOOLS) {
    server.tool(tool.name, tool.description, tool.inputSchema as any, tool.execute);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.info('[MCP] klippel domain server listening on stdio');
}
```

Called from `electron/main/index.ts` once the window is ready:

```ts
app.whenReady().then(async () => {
  const mainWindow = await createWindow();
  await mainWindow.webContents.executeJavaScript('undefined'); // wait for renderer
  await startMcpServer();
});
```

## Dependencies to add

```json
"@modelcontextprotocol/sdk": "^1.x",
"puppeteer-core": "^22.x"
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

Test runners (Jest, Vitest) spawn the Electron binary with `--mcp`, connect to both MCP servers over stdio, and drive the full UI stack without mocking any layer. Domain tools handle the happy path; low-level tools from electron-devtools handle edge cases and assertions.

## Constraints

- Domain tools **must not** call `ipcMain`, `ipcRenderer`, `contextBridge`, or any `window.electron.*` API.
- All waits and assertions go through Puppeteer selectors (`role`, `aria-label`, `data-testid`).
- Domain tools may call other domain tools' `execute` functions directly but must not import from `src/` (renderer code).
- The renderer must expose stable `role` and `aria-label` attributes on interactive elements; adding them is part of implementing each domain tool.
