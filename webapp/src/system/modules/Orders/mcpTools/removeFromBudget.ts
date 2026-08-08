import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import {
  BUDGET_ACCORDION_NAME,
  clickRemoveFromBudget,
  waitForBudgetActions,
} from '../components/BudgetAccordion/drivers/BudgetAccordion.click.puppeteer';

export const removeFromBudgetTool = {
  name: 'removeFromBudget',
  description:
    'Remove the model open in the active viewport from its budget, via the Orçamento accordion (click flow). The budget and its other items are left alone.',
  inputSchema: {},
  async execute() {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, BUDGET_ACCORDION_NAME);

    await clickRemoveFromBudget(page);
    await waitForBudgetActions(page);

    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }],
    };
  },
};
