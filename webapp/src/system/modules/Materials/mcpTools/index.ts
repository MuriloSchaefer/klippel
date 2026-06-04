import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { searchMaterialsTool } from "./searchMaterials";
import { searchMaterialsShortcutTool } from "./searchMaterialsShortcut";

const TOOLS = [searchMaterialsTool, searchMaterialsShortcutTool];

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
