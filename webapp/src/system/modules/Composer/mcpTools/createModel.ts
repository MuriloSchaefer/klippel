import { getPage } from '../../../../../electron/main/mcp/puppeteer';

export const createModelTool = {
  name: 'createModel',
  description: 'Create a new model with the given name (and optional ID).',
  inputSchema: {
    type: 'object' as const,
    properties: {
      name: { type: 'string' },
      id: { type: 'string', description: 'Optional model ID; auto-generated if omitted.' },
    },
    required: ['name'],
  },
  async execute({ name, id }: { name: string; id?: string }) {
    const page = await getPage();
    await page.click('[aria-label="create-model"]');
    await page.waitForSelector('[role="pointer-panel-content"] #name');
    if (id !== undefined) {
      await page.$eval('#hashId', (el) => ((el as HTMLInputElement).value = ''));
      await page.type('#hashId', id);
    }
    await page.$eval('#name', (el) => ((el as HTMLInputElement).value = ''));
    await page.type('#name', name);
    await page.click('#new-model-form-accept');
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
