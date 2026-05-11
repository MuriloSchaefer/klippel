import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import {
  getFocusedProcessLabel,
  triggerFocusNextProcess,
  triggerFocusPrevProcess,
} from '../components/viewports/ProcessListAccordion/drivers/ProcessItem.shortcut.puppeteer';

type CycleProcessFocusInput = {
  direction: 'next' | 'prev';
  count?: number;
};

export const cycleProcessFocusTool = {
  name: 'cycleProcessFocus',
  description:
    'Move keyboard focus through the process list using ArrowDown/ArrowUp. Requires a process row to be focused first (call focusProcessList).',
  inputSchema: {
    direction: z.enum(['next', 'prev']),
    count: z.number().int().positive().optional(),
  },
  async execute({ direction, count = 1 }: CycleProcessFocusInput) {
    const page = await getPage();
    await page.bringToFront();

    const press =
      direction === 'next' ? triggerFocusNextProcess : triggerFocusPrevProcess;
    for (let i = 0; i < count; i++) {
      await press(page);
    }

    const label = await getFocusedProcessLabel(page);

    if (!label) {
      throw new Error(
        'cycleProcessFocus: no process item is focused. Call focusProcessList first.',
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
