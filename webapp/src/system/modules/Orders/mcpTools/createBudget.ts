import { getPage } from '../../../../../electron/main/mcp/puppeteer';

export const createBudgetTool = {
  name: 'createBudget',
  description: 'Create a new budget with the given label in the active model viewport.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      label: { type: 'string' },
    },
    required: ['label'],
  },
  async execute({ label }: { label: string }) {
    const page = await getPage();
    await page.click('[aria-label="create-budget"]');
    await page.waitForSelector('[role="pointer-panel-content"] #part-name');
    await page.$eval('#part-name', (el) => ((el as HTMLInputElement).value = ''));
    await page.type('#part-name', label);
    await page.click('#create-budget-confirm');
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
