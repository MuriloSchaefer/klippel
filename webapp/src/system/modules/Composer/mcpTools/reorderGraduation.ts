import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import { clickMoveGraduationDown, clickMoveGraduationUp, waitForGraduationItem } from '../components/viewports/GraduationListAccordion/drivers/GraduationItem.click.puppeteer';


const GRADUATION_ACCORDION_NAME = 'Graduações da Peça';

type ReorderGraduationInput = {
  label: string;
  direction: 'up' | 'down';
  steps?: number;
};

export const reorderGraduationTool = {
  name: 'reorderGraduation',
  description:
    'Move a graduation up or down by repeatedly clicking the row reorder buttons. Steps defaults to 1.',
  inputSchema: {
    label: z.string(),
    direction: z.enum(['up', 'down']),
    steps: z.number().int().positive().optional(),
  },
  async execute({ label, direction, steps = 1 }: ReorderGraduationInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, GRADUATION_ACCORDION_NAME);

    await waitForGraduationItem(page, label);

    const press = direction === 'up' ? clickMoveGraduationUp : clickMoveGraduationDown;
    for (let i = 0; i < steps; i++) {
      await press(page, label);
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
