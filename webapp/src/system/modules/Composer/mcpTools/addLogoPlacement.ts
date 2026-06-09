import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { openLogoListAccordion } from '../components/viewports/LogoListAccordion/drivers/AddLogoButton.click.puppeteer';
import {
  addPlacement,
  countPlacementItems,
  openLogoPlacements,
  renamePlacement,
  resizePlacement,
} from '../components/viewports/LogoListAccordion/drivers/LogoPlacementsButton.click.puppeteer';

type AddLogoPlacementInput = {
  logoLabel: string;
  name?: string;
  width?: number;
  height?: number;
};

export const addLogoPlacementTool = {
  name: 'addLogoPlacement',
  description:
    'Add a placement (a copy) to an existing logo via its Placements pointer. A placement injects a <use> of the logo symbol into the editor SVG. Optionally renames the new placement and sets its physical size (cm), which drives that placement’s cost. Spatial move/rotate/scale/clip is done interactively in the draw view and is not driven here.',
  inputSchema: {
    logoLabel: z.string().describe('Label of the logo to add a placement to.'),
    name: z.string().optional().describe('Name for the new placement (e.g. "Manga direita").'),
    width: z.number().positive().optional().describe('Physical width in cm for this placement.'),
    height: z.number().positive().optional().describe('Physical height in cm for this placement.'),
  },
  async execute({ logoLabel, name, width, height }: AddLogoPlacementInput) {
    const page = await getPage();
    await page.bringToFront();

    await openLogoListAccordion(page);
    await openLogoPlacements(page, logoLabel);
    await addPlacement(page);

    const lastIndex = (await countPlacementItems(page)) - 1;
    if (name !== undefined) await renamePlacement(page, lastIndex, name);
    if (width !== undefined) await resizePlacement(page, lastIndex, 'width', width);
    if (height !== undefined) await resizePlacement(page, lastIndex, 'height', height);

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
