import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { getFocusedGraduationLabel, triggerFocusNextGraduation, triggerFocusPrevGraduation } from '../components/viewports/GraduationListAccordion/drivers/GraduationItem.shortcut.puppeteer';


type CycleGraduationFocusInput = {
  direction: 'next' | 'prev';
  count?: number;
};

export const cycleGraduationFocusTool = {
  name: 'cycleGraduationFocus',
  description:
    'Move keyboard focus through the graduation list using ArrowDown/ArrowUp. Requires a graduation row to be focused first (call focusGraduationList).',
  inputSchema: {
    direction: z.enum(['next', 'prev']),
    count: z.number().int().positive().optional(),
  },
  async execute({ direction, count = 1 }: CycleGraduationFocusInput) {
    const page = await getPage();
    await page.bringToFront();

    const press =
      direction === 'next' ? triggerFocusNextGraduation : triggerFocusPrevGraduation;
    for (let i = 0; i < count; i++) {
      await press(page);
    }

    const label = await getFocusedGraduationLabel(page);
    if (!label) {
      throw new Error(
        'cycleGraduationFocus: no graduation item is focused. Call focusGraduationList first.',
      );
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, direction, count, focused: { label } }),
        },
      ],
    };
  },
};
