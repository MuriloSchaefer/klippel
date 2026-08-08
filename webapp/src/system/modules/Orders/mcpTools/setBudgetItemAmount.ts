import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import {
  BUDGET_ACCORDION_NAME,
  readItemTotal,
  setItemAmount,
} from '../components/BudgetAccordion/drivers/BudgetAccordion.click.puppeteer';

type SetBudgetItemAmountInput = {
  label: string;
  amount: number;
};

export const setBudgetItemAmountTool = {
  name: 'setBudgetItemAmount',
  description:
    "Set the quantity of a line in the active viewport's budget, identified by the item's visible name. The line's total cost (unit cost × amount) updates with it.",
  inputSchema: {
    label: z.string().describe('Visible name of the budget line.'),
    amount: z.number().int().min(0).describe('New quantity for the line.'),
  },
  async execute({ label, amount }: SetBudgetItemAmountInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, BUDGET_ACCORDION_NAME);

    await setItemAmount(page, label, amount);
    const total = await readItemTotal(page, label);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, label, amount, total }),
        },
      ],
    };
  },
};
