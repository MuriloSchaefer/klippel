import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { createBudgetTool } from './createBudget';
import { createBudgetShortcutTool } from './createBudgetShortcut';
import { addToBudgetTool } from './addToBudget';
import { addToBudgetShortcutTool } from './addToBudgetShortcut';
import { removeFromBudgetTool } from './removeFromBudget';
import { deleteBudgetTool } from './deleteBudget';
import { setBudgetItemAmountTool } from './setBudgetItemAmount';

const TOOLS = [
  createBudgetTool,
  createBudgetShortcutTool,
  addToBudgetTool,
  addToBudgetShortcutTool,
  setBudgetItemAmountTool,
  removeFromBudgetTool,
  deleteBudgetTool,
];

export function registerMcpTools(server: McpServer) {
  TOOLS.forEach((tool) => {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: (tool as any).inputSchema,
      },
      (args: any) => (tool as any).execute(args),
    );
  });
}
