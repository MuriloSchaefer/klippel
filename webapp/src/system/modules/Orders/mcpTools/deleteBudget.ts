import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import { confirmPointerPanel } from '@kernel/modules/Pointer/components/drivers/PointerContainer.click.puppeteer';
import {
  BUDGET_ACCORDION_NAME,
  openDeleteBudgetPanel,
  waitForBudgetActions,
} from '../components/BudgetAccordion/drivers/BudgetAccordion.click.puppeteer';

export const deleteBudgetTool = {
  name: 'deleteBudget',
  description:
    'Delete the budget the active viewport\'s model belongs to, via the Orçamento accordion (click flow). Its tab group is dissolved; the member models stay open.',
  inputSchema: {},
  async execute() {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, BUDGET_ACCORDION_NAME);

    await openDeleteBudgetPanel(page);
    await confirmPointerPanel(page);
    await waitForBudgetActions(page);

    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }],
    };
  },
};
