import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import { confirmPointerPanel } from '@kernel/modules/Pointer/components/drivers/PointerContainer.click.puppeteer';
import {
  BUDGET_ACCORDION_NAME,
  openAddToBudgetPanel,
  selectBudgetByLabel,
  waitForBudgetHeader,
} from '../components/BudgetAccordion/drivers/BudgetAccordion.click.puppeteer';

type AddToBudgetInput = {
  label: string;
};

export const addToBudgetTool = {
  name: 'addToBudget',
  description:
    'Add the model open in the active viewport to an existing budget, selected by its visible name, via the Orçamento accordion (click flow). The viewport tab joins that budget\'s tab group.',
  inputSchema: {
    label: z.string().describe('Visible name of the budget to add to.'),
  },
  async execute({ label }: AddToBudgetInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, BUDGET_ACCORDION_NAME);

    await openAddToBudgetPanel(page);
    await selectBudgetByLabel(page, label);

    await confirmPointerPanel(page);
    await waitForBudgetHeader(page, label);

    return {
      content: [
        { type: 'text' as const, text: JSON.stringify({ success: true, label }) },
      ],
    };
  },
};
