import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { openModelTool } from './openModel';
import { createModelTool } from './createModel';
import { createModelShortcutTool } from './createModelShortcut';
import { switchViewTool } from './switchView';
import { switchViewShortcutTool } from './switchViewShortcut';
import { addMaterialTool } from './addMaterial';
import { addMaterialShortcutTool } from './addMaterialShortcut';
import { editMaterialTool } from './editMaterial';
import { editMaterialShortcutTool } from './editMaterialShortcut';
import { deleteMaterialTool } from './deleteMaterial';
import { deleteMaterialShortcutTool } from './deleteMaterialShortcut';
import { focusMaterialListTool } from './focusMaterialList';
import { cycleMaterialFocusTool } from './cycleMaterialFocus';
import { selectMaterialByLabelTool } from './selectMaterialByLabel';
import { editFocusedMaterialTool } from './editFocusedMaterial';
import { deleteFocusedMaterialTool } from './deleteFocusedMaterial';

const TOOLS = [
  openModelTool,
  createModelTool,
  createModelShortcutTool,
  switchViewTool,
  switchViewShortcutTool,
  addMaterialTool,
  addMaterialShortcutTool,
  editMaterialTool,
  editMaterialShortcutTool,
  deleteMaterialTool,
  deleteMaterialShortcutTool,
  focusMaterialListTool,
  cycleMaterialFocusTool,
  selectMaterialByLabelTool,
  editFocusedMaterialTool,
  deleteFocusedMaterialTool,
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
