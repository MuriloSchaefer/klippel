import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

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
import { openModelTool } from '../../../src/system/modules/Composer/mcpTools/openModel';
import { createModelTool } from '../../../src/system/modules/Composer/mcpTools/createModel';
import { createModelShortcutTool } from '../../../src/system/modules/Composer/mcpTools/createModelShortcut';
import { switchViewTool } from '../../../src/system/modules/Composer/mcpTools/switchView';
import { switchViewShortcutTool } from '../../../src/system/modules/Composer/mcpTools/switchViewShortcut';
import { addMaterialTool } from '../../../src/system/modules/Composer/mcpTools/addMaterial';
import { addMaterialShortcutTool } from '../../../src/system/modules/Composer/mcpTools/addMaterialShortcut';
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
  server.registerTool(openModelTool.name, { description: openModelTool.description, inputSchema: { modelName: z.string() } }, ({ modelName }) => openModelTool.execute({ modelName }));
  server.registerTool(createModelTool.name, { description: createModelTool.description, inputSchema: { name: z.string(), id: z.string().optional() } }, ({ name, id }) => createModelTool.execute({ name, id }));
  server.registerTool(createModelShortcutTool.name, { description: createModelShortcutTool.description }, createModelShortcutTool.execute);
  server.registerTool(switchViewTool.name, { description: switchViewTool.description, inputSchema: { view: z.enum(['graph', 'svg']) } }, ({ view }) => switchViewTool.execute({ view }));
  server.registerTool(switchViewShortcutTool.name, { description: switchViewShortcutTool.description, inputSchema: { view: z.enum(['graph', 'svg']) } }, ({ view }) => switchViewShortcutTool.execute({ view }));
  server.registerTool(addMaterialTool.name, { description: addMaterialTool.description }, addMaterialTool.execute);
  server.registerTool(addMaterialShortcutTool.name, { description: addMaterialShortcutTool.description }, addMaterialShortcutTool.execute);
  server.registerTool(createBudgetTool.name, { description: createBudgetTool.description, inputSchema: { label: z.string() } }, ({ label }) => createBudgetTool.execute({ label }));

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.info('[MCP] klippel domain server listening on stdio');
}
