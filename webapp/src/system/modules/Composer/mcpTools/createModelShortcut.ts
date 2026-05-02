import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { fillCreateModelForm } from './createModel.puppeteer';

export const createModelShortcutTool = {
  name: 'createModelShortcut',
  description: 'Create a new model by opening the panel via the Alt+Q shortcut, then filling and submitting the form.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      name: { type: 'string' },
      id: { type: 'string', description: 'Optional model ID; auto-generated if omitted.' },
    },
    required: ['name'],
  },
  async execute({ name, id }: { name: string; id?: string }) {
    if (name.length > 30) {
      throw new Error(
        `Model name must be at most 30 characters (got ${name.length}).`,
      );
    }
    const page = await getPage();
    await page.bringToFront();
    await page.keyboard.down('Alt');
    await page.keyboard.press('q');
    await page.keyboard.up('Alt');
    await page.waitForSelector('[role="pointer-panel-content"] #name');
    await fillCreateModelForm(page, name, id);
    await page.click('#new-model-form-accept');
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
