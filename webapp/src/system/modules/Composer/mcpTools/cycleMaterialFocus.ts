import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import {
  getFocusedMaterialLabel,
  triggerFocusNextMaterial,
  triggerFocusPrevMaterial,
} from '../components/viewports/MaterialListAccordion/components/MaterialItem.shortcut.puppeteer';

type CycleMaterialFocusInput = {
  direction: 'next' | 'prev';
  count?: number;
};

export const cycleMaterialFocusTool = {
  name: 'cycleMaterialFocus',
  description:
    'Move keyboard focus through the material list using ArrowDown/ArrowUp. Requires a material row to be focused first (call focusMaterialList).',
  inputSchema: {
    direction: z.enum(['next', 'prev']),
    count: z.number().int().positive().optional(),
  },
  async execute({ direction, count = 1 }: CycleMaterialFocusInput) {
    const page = await getPage();
    await page.bringToFront();

    const press =
      direction === 'next' ? triggerFocusNextMaterial : triggerFocusPrevMaterial;
    for (let i = 0; i < count; i++) {
      await press(page);
    }

    const label = await getFocusedMaterialLabel(page);

    if (!label) {
      throw new Error(
        'cycleMaterialFocus: no material item is focused. Call focusMaterialList first.',
      );
    }

    return {
      content: [
        { type: 'text' as const, text: JSON.stringify({ success: true, direction, count, focused: { label } }) },
      ],
    };
  },
};
