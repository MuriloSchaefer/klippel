import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { confirmPointerPanelShortcut } from '@kernel/modules/Pointer/components/drivers/PointerContainer.shortcut.puppeteer';
import {
  triggerCreateBudget,
  triggerFocusBudgetAccordion,
  typeBudgetNameFromFocused,
  waitForBudgetHeader,
} from '../components/BudgetAccordion/drivers/BudgetAccordion.shortcut.puppeteer';

type CreateBudgetShortcutInput = {
  label: string;
};

export const createBudgetShortcutTool = {
  name: 'createBudgetShortcut',
  description:
    'Create a budget via keyboard: Ctrl+Alt+O focuses the Orçamento accordion, "c" opens the form, type the name, Ctrl+Enter confirms.',
  inputSchema: {
    label: z.string(),
  },
  async execute({ label }: CreateBudgetShortcutInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);

    await triggerFocusBudgetAccordion(page);
    await triggerCreateBudget(page);
    await typeBudgetNameFromFocused(page, label);

    await confirmPointerPanelShortcut(page);
    await waitForBudgetHeader(page, label);

    return {
      content: [
        { type: 'text' as const, text: JSON.stringify({ success: true, label }) },
      ],
    };
  },
};
