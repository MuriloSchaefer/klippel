import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import {
  clickModelOptionByName,
  waitForConfirmModelSelectionEnabled,
  waitForModalClosed,
} from './openModel.puppeteer';

export const OPEN_MODEL_SHORTCUT = 'w' as const;

export const openModelShortcutTool = {
  name: 'openModelShortcut',
  description:
    'Open an existing model by name using the registered keyboard shortcut (W) to trigger the modal. With no arguments, only opens the modal.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      modelName: { type: 'string', description: 'Name of the model to open. If omitted, only opens the selection modal.' },
    },
  },
  async execute({ modelName }: { modelName?: string } = {}) {
    const page = await getPage();
    await page.bringToFront();

    await page.keyboard.press(OPEN_MODEL_SHORTCUT);
    await page.waitForSelector('[role="list-options"]', { timeout: 10_000 });

    if (!modelName) {
      return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, opened: true }) }] };
    }

    const found = await clickModelOptionByName(page, modelName);
    if (!found) throw new Error(`Model "${modelName}" not found`);

    await waitForConfirmModelSelectionEnabled(page);
    await page.click('[aria-label="confirm-model-selection"]');
    await waitForModalClosed(page);

    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, modelName }) }] };
  },
};
