import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { confirmPointerPanelShortcut } from '@kernel/modules/Pointer/components/drivers/PointerContainer.shortcut.puppeteer';
import {
  selectBudgetByLabelShortcut,
  triggerAddToBudget,
  triggerFocusBudgetAccordion,
  waitForBudgetHeader,
} from '../components/BudgetAccordion/drivers/BudgetAccordion.shortcut.puppeteer';

type AddToBudgetShortcutInput = {
  label: string;
};

export const addToBudgetShortcutTool = {
  name: 'addToBudgetShortcut',
  description:
    'Add the open model to an existing budget via keyboard: Ctrl+Alt+O focuses the Orçamento accordion, "a" opens the selector, pick the budget, Ctrl+Enter confirms.',
  inputSchema: {
    label: z.string(),
  },
  async execute({ label }: AddToBudgetShortcutInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);

    await triggerFocusBudgetAccordion(page);
    await triggerAddToBudget(page);
    await selectBudgetByLabelShortcut(page, label);

    await confirmPointerPanelShortcut(page);
    await waitForBudgetHeader(page, label);

    return {
      content: [
        { type: 'text' as const, text: JSON.stringify({ success: true, label }) },
      ],
    };
  },
};
