import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import { waitForGraduationItem } from '../components/viewports/GraduationListAccordion/drivers/GraduationItem.click.puppeteer';
import { focusGraduationItem, triggerMoveDownGraduationFromFocused, triggerMoveUpGraduationFromFocused } from '../components/viewports/GraduationListAccordion/drivers/GraduationItem.shortcut.puppeteer';

const GRADUATION_ACCORDION_NAME = 'Graduações da Peça';

type ReorderGraduationShortcutInput = {
  label: string;
  direction: 'up' | 'down';
  steps?: number;
};

export const reorderGraduationShortcutTool = {
  name: 'reorderGraduationShortcut',
  description:
    'Move a graduation up or down via w/s. Focus is preserved on the moved row across steps.',
  inputSchema: {
    label: z.string(),
    direction: z.enum(['up', 'down']),
    steps: z.number().int().positive().optional(),
  },
  async execute({ label, direction, steps = 1 }: ReorderGraduationShortcutInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, GRADUATION_ACCORDION_NAME);

    await waitForGraduationItem(page, label);
    await focusGraduationItem(page, label);

    const press =
      direction === 'up'
        ? triggerMoveUpGraduationFromFocused
        : triggerMoveDownGraduationFromFocused;
    for (let i = 0; i < steps; i++) {
      await press(page);
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, label, direction, steps }),
        },
      ],
    };
  },
};
