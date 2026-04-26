import { getPage } from '../../../../../electron/main/mcp/puppeteer';

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
    const found = await page.$$eval(
      '[role="list-options"] [id]',
      (els, name) => {
        const el = els.find((e) => e.getAttribute('id') === name);
        if (el) {
          el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return true;
        }
        return false;
      },
      modelName,
    );
    if (!found) throw new Error(`Model "${modelName}" not found`);
    await page.waitForFunction(
      () => !document.querySelector('[aria-label="confirm-model-selection"]:disabled'),
    );
    await page.click('[aria-label="confirm-model-selection"]');
    await page.waitForFunction(() => !document.getElementById('modal-content'), { timeout: 5000 }).catch(() => {});
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
