import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { searchMaterialsTool } from "./searchMaterials";
import { searchMaterialsShortcutTool } from "./searchMaterialsShortcut";
import { addMaterialTypeTool } from "./addMaterialType";
import { addMaterialTypeShortcutTool } from "./addMaterialTypeShortcut";
import { updateMaterialTypeTool } from "./updateMaterialType";
import { updateMaterialTypeShortcutTool } from "./updateMaterialTypeShortcut";
import { importCatalogTool } from "./importCatalog";
import { importCatalogShortcutTool } from "./importCatalogShortcut";

const TOOLS = [
  searchMaterialsTool,
  searchMaterialsShortcutTool,
  addMaterialTypeTool,
  addMaterialTypeShortcutTool,
  updateMaterialTypeTool,
  updateMaterialTypeShortcutTool,
  importCatalogTool,
  importCatalogShortcutTool,
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
