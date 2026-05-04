import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { runOptimizationLoop } from '../optimizer/agentLoop';

import { closeViewportTool } from '../../../src/kernel/modules/Layout/mcpTools/closeViewport';
import { closeViewportShortcutTool } from '../../../src/kernel/modules/Layout/mcpTools/closeViewportShortcut';
import { switchRibbonTabTool } from '../../../src/kernel/modules/Layout/mcpTools/switchRibbonTab';
import { switchRibbonTabShortcutTool } from '../../../src/kernel/modules/Layout/mcpTools/switchRibbonTabShortcut';
import { switchViewportTool } from '../../../src/kernel/modules/Layout/mcpTools/switchViewport';
import { switchViewportShortcutTool } from '../../../src/kernel/modules/Layout/mcpTools/switchViewportShortcut';
import { addViewportTool } from '../../../src/kernel/modules/Layout/mcpTools/addViewport';
import { addViewportShortcutTool } from '../../../src/kernel/modules/Layout/mcpTools/addViewportShortcut';
import { toggleKeyboardHintsTool } from '../../../src/kernel/modules/Layout/mcpTools/toggleKeyboardHints';
import { toggleKeyboardHintsShortcutTool } from '../../../src/kernel/modules/Layout/mcpTools/toggleKeyboardHintsShortcut';
import { toggleThemeTool } from '../../../src/kernel/modules/Layout/mcpTools/toggleTheme';
import { toggleThemeShortcutTool } from '../../../src/kernel/modules/Layout/mcpTools/toggleThemeShortcut';
import { toggleSettingsPanelTool } from '../../../src/kernel/modules/Layout/mcpTools/toggleSettingsPanel';
import { toggleSettingsPanelShortcutTool } from '../../../src/kernel/modules/Layout/mcpTools/toggleSettingsPanelShortcut';
import { toggleDetailsPanelTool } from '../../../src/kernel/modules/Layout/mcpTools/toggleDetailsPanel';
import { toggleDetailsPanelShortcutTool } from '../../../src/kernel/modules/Layout/mcpTools/toggleDetailsPanelShortcut';
import { expandAccordionTool } from '../../../src/kernel/modules/Layout/mcpTools/expandAccordion';
import { registerMcpTools as registerComposerTools } from '../../../src/system/modules/Composer/mcpTools';
import { createBudgetTool } from '../../../src/system/modules/Orders/mcpTools/createBudget';

export async function startMcpServer() {
  const server = new McpServer({ name: 'klippel', version: '1.0.0' });

  server.registerTool(closeViewportTool.name, { description: closeViewportTool.description }, closeViewportTool.execute);
  server.registerTool(closeViewportShortcutTool.name, { description: closeViewportShortcutTool.description }, closeViewportShortcutTool.execute);
  server.registerTool(switchRibbonTabTool.name, { description: switchRibbonTabTool.description, inputSchema: { tabIndex: z.number() } }, ({ tabIndex }) => switchRibbonTabTool.execute({ tabIndex }));
  server.registerTool(switchRibbonTabShortcutTool.name, { description: switchRibbonTabShortcutTool.description, inputSchema: { tabIndex: z.number() } }, ({ tabIndex }) => switchRibbonTabShortcutTool.execute({ tabIndex }));
  server.registerTool(switchViewportTool.name, { description: switchViewportTool.description, inputSchema: { viewportIndex: z.number() } }, ({ viewportIndex }) => switchViewportTool.execute({ viewportIndex }));
  server.registerTool(switchViewportShortcutTool.name, { description: switchViewportShortcutTool.description, inputSchema: { viewportIndex: z.number() } }, ({ viewportIndex }) => switchViewportShortcutTool.execute({ viewportIndex }));
  server.registerTool(addViewportTool.name, { description: addViewportTool.description }, addViewportTool.execute);
  server.registerTool(addViewportShortcutTool.name, { description: addViewportShortcutTool.description }, addViewportShortcutTool.execute);
  server.registerTool(toggleKeyboardHintsTool.name, { description: toggleKeyboardHintsTool.description }, toggleKeyboardHintsTool.execute);
  server.registerTool(toggleKeyboardHintsShortcutTool.name, { description: toggleKeyboardHintsShortcutTool.description }, toggleKeyboardHintsShortcutTool.execute);
  server.registerTool(toggleThemeTool.name, { description: toggleThemeTool.description }, toggleThemeTool.execute);
  server.registerTool(toggleThemeShortcutTool.name, { description: toggleThemeShortcutTool.description }, toggleThemeShortcutTool.execute);
  server.registerTool(toggleSettingsPanelTool.name, { description: toggleSettingsPanelTool.description }, toggleSettingsPanelTool.execute);
  server.registerTool(toggleSettingsPanelShortcutTool.name, { description: toggleSettingsPanelShortcutTool.description }, toggleSettingsPanelShortcutTool.execute);
  server.registerTool(toggleDetailsPanelTool.name, { description: toggleDetailsPanelTool.description }, toggleDetailsPanelTool.execute);
  server.registerTool(toggleDetailsPanelShortcutTool.name, { description: toggleDetailsPanelShortcutTool.description }, toggleDetailsPanelShortcutTool.execute);
  server.registerTool(
    expandAccordionTool.name,
    { description: expandAccordionTool.description, inputSchema: expandAccordionTool.inputSchema },
    ({ name }) => expandAccordionTool.execute({ name }),
  );

  // Register Composer module tools
  registerComposerTools(server);

  server.registerTool(createBudgetTool.name, { description: createBudgetTool.description, inputSchema: { label: z.string() } }, ({ label }) => createBudgetTool.execute({ label }));

  server.registerTool(
    'runOptimizationLoop',
    {
      description:
        'Run a simulated-annealing optimization agent on the currently open garment variation. It autonomously swaps materials to minimize cost while respecting each node\'s type restrictions. Returns a summary with initial/final cost, improvement percentage, and the moves taken.',
      inputSchema: {
        maxIterations: z.number().optional().describe('Maximum number of swap attempts (default 50).'),
        targetReduction: z.number().optional().describe('Stop early when cost drops by this fraction, e.g. 0.15 for 15%.'),
      },
    },
    async ({ maxIterations, targetReduction }) => {
      const result = await runOptimizationLoop({ maxIterations, targetReduction });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.info('[MCP] klippel domain server listening on stdio');
}
