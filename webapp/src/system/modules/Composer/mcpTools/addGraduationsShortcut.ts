import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import { triggerFocusGraduationList } from '../components/viewports/GraduationListAccordion/drivers/GraduationItem.shortcut.puppeteer';
import { triggerAddGraduation, typeNamesAndConfirmFromFocused } from '../components/viewports/GraduationListAccordion/drivers/AddGraduationButton.shortcut.puppeteer';


const GRADUATION_ACCORDION_NAME = 'Graduações da Peça';

type AddGraduationsShortcutInput = { names?: string[] };

export const addGraduationsShortcutTool = {
  name: 'addGraduationsShortcut',
  description:
    'Add graduation nodes via the keyboard shortcut path: presses "g" to open the panel, types the comma-joined names, and confirms with Ctrl+Enter. With no names, opens the panel only.',
  inputSchema: {
    names: z.array(z.string().min(1)).optional(),
  },
  async execute({ names }: AddGraduationsShortcutInput = {}) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, GRADUATION_ACCORDION_NAME);

    // 'a' is shared with addMaterial; focus must be inside the graduation
    // accordion for the graduation handler to win. Ctrl+Alt+G focuses the
    // first row (or the add button when empty).
    await triggerFocusGraduationList(page);
    await triggerAddGraduation(page);

    if (!names || names.length === 0) {
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify({ success: true, opened: true }) },
        ],
      };
    }

    await typeNamesAndConfirmFromFocused(page, names.join(', '));

    return {
      content: [
        { type: 'text' as const, text: JSON.stringify({ success: true, names }) },
      ],
    };
  },
};
