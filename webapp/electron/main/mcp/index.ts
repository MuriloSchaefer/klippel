import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { registerGoal, listGoals } from '../optimizer/goals/registry';
import { materialCostGoal } from '../optimizer/goals/materialCostGoal';
import { runOptimizationLoop } from '../optimizer/runner';

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
  // Register all optimization goals before the server starts
  registerGoal(materialCostGoal);

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
    'listOptimizationGoals',
    { description: 'List all registered optimization goals with their names and descriptions.' },
    async () => {
      const goals = listGoals();
      return { content: [{ type: 'text' as const, text: JSON.stringify({ goals }) }] };
    },
  );

  server.registerTool(
    'runOptimizationLoop',
    {
      description:
        'Run the simulated-annealing optimizer for a named goal. Call listOptimizationGoals first to discover available goals. Returns initial/final cost, improvement %, and the move history.',
      inputSchema: {
        goal: z.string().describe('Name of the registered optimization goal, e.g. "minimizeMaterialCost".'),
        maxIterations: z.number().optional().describe('Maximum swap attempts (default 50).'),
        targetReduction: z.number().optional().describe('Stop early when cost drops by this fraction, e.g. 0.15 for 15%.'),
        initialTemperature: z.number().optional().describe('SA starting temperature (default 1.0).'),
        coolingRate: z.number().optional().describe('SA cooling multiplier per step (default 0.85).'),
      },
    },
    async ({ goal, maxIterations, targetReduction, initialTemperature, coolingRate }) => {
      const result = await runOptimizationLoop(goal, { maxIterations, targetReduction, initialTemperature, coolingRate });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.info('[MCP] klippel domain server listening on stdio');
}
