import { getPage } from "../../../../../electron/main/mcp/puppeteer";
import {
  confirmShareWorkspace,
  openShareWorkspacePanel,
  readShareWorkspaceAttrs,
} from "../components/drivers/shareWorkspace.puppeteer";

export const shareWorkspaceTool = {
  name: "shareWorkspace",
  description:
    "Open the Share Workspace panel, read the coId + syncUrl shown to the user, and confirm 'Habilitar sincronização' so remote peers can join. Returns the coId and syncUrl as JSON.",
  inputSchema: {
    type: "object" as const,
    properties: {},
  },
  async execute() {
    const page = await getPage();
    await openShareWorkspacePanel(page);
    const attrs = await readShareWorkspaceAttrs(page);
    await confirmShareWorkspace(page);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ success: true, ...attrs }),
        },
      ],
    };
  },
};
