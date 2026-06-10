import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { openLogoListAccordion } from '../components/viewports/LogoListAccordion/drivers/AddLogoButton.click.puppeteer';
import {
  addPlacement,
  countPlacementItems,
  openLogoPlacements,
  renamePlacement,
  resizePlacement,
  setPlacementCostExpression,
} from '../components/viewports/LogoListAccordion/drivers/LogoPlacementsButton.click.puppeteer';

type AddLogoPlacementInput = {
  logoLabel: string;
  name?: string;
  width?: number;
  height?: number;
  costExpression?: string;
};

export const addLogoPlacementTool = {
  name: 'addLogoPlacement',
  description:
    'Add a placement (a copy) to an existing logo via its Placements pointer. A placement injects a <use> of the logo symbol into the editor SVG. Optionally renames the new placement, sets its physical size (cm), and sets its cost expression (priced per placement). Spatial move/rotate/scale/clip is done interactively in the draw view and is not driven here.',
  inputSchema: {
    logoLabel: z.string().describe('Label of the logo to add a placement to.'),
    name: z.string().optional().describe('Name for the new placement (e.g. "Manga direita").'),
    width: z.number().positive().optional().describe('Physical width in cm for this placement.'),
    height: z.number().positive().optional().describe('Physical height in cm for this placement.'),
    costExpression: z
      .string()
      .optional()
      .describe(
        'Cost expression for this placement over { colors, width, height, methodFactor, gradesTotal }. Supports arithmetic plus allow-listed functions (min, max, median, mean/avg, sum, clamp, round, floor, ceil, abs, pow, sqrt).',
      ),
  },
  async execute({ logoLabel, name, width, height, costExpression }: AddLogoPlacementInput) {
    const page = await getPage();
    await page.bringToFront();

    await openLogoListAccordion(page);
    await openLogoPlacements(page, logoLabel);
    await addPlacement(page);

    const lastIndex = (await countPlacementItems(page)) - 1;
    if (name !== undefined) await renamePlacement(page, lastIndex, name);
    if (width !== undefined) await resizePlacement(page, lastIndex, 'width', width);
    if (height !== undefined) await resizePlacement(page, lastIndex, 'height', height);
    if (costExpression !== undefined)
      await setPlacementCostExpression(page, lastIndex, costExpression);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, logoLabel, name, index: lastIndex }),
        },
      ],
    };
  },
};
