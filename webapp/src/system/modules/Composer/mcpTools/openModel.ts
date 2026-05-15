import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { clickModelOptionByName, waitForConfirmModelSelectionEnabled, waitForModalClosed } from '../components/OpenModelIconButton/drivers/openModel.puppeteer';


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
    // Wait for the modal's 50ms input-acceptance gate to flip before typing.
    // The modal ignores onChange events until then to drop the trigger key
    // that opened it; without this wait, page.keyboard.type can race that
    // gate and the keystrokes are silently dropped (search stays empty).
    await page.waitForSelector('#open-model-search[data-accepts-input="true"]');
    await page.focus('#open-model-search');
    await page.keyboard.type(modelName);
    const found = await clickModelOptionByName(page, modelName);
    if (!found) throw new Error(`Model "${modelName}" not found`);
    await waitForConfirmModelSelectionEnabled(page);
    await page.click('[aria-label="confirm-model-selection"]');
    await waitForModalClosed(page);
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
