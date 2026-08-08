import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import { confirmPointerPanel } from '@kernel/modules/Pointer/components/drivers/PointerContainer.click.puppeteer';
import {
  BUDGET_ACCORDION_NAME,
  openCreateBudgetPanel,
  pickBudgetColor,
  typeBudgetName,
  waitForBudgetHeader,
} from '../components/BudgetAccordion/drivers/BudgetAccordion.click.puppeteer';

type CreateBudgetInput = {
  label: string;
  color?: string;
};

export const createBudgetTool = {
  name: 'createBudget',
  description:
    'Create a budget from the model open in the active viewport, via the Orçamento accordion (click flow). The model becomes the budget\'s first item and its tab joins the new tab group.',
  inputSchema: {
    label: z.string().describe('Visible name for the budget.'),
    color: z
      .string()
      .optional()
      .describe('Budget colour as #rrggbb. Defaults to the picker\'s current value.'),
  },
  async execute({ label, color }: CreateBudgetInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, BUDGET_ACCORDION_NAME);

    await openCreateBudgetPanel(page);
    if (color) await pickBudgetColor(page, color);
    await typeBudgetName(page, label);

    await confirmPointerPanel(page);
    await waitForBudgetHeader(page, label);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, label, color }),
        },
      ],
    };
  },
};
