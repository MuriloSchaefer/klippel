import { getPage } from "../../../../../electron/main/mcp/puppeteer";
import {
  confirmNewWorkspace,
  openNewWorkspacePanel,
  typeNewWorkspaceName,
} from "../components/drivers/newWorkspace.puppeteer";

export const createWorkspaceTool = {
  name: "createWorkspace",
  description:
    "Create a new local workspace by name and select it. Drives the New Workspace pointer panel.",
  inputSchema: {
    type: "object" as const,
    properties: {
      name: { type: "string", description: "Workspace name." },
    },
    required: ["name"],
  },
  async execute({ name }: { name: string }) {
    const page = await getPage();
    await openNewWorkspacePanel(page);
    await typeNewWorkspaceName(page, name);
    await confirmNewWorkspace(page);
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ success: true }) }],
    };
  },
};
