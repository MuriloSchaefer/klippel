import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { triggerOpenGarmentDetails } from '../components/viewports/ModelViewport/DetailPanel/drivers/GarmentDetails.shortcut.puppeteer';

export const openGarmentDetailsShortcutTool = {
  name: 'openGarmentDetailsShortcut',
  description:
    'Select the garment node and open its details panel via the keyboard shortcut Ctrl+Alt+P.',
  inputSchema: {},
  async execute() {
    const page = await getPage();
    await page.bringToFront();
    await triggerOpenGarmentDetails(page);
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
