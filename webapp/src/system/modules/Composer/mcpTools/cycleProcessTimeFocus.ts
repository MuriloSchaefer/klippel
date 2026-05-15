import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import {
  getFocusedProcessTimeLabel,
  triggerFocusNextProcessTime,
  triggerFocusPrevProcessTime,
} from '../components/viewports/ProcessTimeAccordion/drivers/ProcessTimeItem.shortcut.puppeteer';

type CycleProcessTimeFocusInput = {
  direction: 'next' | 'prev';
  count?: number;
};

export const cycleProcessTimeFocusTool = {
  name: 'cycleProcessTimeFocus',
  description:
    'Move keyboard focus through the process-time list using ArrowDown/ArrowUp. Requires a process-time row to be focused first (call focusProcessTimeList).',
  inputSchema: {
    direction: z.enum(['next', 'prev']),
    count: z.number().int().positive().optional(),
  },
  async execute({ direction, count = 1 }: CycleProcessTimeFocusInput) {
    const page = await getPage();
    await page.bringToFront();

    const press =
      direction === 'next'
        ? triggerFocusNextProcessTime
        : triggerFocusPrevProcessTime;
    for (let i = 0; i < count; i++) {
      await press(page);
    }

    const label = await getFocusedProcessTimeLabel(page);

    if (!label) {
      throw new Error(
        'cycleProcessTimeFocus: no process-time row is focused. Call focusProcessTimeList first.',
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
