import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import {
  getFocusedElectiveLabel,
  triggerFocusNextElective,
  triggerFocusPrevElective,
} from '../components/viewports/ElectiveListAccordion/drivers/ElectiveItem.shortcut.puppeteer';

type CycleElectiveFocusInput = {
  direction: 'next' | 'prev';
  count?: number;
};

export const cycleElectiveFocusTool = {
  name: 'cycleElectiveFocus',
  description:
    'Move keyboard focus through the elective list using ArrowDown/ArrowUp. Requires an elective row to be focused first (call focusElectiveList).',
  inputSchema: {
    direction: z.enum(['next', 'prev']),
    count: z.number().int().positive().optional(),
  },
  async execute({ direction, count = 1 }: CycleElectiveFocusInput) {
    const page = await getPage();
    await page.bringToFront();

    const press =
      direction === 'next' ? triggerFocusNextElective : triggerFocusPrevElective;
    for (let i = 0; i < count; i++) {
      await press(page);
    }

    const label = await getFocusedElectiveLabel(page);

    if (!label) {
      throw new Error(
        'cycleElectiveFocus: no elective item is focused. Call focusElectiveList first.',
      );
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            direction,
            count,
            focused: { label },
          }),
        },
      ],
    };
  },
};
