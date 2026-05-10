import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { fillCreateModelForm } from '../components/CreateModelIconButton/drivers/createModel.puppeteer';

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
    if (name.length > 30) {
      throw new Error(
        `Model name must be at most 30 characters (got ${name.length}).`,
      );
    }
    const page = await getPage();
    await page.click('[aria-label="create-model"]');
    await page.waitForSelector('[role="pointer-panel-content"] #name');
    await fillCreateModelForm(page, name, id);
    await page.click('#new-model-form-accept');
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
