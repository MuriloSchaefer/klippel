import { getPage } from '../../../../../electron/main/mcp/puppeteer';

export const toggleSettingsPanelTool = {
  name: 'toggleSettingsPanel',
  description: 'Toggle the settings panel (expand/collapse) by clicking its toggle button.',
  inputSchema: { type: 'object' as const, properties: {} },
  async execute() {
    const page = await getPage();
    const btn = await page.$('[aria-label="toggle settings panel"]');
    if (!btn) throw new Error('Settings panel toggle button not found');
    await btn.click();
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
