import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import {
  clickModelOptionByName,
  waitForConfirmModelSelectionEnabled,
  waitForModalClosed,
} from './openModel.puppeteer';

export const openModelTool = {
  name: 'openModel',
  description: 'Open an existing model by name in a new viewport tab.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      modelName: { type: 'string' },
    },
    required: ['modelName'],
  },
  async execute({ modelName }: { modelName: string }) {
    const page = await getPage();
    await page.click('#open-model-modal');
    await page.waitForSelector('[role="list-options"]');
    await page.waitForSelector('#open-model-search');
    await page.keyboard.type(modelName)
    const found = await clickModelOptionByName(page, modelName);
    if (!found) throw new Error(`Model "${modelName}" not found`);
    await waitForConfirmModelSelectionEnabled(page);
    await page.click('[aria-label="confirm-model-selection"]');
    await waitForModalClosed(page);
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
