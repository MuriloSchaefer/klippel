import { getPage } from "../../../../../electron/main/mcp/puppeteer";
import {
  confirmJoinWorkspace,
  fillJoinWorkspaceForm,
  openJoinWorkspacePanel,
} from "../components/drivers/joinWorkspace.puppeteer";

export const joinWorkspaceTool = {
  name: "joinWorkspace",
  description:
    "Join an existing collaborative workspace by pasting a coId + sync URL into the Join Workspace pointer panel. Drives the same form a user fills manually.",
  inputSchema: {
    type: "object" as const,
    properties: {
      coId: { type: "string" },
      syncUrl: { type: "string", description: "ws:// or wss:// sync-server URL." },
      name: { type: "string", description: "Local workspace name." },
    },
    required: ["coId", "syncUrl", "name"],
  },
  async execute(input: { coId: string; syncUrl: string; name: string }) {
    const page = await getPage();
    await openJoinWorkspacePanel(page);
    await fillJoinWorkspaceForm(page, input);
    await confirmJoinWorkspace(page);
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ success: true }) }],
    };
  },
};
