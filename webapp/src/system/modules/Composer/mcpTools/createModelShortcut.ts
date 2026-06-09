import { z } from 'zod';
import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { fillCreateModelForm } from '../components/CreateModelIconButton/drivers/createModel.puppeteer';

export const createModelShortcutTool = {
  name: 'createModelShortcut',
  description: 'Create a new model by opening the panel via the Alt+Q shortcut, then filling and submitting the form.',
  inputSchema: {
    name: z.string(),
    id: z.string().optional().describe('Optional model ID; auto-generated if omitted.'),
  },
  async execute({ name, id }: { name: string; id?: string }) {
    if (name.length > 30) {
      throw new Error(
        `Model name must be at most 30 characters (got ${name.length}).`,
      );
    }
    const page = await getPage();
    await page.bringToFront();
    await page.keyboard.press('q');
    await page.waitForSelector('[role="pointer-panel-content"] #name');
    await fillCreateModelForm(page, name, id);
    await page.click('#new-model-form-accept');
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
