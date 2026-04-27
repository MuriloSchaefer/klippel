import { getPage } from '../../../../../electron/main/mcp/puppeteer';

export const addMaterialTool = {
  name: 'addMaterial',
  description: 'Open the add-material panel in the active Composer ModelViewport by clicking the "Adicionar Material" button.',
  inputSchema: { type: 'object' as const, properties: {} },
  async execute() {
    const page = await getPage();
    await page.bringToFront();
    await page.click('#composer-add-material');
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
