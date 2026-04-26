import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { closeViewportTool } from '../../../src/kernel/modules/Layout/mcpTools/closeViewport';
import { closeViewportShortcutTool } from '../../../src/kernel/modules/Layout/mcpTools/closeViewportShortcut';
import { openModelTool } from '../../../src/system/modules/Composer/mcpTools/openModel';
import { createModelTool } from '../../../src/system/modules/Composer/mcpTools/createModel';
import { createModelShortcutTool } from '../../../src/system/modules/Composer/mcpTools/createModelShortcut';
import { createBudgetTool } from '../../../src/system/modules/Orders/mcpTools/createBudget';

export async function startMcpServer() {
  const server = new McpServer({ name: 'klippel', version: '1.0.0' });

  server.registerTool(closeViewportTool.name, { description: closeViewportTool.description }, closeViewportTool.execute);
  server.registerTool(closeViewportShortcutTool.name, { description: closeViewportShortcutTool.description }, closeViewportShortcutTool.execute);
  server.registerTool(openModelTool.name, { description: openModelTool.description, inputSchema: { modelName: z.string() } }, ({ modelName }) => openModelTool.execute({ modelName }));
  server.registerTool(createModelTool.name, { description: createModelTool.description, inputSchema: { name: z.string(), id: z.string().optional() } }, ({ name, id }) => createModelTool.execute({ name, id }));
  server.registerTool(createModelShortcutTool.name, { description: createModelShortcutTool.description }, createModelShortcutTool.execute);
  server.registerTool(createBudgetTool.name, { description: createBudgetTool.description, inputSchema: { label: z.string() } }, ({ label }) => createBudgetTool.execute({ label }));

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.info('[MCP] klippel domain server listening on stdio');
}
